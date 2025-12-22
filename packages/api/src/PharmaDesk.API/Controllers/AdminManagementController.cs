using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers
{
    /// <summary>
    /// Controller for managing admin users (SuperAdmin only)
    /// </summary>
    [ApiController]
    [Route("api/admin/admins")]
    [Authorize(Roles = "SuperAdmin")]
    public class AdminManagementController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<AdminManagementController> _logger;

        public AdminManagementController(AppDbContext db, ILogger<AdminManagementController> logger)
        {
            _db = db;
            _logger = logger;
        }

        /// <summary>
        /// Get all admin users
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAdmins()
        {
            var admins = await _db.Admins
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new
                {
                    a.Id,
                    a.Email,
                    a.FirstName,
                    a.LastName,
                    a.Role,
                    a.CreatedAt
                })
                .ToListAsync();

            return Ok(admins);
        }

        /// <summary>
        /// Create a new admin user (always as "Admin" role, not SuperAdmin)
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { error = "Email ve şifre zorunludur." });
            }

            var emailLower = request.Email.Trim().ToLowerInvariant();

            // Check if email already exists
            var existingAdmin = await _db.Admins.FirstOrDefaultAsync(a => a.Email == emailLower);
            if (existingAdmin != null)
            {
                return BadRequest(new { error = "Bu email adresi zaten kayıtlı." });
            }

            var newAdmin = new Admin
            {
                Email = emailLower,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FirstName = request.FirstName ?? "",
                LastName = request.LastName ?? "",
                Role = "Admin", // Always create as regular Admin, not SuperAdmin
                CreatedAt = DateTime.UtcNow
            };

            _db.Admins.Add(newAdmin);
            await _db.SaveChangesAsync();

            _logger.LogInformation($"New admin created: {emailLower} by SuperAdmin");

            return Ok(new
            {
                message = "Yönetici başarıyla oluşturuldu.",
                admin = new
                {
                    newAdmin.Id,
                    newAdmin.Email,
                    newAdmin.FirstName,
                    newAdmin.LastName,
                    newAdmin.Role,
                    newAdmin.CreatedAt
                }
            });
        }

        /// <summary>
        /// Delete an admin user
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAdmin(int id)
        {
            // Prevent self-deletion
            var currentAdminIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(currentAdminIdClaim, out int currentAdminId) && currentAdminId == id)
            {
                return BadRequest(new { error = "Kendi hesabınızı silemezsiniz." });
            }

            var admin = await _db.Admins.FindAsync(id);
            if (admin == null)
            {
                return NotFound(new { error = "Yönetici bulunamadı." });
            }

            // Prevent deletion of SuperAdmin accounts
            if (admin.Role == "SuperAdmin")
            {
                return BadRequest(new { error = "SuperAdmin hesabı silinemez." });
            }

            _db.Admins.Remove(admin);
            await _db.SaveChangesAsync();

            _logger.LogInformation($"Admin deleted: {admin.Email} (ID: {id})");

            return Ok(new { message = "Yönetici başarıyla silindi." });
        }
    }

    public class CreateAdminRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
