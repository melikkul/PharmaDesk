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
                Id = x.Id.ToString(),
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
                PharmacistFirstName = user.FirstName, // Eczacı adı
                PharmacistLastName = user.LastName,   // Eczacı soyadı
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

        [HttpGet("{idOrUsername}")]
        public async Task<ActionResult<UserMeResponse>> GetProfile(string idOrUsername)
        {
            Console.WriteLine($"GetProfile called with: {idOrUsername}");
            
            // Try to parse as integer ID first
            if (int.TryParse(idOrUsername, out var pharmacyId))
            {
                // Search by ID - join with IdentityUser to get pharmacist name
                var profileById = await (from p in _db.PharmacyProfiles
                                         join u in _identityDb.IdentityUsers on p.Id equals u.PharmacyId into userGroup
                                         from u in userGroup.DefaultIfEmpty()
                                         where p.Id == pharmacyId
                                         select new UserMeResponse
                                         {
                                             Id = p.Id.ToString(),
                                             Email = "",
                                             Role = "User",
                                             GLN = p.GLN,
                                             PharmacyName = p.PharmacyName,
                                             PublicId = p.PublicId,
                                             PhoneNumber = p.PhoneNumber,
                                             City = p.City,
                                             District = p.District,
                                             Address1 = p.Address,
                                             Address2 = "",
                                             PostalCode = "",
                                             ServicePackage = p.ServicePackage,
                                             ProfileImagePath = p.ProfileImagePath,
                                             PharmacistFirstName = u != null ? u.FirstName : "",
                                             PharmacistLastName = u != null ? u.LastName : "",
                                             CreatedAt = p.CreatedAt
                                         })
                                        .AsNoTracking()
                                        .FirstOrDefaultAsync();

                if (profileById != null) return Ok(profileById);
            }
            
            // If not found by ID or not a valid ID, search by username/publicId
            var profile = await _db.PharmacyProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.PublicId == idOrUsername || 
                                          p.Username == idOrUsername || 
                                          p.PharmacyName == idOrUsername || 
                                          p.PharmacyName.Replace(" ", "").ToLower() == idOrUsername.ToLower());

            // If looking up by numeric ID, try to parse it
            if (profile == null && long.TryParse(idOrUsername, out var numericId))
            {
                profile = await _db.PharmacyProfiles
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == numericId);
            }

            if (profile == null) return NotFound();

            // Fetch user info separately
            var user = await _identityDb.IdentityUsers
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.PharmacyId == profile.Id);

            var profileData = new UserMeResponse
            {
                Id = profile.Id.ToString(),
                Email = user?.Email ?? "",
                Role = "User",
                GLN = profile.GLN,
                PharmacyName = profile.PharmacyName,
                PublicId = profile.PublicId,
                PhoneNumber = profile.PhoneNumber,
                City = profile.City,
                District = profile.District,
                Address1 = profile.Address,
                Address2 = "",
                PostalCode = "",
                ServicePackage = profile.ServicePackage,
                ProfileImagePath = profile.ProfileImagePath,
                PharmacistFirstName = user?.FirstName ?? "",
                PharmacistLastName = user?.LastName ?? "",
                CreatedAt = profile.CreatedAt
            };

            return Ok(profileData);
        }

        // GET /api/users - List all users (for admin panel)
        [HttpGet]
        public async Task<ActionResult> GetAllUsers()
        {
            var users = await _identityDb.IdentityUsers
                .Select(u => new
                {
                    Id = u.Id,
                    Email = u.Email,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    GLN = u.GLN,
                    CreatedAt = u.CreatedAt,
                    PharmacyId = u.PharmacyId
                })
                .ToListAsync();

            // Fetch pharmacy names for each user
            var result = new List<object>();
            foreach (var user in users)
            {
                var pharmacy = await _db.PharmacyProfiles.FindAsync(user.PharmacyId);
                result.Add(new
                {
                    user.Id,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.GLN,
                    PharmacyName = pharmacy?.PharmacyName ?? "N/A",
                    City = pharmacy?.City ?? "N/A",
                    District = pharmacy?.District ?? "N/A",
                    user.CreatedAt
                });
            }

            return Ok(result);
        }
    }
}
