using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    /// <summary>
    /// Admin endpoints for carrier management and monitoring
    /// </summary>
    [Route("api/admin/carriers")]
    [ApiController]
    [Authorize(Roles = "Admin,User")]
    public class AdminCarrierController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdminCarrierController> _logger;

        public AdminCarrierController(AppDbContext context, ILogger<AdminCarrierController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get all currently active carriers with their locations
        /// </summary>
        [HttpGet("active")]
        public async Task<ActionResult> GetActiveCarriers()
        {
            var activeCarriers = await _context.CarrierShifts
                .Where(s => s.EndTime == null)
                .Include(s => s.Carrier)
                .Select(s => new
                {
                    CarrierId = s.CarrierId,
                    CarrierName = s.Carrier!.FirstName + " " + s.Carrier.LastName,
                    Email = s.Carrier.Email,
                    PhoneNumber = s.Carrier.PhoneNumber,
                    ShiftId = s.Id,
                    ShiftStartTime = s.StartTime,
                    Latitude = s.LastLatitude,
                    Longitude = s.LastLongitude,
                    LastLocationUpdate = s.LastLocationUpdate,
                    IsOnShift = true
                })
                .ToListAsync();

            _logger.LogInformation("Admin fetched {Count} active carriers", activeCarriers.Count);
            return Ok(activeCarriers);
        }

        /// <summary>
        /// Get carrier shift history with summary
        /// </summary>
        [HttpGet("{carrierId}/shifts")]
        public async Task<ActionResult> GetCarrierShifts(int carrierId, [FromQuery] int days = 7)
        {
            var since = DateTime.UtcNow.AddDays(-days);

            var shifts = await _context.CarrierShifts
                .Where(s => s.CarrierId == carrierId && s.StartTime >= since)
                .OrderByDescending(s => s.StartTime)
                .Select(s => new
                {
                    s.Id,
                    s.StartTime,
                    s.EndTime,
                    s.DurationMinutes,
                    s.LastLatitude,
                    s.LastLongitude,
                    IsActive = s.EndTime == null
                })
                .ToListAsync();

            var totalMinutes = shifts.Where(s => s.DurationMinutes.HasValue).Sum(s => s.DurationMinutes ?? 0);

            return Ok(new
            {
                shifts,
                summary = new
                {
                    totalShifts = shifts.Count,
                    totalMinutes,
                    totalHours = totalMinutes / 60,
                    averageMinutesPerShift = shifts.Count > 0 ? totalMinutes / shifts.Count : 0
                }
            });
        }
    }
}
