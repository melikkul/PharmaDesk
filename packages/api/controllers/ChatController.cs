using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Dtos.Chat;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/chat")] // Frontend isteği ile uyumlu rota
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ChatController(AppDbContext context)
        {
            _context = context;
        }

        private long GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("PharmacyId");
            if (userIdClaim != null && long.TryParse(userIdClaim.Value, out long userId))
            {
                return userId;
            }
            throw new UnauthorizedAccessException("User ID not found in token");
        }

        [HttpPost("conversations")]
        public async Task<IActionResult> StartConversation([FromBody] StartConversationDto request)
        {
            var userId = GetCurrentUserId();

            // Parse string ReceiverPharmacyId to long (prevents JavaScript precision loss)
            if (!long.TryParse(request.ReceiverPharmacyId, out long receiverPharmacyId))
            {
                Console.WriteLine($"[StartConversation] ERROR: Invalid ReceiverPharmacyId format: '{request.ReceiverPharmacyId}'");
                return BadRequest("Invalid pharmacy ID format.");
            }

            Console.WriteLine($"[StartConversation] User1Id (current user): {userId}");
            Console.WriteLine($"[StartConversation] User2Id (receiver string): '{request.ReceiverPharmacyId}'");
            Console.WriteLine($"[StartConversation] User2Id (receiver parsed): {receiverPharmacyId}");

            if (userId == receiverPharmacyId)
            {
                return BadRequest("Kendinizle sohbet başlatamazsınız.");
            }

            var room = await _context.ChatRooms
                .FirstOrDefaultAsync(c => 
                    (c.User1Id == userId && c.User2Id == receiverPharmacyId) ||
                    (c.User1Id == receiverPharmacyId && c.User2Id == userId));

            if (room == null)
            {
                Console.WriteLine($"[StartConversation] Creating new ChatRoom with User1Id={userId}, User2Id={receiverPharmacyId}");
                
                room = new ChatRoom
                {
                    User1Id = userId,
                    User2Id = receiverPharmacyId,
                    Name = "Sohbet" // Varsayılan bir isim veriyoruz
                };
                _context.ChatRooms.Add(room);
                
                try
                {
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"[StartConversation] ChatRoom created successfully with ID: {room.Id}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[StartConversation] ERROR: {ex.Message}");
                    Console.WriteLine($"[StartConversation] InnerException: {ex.InnerException?.Message}");
                    throw;
                }
            }

            return Ok(new { id = room.Id });
        }

        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            var userId = GetCurrentUserId();

            var conversations = await _context.ChatRooms
                .Include(c => c.User1)
                .Include(c => c.User2)
                .Include(c => c.Messages)
                .Where(c => c.User1Id == userId || c.User2Id == userId)
                .Select(c => new
                {
                    Id = c.Id.ToString(),
                    OtherUser = c.User1Id == userId 
                        ? new { Id = c.User2.Id.ToString(), c.User2.PharmacyName, c.User2.ProfileImagePath } 
                        : new { Id = c.User1.Id.ToString(), c.User1.PharmacyName, c.User1.ProfileImagePath },
                    // FIXED: Use null-conditional operators to prevent "Nullable object must have a value" error
                    LastMessage = c.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault() != null 
                        ? c.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault()!.Content 
                        : "",
                    LastMessageDate = c.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault() != null
                        ? c.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault()!.SentAt
                        : c.CreatedAt,
                    UnreadCount = c.Messages.Count(m => m.SenderId != userId && !m.IsRead)
                })
                .OrderByDescending(c => c.LastMessageDate)
                .ToListAsync();

            return Ok(conversations);
        }

        [HttpGet("messages/{otherUserId}")]
        public async Task<IActionResult> GetMessages(long otherUserId)
        {
            var userId = GetCurrentUserId();

            var room = await _context.ChatRooms
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => 
                    (c.User1Id == userId && c.User2Id == otherUserId) ||
                    (c.User1Id == otherUserId && c.User2Id == userId));

            if (room == null)
            {
                return Ok(new List<object>());
            }

            var messages = room.Messages
                .OrderBy(m => m.SentAt)
                .Select(m => new
                {
                    m.Id,
                    m.Content,
                    SenderId = m.SenderId.ToString(),
                    m.SentAt,
                    m.IsRead
                })
                .ToList();

            return Ok(messages);
        }

        [HttpGet("profile/{pharmacyId}")]
        public async Task<IActionResult> GetPharmacyProfile(long pharmacyId)
        {
            var profile = await _context.PharmacyProfiles
                .Where(p => p.Id == pharmacyId)
                .Select(p => new
                {
                    Id = p.Id.ToString(),
                    p.PharmacyName,
                    p.ProfileImagePath,
                    p.City
                })
                .FirstOrDefaultAsync();

            if (profile == null)
            {
                return NotFound("Pharmacy profile not found");
            }

            return Ok(profile);
        }
    }
}