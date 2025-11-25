using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Dtos.Chat;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ChatController(AppDbContext context)
        {
            _context = context;
        }

        private long GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("PharmacyId"); // Assuming PharmacyId is the claim key
            if (userIdClaim != null && long.TryParse(userIdClaim.Value, out long userId))
            {
                return userId;
            }
            // Fallback or throw
            throw new UnauthorizedAccessException("User ID not found in token");
        }

        [HttpPost("conversations")]
        public async Task<IActionResult> StartConversation([FromBody] StartConversationDto request)
        {
            var userId = GetCurrentUserId();

            if (userId == request.ReceiverPharmacyId)
            {
                return BadRequest("Cannot start a conversation with yourself.");
            }

            var room = await _context.ChatRooms
                .FirstOrDefaultAsync(c => 
                    (c.User1Id == userId && c.User2Id == request.ReceiverPharmacyId) ||
                    (c.User1Id == request.ReceiverPharmacyId && c.User2Id == userId));

            if (room == null)
            {
                room = new ChatRoom
                {
                    User1Id = userId,
                    User2Id = request.ReceiverPharmacyId
                };
                _context.ChatRooms.Add(room);
                await _context.SaveChangesAsync();
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
                    c.Id,
                    OtherUser = c.User1Id == userId ? new { c.User2.Id, c.User2.PharmacyName, c.User2.ProfileImagePath } : new { c.User1.Id, c.User1.PharmacyName, c.User1.ProfileImagePath },
                    LastMessage = c.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault().Content,
                    LastMessageDate = c.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault().SentAt,
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
                    m.SenderId,
                    m.SentAt,
                    m.IsRead
                })
                .ToList();

            return Ok(messages);
        }
    }
}
