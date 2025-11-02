using System.Security.Claims;
using Backend.Data;
using Backend.Dtos;
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

        public UsersController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("me")]
        public async Task<ActionResult<UserMeResponse>> Me()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(idClaim)) return Unauthorized();

            if (!int.TryParse(idClaim, out var uid)) return Unauthorized();

            var u = await _db.Users
                .AsNoTracking()
                .Where(x => x.Id == uid)
                .Select(x => new UserMeResponse
                {
                    Id = x.Id,
                    Email = x.Email,
                    GLN = x.GLN,
                    PharmacyName = x.PharmacyName,
                    PhoneNumber = x.PhoneNumber,
                    City = x.City,
                    District = x.District,
                    Address1 = x.Address1,
                    Address2 = x.Address2,
                    PostalCode = x.PostalCode,
                    ServicePackage = x.ServicePackage,
                    Role = x.Role,
                    ProfileImagePath = x.ProfileImagePath,
                    CreatedAt = x.CreatedAt
                })
                .SingleOrDefaultAsync();

            if (u is null) return NotFound();

            return Ok(u);
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest req)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(idClaim) || !int.TryParse(idClaim, out var uid))
                return Unauthorized();

            var user = await _db.Users.SingleOrDefaultAsync(x => x.Id == uid);
            if (user is null) return NotFound();

            user.PhoneNumber = req.PhoneNumber ?? user.PhoneNumber;
            user.City = req.City ?? user.City;
            user.District = req.District ?? user.District;
            user.Address1 = req.Address1 ?? user.Address1;
            user.Address2 = req.Address2 ?? user.Address2;
            user.PostalCode = req.PostalCode ?? user.PostalCode;
            user.ServicePackage = req.ServicePackage ?? user.ServicePackage;
            user.PharmacyName = req.PharmacyName ?? user.PharmacyName;
            user.ProfileImagePath = req.ProfileImagePath ?? user.ProfileImagePath;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(idClaim) || !int.TryParse(idClaim, out var uid))
                return Unauthorized();

            var user = await _db.Users.SingleOrDefaultAsync(x => x.Id == uid);
            if (user is null) return NotFound();

    
            if (!BCrypt.Net.BCrypt.Verify(req.OldPassword, user.PasswordHash))
                return BadRequest(new { error = "Eski şifre hatalı." });

    
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);

            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("make-admin")]
        [Authorize]
        public async Task<IActionResult> MakeAdmin()
        {
            var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
            if (!env.Equals("Development", StringComparison.OrdinalIgnoreCase))
                return Forbid();

            var id = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var u = await _db.Users.FindAsync(id);

            if (u == null) return NotFound();
            u.Role = "Admin";
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("me/avatar")]
        [Authorize]
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

            var id = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var u = await _db.Users.FindAsync(id);
            if (u == null) return NotFound();

            u.ProfileImagePath = $"/uploads/{name}";
            await _db.SaveChangesAsync();

            return Ok(new { url = u.ProfileImagePath });
        }
    }
}
