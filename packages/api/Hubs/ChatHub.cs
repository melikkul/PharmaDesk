using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Dtos.Chat;
using Backend.Models;
using System;
using System.Threading.Tasks;
using System.Linq;

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
            // Assuming the UserIdentifier is the PharmacyProfile Id (long)
            if (!long.TryParse(Context.UserIdentifier, out long senderId))
            {
                // Handle invalid user ID (maybe log or return)
                return;
            }

            // Find or create chat room
            var room = await _context.ChatRooms
                .FirstOrDefaultAsync(r => 
                    (r.User1Id == senderId && r.User2Id == messageDto.ReceiverId) ||
                    (r.User1Id == messageDto.ReceiverId && r.User2Id == senderId));

            if (room == null)
            {
                room = new ChatRoom
                {
                    User1Id = senderId,
                    User2Id = messageDto.ReceiverId
                };
                _context.ChatRooms.Add(room);
                await _context.SaveChangesAsync();
            }

            var message = new ChatMessage
            {
                ChatRoomId = room.Id,
                SenderId = senderId,
                Content = messageDto.Content,
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            // Send to receiver
            // Note: We need to map the long ID to string for SignalR Clients.User
            await Clients.User(messageDto.ReceiverId.ToString()).SendAsync("ReceiveMessage", new 
            {
                Id = message.Id,
                Content = message.Content,
                SenderId = message.SenderId,
                SentAt = message.SentAt,
                ChatRoomId = room.Id
            });

            // Send back to sender
            await Clients.Caller.SendAsync("ReceiveMessage", new 
            {
                Id = message.Id,
                Content = message.Content,
                SenderId = message.SenderId,
                SentAt = message.SentAt,
                ChatRoomId = room.Id
            });
        }
    }
}
