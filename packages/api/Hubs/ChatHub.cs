using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Dtos.Chat;
using Backend.Models;
using System;
using System.Threading.Tasks;

namespace Backend.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly AppDbContext _context;

        public ChatHub(AppDbContext context)
        {
            _context = context;
        }

        public async Task SendMessage(SendMessageDto messageDto)
        {
            // Try to get user ID from Context.UserIdentifier first, then fall back to PharmacyId claim
            long senderId;
            if (!string.IsNullOrEmpty(Context.UserIdentifier) && long.TryParse(Context.UserIdentifier, out senderId))
            {
                // Success - use Context.UserIdentifier
            }
            else
            {
                // Fallback: Try to get PharmacyId from claims
                var pharmacyIdClaim = Context.User?.FindFirst("PharmacyId");
                if (pharmacyIdClaim == null || !long.TryParse(pharmacyIdClaim.Value, out senderId))
                {
                    Console.WriteLine("[ChatHub.SendMessage] ERROR: Could not determine sender ID");
                    return;
                }
            }

            // CRITICAL: Parse string ReceiverId to long (prevents JavaScript precision loss)
            if (!long.TryParse(messageDto.ReceiverId, out long receiverId))
            {
                Console.WriteLine($"[ChatHub.SendMessage] ERROR: Invalid ReceiverId format: '{messageDto.ReceiverId}'");
                return;
            }

            Console.WriteLine($"[ChatHub.SendMessage] SenderId: {senderId}, ReceiverId (string): '{messageDto.ReceiverId}', ReceiverId (parsed): {receiverId}, Content: {messageDto.Content}");

            // CRITICAL: ChatRoom MUST already exist (created by StartConversation API)
            // Do NOT create ChatRoom here - it causes foreign key errors
            var room = await _context.ChatRooms
                .FirstOrDefaultAsync(r => 
                    (r.User1Id == senderId && r.User2Id == receiverId) ||
                    (r.User1Id == receiverId && r.User2Id == senderId));

            if (room == null)
            {
                Console.WriteLine($"[ChatHub.SendMessage] ERROR: ChatRoom not found! Use StartConversation API first.");
                Console.WriteLine($"[ChatHub.SendMessage] SenderId: {senderId}, ReceiverId: {receiverId}");
                throw new InvalidOperationException("Chat room does not exist. Please start a conversation first.");
            }

            Console.WriteLine($"[ChatHub.SendMessage] Found ChatRoom ID: {room.Id}");

            var message = new ChatMessage
            {
                ChatRoomId = room.Id,
                SenderId = senderId,
                Content = messageDto.Content,
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            Console.WriteLine($"[ChatHub.SendMessage] Message saved with ID: {message.Id}");

            var messagePayload = new 
            {
                Id = message.Id,
                Content = message.Content,
                SenderId = message.SenderId,
                SentAt = message.SentAt,
                ChatRoomId = room.Id
            };

            // Alıcıya gönder
            Console.WriteLine($"[ChatHub.SendMessage] Broadcasting to receiver (User {receiverId})...");
            await Clients.User(receiverId.ToString()).SendAsync("ReceiveMessage", messagePayload);
            Console.WriteLine($"[ChatHub.SendMessage] Message sent to receiver");

            // Gönderene geri gönder (UI güncellemesi için)
            Console.WriteLine($"[ChatHub.SendMessage] Broadcasting to sender (Caller {senderId})...");
            await Clients.Caller.SendAsync("ReceiveMessage", messagePayload);
            Console.WriteLine($"[ChatHub.SendMessage] Message sent to sender");
        }
    }
}