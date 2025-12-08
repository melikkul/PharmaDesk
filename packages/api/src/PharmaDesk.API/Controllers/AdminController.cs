using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IdentityDbContext _db;
        private readonly AppDbContext _appDb;
        private readonly CarrierAuthService _carrierAuth;

        public AdminController(IdentityDbContext db, AppDbContext appDb, CarrierAuthService carrierAuth)
        {
            _db = db;
            _appDb = appDb;
            _carrierAuth = carrierAuth;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var totalPharmacies = await _db.IdentityUsers.CountAsync(u => u.Role == "User"); // Assuming "User" role is for pharmacies
            var totalDrugs = await _appDb.Medications.CountAsync();
            // Assuming we have a Transactions or Orders table, but for now using dummy or available data
            // If no transaction table, return 0 or mock.
            // Let's check if we have an 'Offers' or similar table. 
            // Based on file list, we have InventoryItem, Medication, PharmacyProfile.
            // Let's assume 'InventoryItem' count as a proxy for activity or just return 0 for now if no transaction model.
            // The user mentioned "Son İşlemler" (Recent Transactions).
            // I'll return dummy data for transactions if no model exists, but real counts for Users/Drugs.
            
            var stats = new
            {
                TotalPharmacies = totalPharmacies,
                TotalDrugs = totalDrugs,
                PendingApprovals = 0, // Placeholder
                TotalTransactions = 0 // Placeholder
            };

            return Ok(stats);
        }

        [HttpGet("recent-activities")]
        public IActionResult GetRecentActivities()
        {
            // Mock data for now as we don't have a clear Activity Log model yet.
            var activities = new[]
            {
                new { Id = 1, Description = "Eczane A sisteme kayıt oldu.", Date = DateTime.UtcNow.AddHours(-1) },
                new { Id = 2, Description = "Yeni ilaç 'Aspirin' eklendi.", Date = DateTime.UtcNow.AddHours(-2) },
                new { Id = 3, Description = "Eczane B stok güncelledi.", Date = DateTime.UtcNow.AddHours(-5) }
            };

            return Ok(activities);
        }

        [HttpGet("pharmacies")]
        public async Task<IActionResult> GetPharmacies()
        {
            // Cannot join across different contexts, so fetch separately and combine
            var profiles = await _appDb.PharmacyProfiles.ToListAsync();
            var users = await _db.IdentityUsers.ToListAsync();
            
            var pharmacies = profiles.Select(profile =>
            {
                var user = users.FirstOrDefault(u => u.PharmacyId == profile.Id);
                return new
                {
                    id = profile.Id,
                    pharmacyname = profile.PharmacyName,
                    email = user?.Email ?? "",
                    phone = profile.PhoneNumber,
                    balance = 0.0, // Placeholder - would come from transactions
                    offer_count = 0, // Placeholder - would come from offers count
                    city = profile.City,
                    district = profile.District
                };
            }).ToList();

            return Ok(pharmacies);
        }

        [HttpGet("users")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUsers()
        {
            // Cannot join across different contexts, so fetch separately and combine
            var identityUsers = await _db.IdentityUsers.ToListAsync();
            var profiles = await _appDb.PharmacyProfiles.ToListAsync();
            
            var users = identityUsers.Select(user =>
            {
                var profile = profiles.FirstOrDefault(p => p.Id == user.PharmacyId);
                return new
                {
                    id = user.Id,
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    pharmacyName = profile?.PharmacyName ?? "",
                    gln = profile?.GLN ?? "",
                    city = profile?.City ?? "",
                    district = profile?.District ?? "",
                    createdAt = user.CreatedAt
                };
            }).ToList();

            return Ok(users);
        }
        [HttpPost("assign-group")]
        public async Task<IActionResult> AssignGroup([FromBody] AssignGroupRequest req)
        {
            try
            {
                // Log the incoming request
                Console.WriteLine($"[AssignGroup] Received request: PharmacyId={req.PharmacyId}, GroupId={req.GroupId}");
                
                // Parse pharmacyId from string to long (avoids JavaScript precision loss)
                if (!long.TryParse(req.PharmacyId, out long pharmacyId))
                {
                    return BadRequest(new { error = "Invalid pharmacy ID format" });
                }
                
                // 1. Validate Pharmacy
                var pharmacy = await _appDb.PharmacyProfiles.FindAsync(pharmacyId);
                Console.WriteLine($"[AssignGroup] Pharmacy lookup result: {(pharmacy == null ? "NULL" : $"Found: {pharmacy.PharmacyName}")}");
                
                if (pharmacy == null)
                {
                    return NotFound(new { error = "Pharmacy not found" });
                }

                // 2. Validate Group
                var group = await _appDb.Groups.Include(g => g.City).FirstOrDefaultAsync(g => g.Id == req.GroupId);
                if (group == null)
                {
                    return NotFound(new { error = "Group not found" });
                }

                // 3. Validate Same City Constraint
                // Note: Pharmacy.City is a string name, Group.City is an entity with Name.
                // We should compare names carefully (case insensitive, trim)
                var pharmacyCity = pharmacy.City?.Trim().ToLowerInvariant();
                var groupCity = group.City.Name.Trim().ToLowerInvariant();

                if (pharmacyCity != groupCity)
                {
                    return BadRequest(new { error = $"City mismatch. Pharmacy is in '{pharmacy.City}', Group is in '{group.City.Name}'. They must be in the same city." });
                }

                // 4. Check if already a member
                var exists = await _appDb.PharmacyGroups
                    .AnyAsync(pg => pg.PharmacyProfileId == pharmacyId && pg.GroupId == req.GroupId);

                if (exists)
                {
                    return BadRequest(new { error = "Pharmacy is already a member of this group." });
                }

                // 5. Add to Group
                var pharmacyGroup = new PharmacyGroup
                {
                    PharmacyProfileId = pharmacyId,
                    GroupId = req.GroupId,
                    JoinedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _appDb.PharmacyGroups.Add(pharmacyGroup);
                await _appDb.SaveChangesAsync();

                return Ok(new { message = "Pharmacy assigned to group successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to assign group: " + ex.Message });
            }
        }

        /// <summary>
        /// Admin creates a registration token for a carrier
        /// </summary>
        [HttpPost("carriers/create-registration-token")]
        public async Task<IActionResult> CreateCarrierRegistrationToken([FromBody] Backend.Dtos.CreateCarrierTokenRequest req)
        {
            try
            {
                // Get admin ID from JWT token
                var adminIdClaim = User.FindFirst("id")?.Value;
                if (string.IsNullOrEmpty(adminIdClaim) || !int.TryParse(adminIdClaim, out int adminId))
                {
                    // For development, use admin ID 1 if not authenticated
                    adminId = 1;
                }

                var response = await _carrierAuth.CreateRegistrationTokenAsync(req, adminId);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to create registration token: " + ex.Message });
            }
        }
    }

    public class AssignGroupRequest
    {
        public string PharmacyId { get; set; } = string.Empty; // Changed to string to avoid JS precision loss
        public int GroupId { get; set; }
    }
}
