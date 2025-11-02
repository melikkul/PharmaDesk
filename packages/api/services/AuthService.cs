using System.Text;
using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Utils;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class AuthService
    {
        private readonly AppDbContext _db;
        private readonly string _jwtKey;

        public AuthService(AppDbContext db, IConfiguration cfg)
        {
            _db = db;
            _jwtKey = cfg["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key missing.");
            if (_jwtKey.Length < 32)
                throw new InvalidOperationException($"Jwt:Key too short (len={_jwtKey.Length}). Needs >= 32 bytes.");
        }

        public async Task<string?> RegisterAsync(RegisterRequest req)
        {
            var exists = await _db.Users.AnyAsync(x => x.Email == req.Email);
            if (exists) return null;

            var user = new User
            {
                GLN = req.GLN,
                Email = req.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                PharmacyName = req.PharmacyName,
                Role = "User",
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return JwtHelper.GenerateToken(user, _jwtKey);
        }

        public async Task<string?> LoginAsync(LoginRequest req, string? requiredRole = null)
        {
            var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == req.Email);
            if (user == null) return null;

            if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                return null;

            if (!string.IsNullOrEmpty(requiredRole) &&
                !string.Equals(user.Role, requiredRole, StringComparison.OrdinalIgnoreCase))
                return null;

            return JwtHelper.GenerateToken(user, _jwtKey);
        }
    }
}
