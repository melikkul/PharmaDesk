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

            user.PhoneNumber   = req.PhoneNumber ?? user.PhoneNumber;
            user.City          = req.City ?? user.City;
            user.District      = req.District ?? user.District;
            user.Address1      = req.Address1 ?? user.Address1;
            user.Address2      = req.Address2 ?? user.Address2;
            user.PostalCode    = req.PostalCode ?? user.PostalCode;
            user.ServicePackage= req.ServicePackage ?? user.ServicePackage;
            user.PharmacyName  = req.PharmacyName ?? user.PharmacyName;
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

            static string Hash(string s)
            {
                using var sha = System.Security.Cryptography.SHA256.Create();
                return Convert.ToHexString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(s)));
            }

            if (!string.Equals(user.PasswordHash, Hash(req.OldPassword), StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { error = "Eski şifre hatalı." });

            user.PasswordHash = Hash(req.NewPassword);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}
