using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SettingsController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/settings - Get current user's pharmacy settings
        [HttpGet]
        public async Task<ActionResult<PharmacySettings>> GetSettings()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var settings = await _context.PharmacySettings
                .FirstOrDefaultAsync(s => s.PharmacyProfileId == pharmacyId.Value);

            if (settings == null)
            {
                // Create default settings if none exist
                settings = new PharmacySettings
                {
                    PharmacyProfileId = pharmacyId.Value,
                    EmailNotifications = true,
                    SmsNotifications = true,
                    AutoAcceptOrders = false,
                    ShowStockToGroupOnly = false,
                    Language = "tr"
                };

                _context.PharmacySettings.Add(settings);
                await _context.SaveChangesAsync();
            }

            return Ok(settings);
        }

        // PUT /api/settings - Update pharmacy settings
        [HttpPut]
        public async Task<ActionResult<PharmacySettings>> UpdateSettings([FromBody] PharmacySettings updatedSettings)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var settings = await _context.PharmacySettings
                .FirstOrDefaultAsync(s => s.PharmacyProfileId == pharmacyId.Value);

            if (settings == null)
            {
                // Create new settings
                updatedSettings.PharmacyProfileId = pharmacyId.Value;
                _context.PharmacySettings.Add(updatedSettings);
            }
            else
            {
                // Update existing settings
                settings.EmailNotifications = updatedSettings.EmailNotifications;
                settings.SmsNotifications = updatedSettings.SmsNotifications;
                settings.AutoAcceptOrders = updatedSettings.AutoAcceptOrders;
                settings.ShowStockToGroupOnly = updatedSettings.ShowStockToGroupOnly;
                settings.Language = updatedSettings.Language;
                settings.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(settings ?? updatedSettings);
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
