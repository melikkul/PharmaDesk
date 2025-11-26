using Backend.Data;
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

        public AdminController(IdentityDbContext db, AppDbContext appDb)
        {
            _db = db;
            _appDb = appDb;
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
    }
}
