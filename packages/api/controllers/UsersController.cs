using System.Security.Claims;
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
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IdentityDbContext _identityDb; // Inject IdentityDbContext to find user by username (email) if needed, or just join.

        public UsersController(AppDbContext db, IdentityDbContext identityDb)
        {
            _db = db;
            _identityDb = identityDb;
        }

        [HttpGet("me")]
        public async Task<ActionResult<UserMeResponse>> Me()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var emailClaim = User.FindFirst(ClaimTypes.Email)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;

            if (string.IsNullOrWhiteSpace(idClaim) || !int.TryParse(idClaim, out var uid)) 
                return Unauthorized();

            // Fetch IdentityUser
            var user = await _identityDb.IdentityUsers.FindAsync(uid);
            if (user == null) return NotFound();

            // Fetch PharmacyProfile manually
            var x = await _db.PharmacyProfiles.FindAsync(user.PharmacyId);
            if (x == null) return NotFound();

            return Ok(new UserMeResponse
            {
                Id = x.Id,
                Email = emailClaim ?? string.Empty, 
                Role = roleClaim, 
                GLN = x.GLN,
                PharmacyName = x.PharmacyName,
                PublicId = x.PublicId,
                PhoneNumber = x.PhoneNumber,
                City = x.City,
                District = x.District,
                Address1 = x.Address, // Mapping Address to Address1 for DTO compatibility
                Address2 = "",
                PostalCode = "", // Removed from model
                ServicePackage = x.ServicePackage,
                ProfileImagePath = x.ProfileImagePath,
                CreatedAt = x.CreatedAt
            });
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest req)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(idClaim) || !int.TryParse(idClaim, out var uid))
                return Unauthorized();

            var user = await _identityDb.IdentityUsers.FindAsync(uid);
            if (user == null) return NotFound();

            var profile = await _db.PharmacyProfiles.FindAsync(user.PharmacyId);
            if (profile == null) return NotFound();

            profile.PhoneNumber = req.PhoneNumber ?? profile.PhoneNumber;
            profile.City = req.City ?? profile.City;
            profile.District = req.District ?? profile.District;
            profile.Address = req.Address1 ?? profile.Address; // Mapping Address1 from request to Address
            // profile.PostalCode = req.PostalCode ?? profile.PostalCode; // Removed
            profile.ServicePackage = req.ServicePackage ?? profile.ServicePackage;
            profile.PharmacyName = req.PharmacyName ?? profile.PharmacyName;
            profile.ProfileImagePath = req.ProfileImagePath ?? profile.ProfileImagePath;
            profile.About = req.About ?? profile.About;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("me/avatar")]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Dosya yok.");

            if (!file.ContentType.StartsWith("image/"))
                return BadRequest("Sadece resim yükleyin.");

            if (file.Length > 2 * 1024 * 1024)
                return BadRequest("Maksimum 2MB.");

            var webroot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploads = Path.Combine(webroot, "uploads");
            Directory.CreateDirectory(uploads);

            var ext = Path.GetExtension(file.FileName);
            var name = $"{Guid.NewGuid()}{ext}";
            var fullPath = Path.Combine(uploads, name);
            await using (var fs = System.IO.File.Create(fullPath))
                await file.CopyToAsync(fs);

            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(idClaim) || !int.TryParse(idClaim, out var uid))
                return Unauthorized();

            var user = await _identityDb.IdentityUsers.FindAsync(uid);
            if (user == null) return NotFound();

            var profile = await _db.PharmacyProfiles.FindAsync(user.PharmacyId);
            if (profile == null) return NotFound();

            profile.ProfileImagePath = $"/uploads/{name}";
            await _db.SaveChangesAsync();

            return Ok(new { url = profile.ProfileImagePath });
        }

        [HttpGet("{username}")]
        public async Task<ActionResult<UserMeResponse>> GetProfile(string username)
        {
            var p = await _db.PharmacyProfiles
                .AsNoTracking()
                .Where(x => x.PublicId == username || x.PharmacyName == username || x.PharmacyName.Replace(" ", "").ToLower() == username.ToLower()) 
                .Select(x => new UserMeResponse
                {
                    Id = x.Id,
                    Email = "", 
                    Role = "User", 
                    GLN = x.GLN,
                    PharmacyName = x.PharmacyName,
                    PublicId = x.PublicId,
                    PhoneNumber = x.PhoneNumber,
                    City = x.City,
                    District = x.District,
                    Address1 = x.Address,
                    Address2 = "",
                    PostalCode = "",
                    ServicePackage = x.ServicePackage,
                    ProfileImagePath = x.ProfileImagePath,
                    CreatedAt = x.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (p is null) return NotFound();

            return Ok(p);
        }
    }
}
