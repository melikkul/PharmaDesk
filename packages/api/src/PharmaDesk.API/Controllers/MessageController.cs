using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using System.Security.Claims;

namespace PharmaDesk.API.Controllers
{
    /// <summary>
    /// Legacy controller - Redirects to new ChatController endpoints
    /// Will be deprecated in favor of ChatController
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MessagesController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Legacy endpoint - Gets messages with another user
        /// Now routes through Conversations for compatibility
        /// </summary>
        [HttpGet("{otherUserId}")]
        public async Task<IActionResult> GetConversation(string otherUserId)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

            // Find Direct conversation between these two users
            var conversation = await _context.Conversations
                .Include(c => c.Messages)
                .Include(c => c.Participants)
                .Where(c => c.Type == ConversationType.Direct)
                .Where(c => c.Participants.Any(p => p.UserId == long.Parse(currentUserId)) &&
                           c.Participants.Any(p => p.UserId == long.Parse(otherUserId)))
                .FirstOrDefaultAsync();

            if (conversation == null)
            {
                // No conversation exists yet, return empty list
                return Ok(new List<object>());
            }

            var messages = conversation.Messages
                .OrderBy(m => m.SentAt)
                .Select(m => new
                {
                    m.Id,
                    m.Content,
                    m.SenderId,
                    m.SenderName,
                    m.SentAt,
                    m.IsRead
                })
                .ToList();

            return Ok(messages);
        }
    }
}