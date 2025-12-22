using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaDesk.Application.Interfaces;
using System.Security.Claims;

namespace PharmaDesk.API.Controllers
{
    /// <summary>
    /// Chat API endpoints for conversation and message management
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly ILogger<ChatController> _logger;

        public ChatController(IChatService chatService, ILogger<ChatController> logger)
        {
            _chatService = chatService;
            _logger = logger;
        }

        private long? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            return long.TryParse(pharmacyIdClaim, out var pharmacyId) ? pharmacyId : null;
        }

        /// <summary>
        /// Get all conversations for the current user (group + direct)
        /// </summary>
        [HttpGet("conversations")]
        public async Task<IActionResult> GetMyConversations()
        {
            try
            {
                var pharmacyId = GetPharmacyIdFromToken();
                if (pharmacyId == null) return Unauthorized();
                var conversations = await _chatService.GetMyConversationsAsync(pharmacyId.Value);
                return Ok(conversations);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting conversations");
                return StatusCode(500, new { error = "Failed to get conversations" });
            }
        }

        /// <summary>
        /// Start or get existing direct chat with another user
        /// </summary>
        [HttpPost("conversations/direct/{targetUserId}")]
        public async Task<IActionResult> StartDirectChat(long targetUserId)
        {
            try
            {
                var pharmacyId = GetPharmacyIdFromToken();
                if (pharmacyId == null) return Unauthorized();
                var conversation = await _chatService.StartDirectChatAsync(pharmacyId.Value, targetUserId);
                return Ok(conversation);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting direct chat");
                return StatusCode(500, new { error = "Failed to start direct chat" });
            }
        }

        /// <summary>
        /// Get messages for a conversation
        /// </summary>
        [HttpGet("conversations/{conversationId}/messages")]
        public async Task<IActionResult> GetMessages(int conversationId)
        {
            try
            {
                var pharmacyId = GetPharmacyIdFromToken();
                if (pharmacyId == null) return Unauthorized();
                var messages = await _chatService.GetMessagesAsync(conversationId, pharmacyId.Value);
                return Ok(messages);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting messages");
                return StatusCode(500, new { error = "Failed to get messages" });
            }
        }

        /// <summary>
        /// Send a message to a conversation (fallback for non-SignalR clients)
        /// </summary>
        [HttpPost("conversations/{conversationId}/messages")]
        public async Task<IActionResult> SendMessage(int conversationId, [FromBody] SendMessageRequest request)
        {
            try
            {
                var pharmacyId = GetPharmacyIdFromToken();
                if (pharmacyId == null) return Unauthorized();
                var message = await _chatService.SendMessageAsync(conversationId, pharmacyId.Value, request.Content);
                return Ok(message);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message");
                return StatusCode(500, new { error = "Failed to send message" });
            }
        }

        /// <summary>
        /// Mark all messages in a conversation as read
        /// </summary>
        [HttpPost("conversations/{conversationId}/read")]
        public async Task<IActionResult> MarkAsRead(int conversationId)
        {
            try
            {
                var pharmacyId = GetPharmacyIdFromToken();
                if (pharmacyId == null) return Unauthorized();
                await _chatService.MarkAsReadAsync(conversationId, pharmacyId.Value);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking as read");
                return StatusCode(500, new { error = "Failed to mark as read" });
            }
        }

        /// <summary>
        /// Get total unread message count
        /// </summary>
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            try
            {
                var pharmacyId = GetPharmacyIdFromToken();
                if (pharmacyId == null) return Unauthorized();
                var count = await _chatService.GetTotalUnreadCountAsync(pharmacyId.Value);
                return Ok(new { unreadCount = count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unread count");
                return StatusCode(500, new { error = "Failed to get unread count" });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // Admin Endpoints (Read-Only Access)
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Get all conversations (Admin only)
        /// </summary>
        [HttpGet("admin/conversations")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> GetAllConversations([FromQuery] int? groupId = null)
        {
            try
            {
                var conversations = await _chatService.GetAllConversationsAsync(groupId);
                return Ok(conversations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all conversations");
                return StatusCode(500, new { error = "Failed to get conversations" });
            }
        }

        /// <summary>
        /// Get messages for any conversation (Admin only, read-only)
        /// </summary>
        [HttpGet("admin/conversations/{conversationId}/messages")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> GetMessagesAsAdmin(int conversationId)
        {
            try
            {
                var messages = await _chatService.GetMessagesAsync(conversationId, 0, isAdmin: true);
                return Ok(messages);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting messages as admin");
                return StatusCode(500, new { error = "Failed to get messages" });
            }
        }
    }

    public class SendMessageRequest
    {
        public string Content { get; set; } = string.Empty;
    }
}
