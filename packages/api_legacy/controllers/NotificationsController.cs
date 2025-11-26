using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NotificationsController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/notifications - Get user notifications
        [HttpGet]
        public async Task<ActionResult<IEnumerable<NotificationDto>>> GetNotifications([FromQuery] int take = 50)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var notifications = await _context.Notifications
                .Where(n => n.PharmacyProfileId == pharmacyId.Value)
                .OrderByDescending(n => n.CreatedAt)
                .Take(take)
                .Select(n => new NotificationDto
                {
                    Id = n.Id,
                    Read = n.IsRead,
                    Type = n.Type.ToString().ToLower(),
                    Title = n.Title,
                    Message = n.Message
                })
                .ToListAsync();

            return Ok(notifications);
        }

        // GET /api/notifications/unread-count - Get unread count for badge
        [HttpGet("unread-count")]
        public async Task<ActionResult<int>> GetUnreadCount()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var count = await _context.Notifications
                .Where(n => n.PharmacyProfileId == pharmacyId.Value && !n.IsRead)
                .CountAsync();

            return Ok(new { count });
        }

        // PUT /api/notifications/{id}/read - Mark notification as read
        [HttpPut("{id}/read")]
        public async Task<ActionResult> MarkAsRead(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.PharmacyProfileId == pharmacyId.Value);

            if (notification == null)
                return NotFound(new { message = "Notification not found" });

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Notification marked as read" });
        }

        // PUT /api/notifications/read-all - Mark all as read
        [HttpPut("read-all")]
        public async Task<ActionResult> MarkAllAsRead()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var notifications = await _context.Notifications
                .Where(n => n.PharmacyProfileId == pharmacyId.Value && !n.IsRead)
                .ToListAsync();

            foreach (var notification in notifications)
            {
                notification.IsRead = true;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = $"{notifications.Count} notifications marked as read" });
        }


        private int? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            if (int.TryParse(pharmacyIdClaim, out var pharmacyId))
                return pharmacyId;
            return null;
        }
    }
}
