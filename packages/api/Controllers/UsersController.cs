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

            var p = await _db.PharmacyProfiles
                .AsNoTracking()
                .Where(x => x.Id == uid)
                .Select(x => new UserMeResponse
                {
                    Id = x.Id,
                    Email = emailClaim ?? string.Empty, 
                    Role = roleClaim, 
                    GLN = x.GLN,
                    PharmacyName = x.PharmacyName,
                    PublicId = x.PublicId, // YENİ
                    PhoneNumber = x.PhoneNumber,
                    City = x.City,
                    District = x.District,
                    Address1 = x.Address1,
                    Address2 = x.Address2,
                    PostalCode = x.PostalCode,
                    ServicePackage = x.ServicePackage,
                    ProfileImagePath = x.ProfileImagePath,
                    CreatedAt = x.CreatedAt
                })
                .SingleOrDefaultAsync();

            if (p is null) return NotFound();

            return Ok(p);
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest req)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(idClaim) || !int.TryParse(idClaim, out var uid))
                return Unauthorized();

            var profile = await _db.PharmacyProfiles.SingleOrDefaultAsync(x => x.Id == uid);
            if (profile is null) return NotFound();

            profile.PhoneNumber = req.PhoneNumber ?? profile.PhoneNumber;
            profile.City = req.City ?? profile.City;
            profile.District = req.District ?? profile.District;
            profile.Address1 = req.Address1 ?? profile.Address1;
            profile.Address2 = req.Address2 ?? profile.Address2;
            profile.PostalCode = req.PostalCode ?? profile.PostalCode;
            profile.ServicePackage = req.ServicePackage ?? profile.ServicePackage;
            profile.PharmacyName = req.PharmacyName ?? profile.PharmacyName;
            profile.ProfileImagePath = req.ProfileImagePath ?? profile.ProfileImagePath;
            profile.About = req.About ?? profile.About; // YENİ

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

            var profile = await _db.PharmacyProfiles.FindAsync(uid);
            if (profile == null) return NotFound();

            profile.ProfileImagePath = $"/uploads/{name}";
            await _db.SaveChangesAsync();

            return Ok(new { url = profile.ProfileImagePath });
        }

        // NEW: Get Public Profile by Username (or ID, but username is friendlier for URLs if unique)
        // Assuming 'username' in URL maps to something unique. 
        // In this system, we don't have a distinct 'username' field visible in IdentityUser other than Email.
        // But the frontend uses 'username' in the URL. 
        // Let's assume for now we might need to look up by ID if the frontend passes an ID, 
        // OR we look up by Email if that's what 'username' implies.
        // However, typically 'username' is a slug. 
        // Let's try to find by PharmacyName or Email? 
        // For simplicity and safety, let's assume the frontend might pass the ID or we search by PharmacyName (if unique).
        // Given the user request, let's search by PharmacyName for now as a "username" proxy, or just return 404 if not found.
        
        [HttpGet("{username}")]
        public async Task<ActionResult<UserMeResponse>> GetProfile(string username)
        {
            // Try to find by PublicId first (timestamp format), then fallback to PharmacyName?
            // User requested PublicId for URLs. 
            // Let's assume 'username' param is now the PublicId.
            
            var p = await _db.PharmacyProfiles
                .AsNoTracking()
                .Where(x => x.PublicId == username || x.PharmacyName == username || x.PharmacyName.Replace(" ", "").ToLower() == username.ToLower()) 
                .Select(x => new UserMeResponse
                {
                    Id = x.Id,
                    // Email hidden for public profile? Or show it? Let's hide it for privacy unless it's 'me'
                    Email = "", 
                    Role = "User", 
                    GLN = x.GLN,
                    PharmacyName = x.PharmacyName,
                    PublicId = x.PublicId, // YENİ
                    PhoneNumber = x.PhoneNumber,
                    City = x.City,
                    District = x.District,
                    Address1 = x.Address1,
                    Address2 = x.Address2,
                    PostalCode = x.PostalCode,
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
