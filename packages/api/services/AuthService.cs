using System.Security.Claims;
using System.Security.Cryptography;
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

        private static string Hash(string input)
        {
            using var sha = SHA256.Create();
            return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(input)));
        }

        public async Task<string> RegisterAsync(RegisterRequest req)
        {
            var exists = await _db.Users.AnyAsync(x => x.Email == req.Email);
            if (exists)
                throw new InvalidOperationException("Bu e-posta zaten kayıtlı.");

            var user = new User
            {
                GLN = req.GLN,
                Email = req.Email,
                PasswordHash = Hash(req.Password),
                PharmacyName = req.PharmacyName,
                Role = "User",
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return JwtHelper.GenerateToken(user, _jwtKey);
        }

        public async Task<string> LoginAsync(LoginRequest req)
        {
            var user = await _db.Users.SingleOrDefaultAsync(x => x.Email == req.Email);
            if (user is null)
                throw new InvalidOperationException("Kullanıcı bulunamadı.");

            if (!string.Equals(user.PasswordHash, Hash(req.Password), StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Geçersiz şifre.");

            return JwtHelper.GenerateToken(user, _jwtKey);
        }
    }
}