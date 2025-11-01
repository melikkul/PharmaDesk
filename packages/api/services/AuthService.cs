using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Utils;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    public class AuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly PasswordHasher<User> _hasher = new();

        public AuthService(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public async Task<string?> RegisterAsync(RegisterRequest req)
        {
            if (await _context.Users.AnyAsync(u => u.Email == req.Email))
                return null;

            var user = new User
            {
                GLN = req.GLN,
                Email = req.Email,
                PasswordHash = _hasher.HashPassword(null!, req.Password),
                PharmacyName = req.PharmacyName,
                PhoneNumber = req.PhoneNumber,
                City = req.City,
                District = req.District,
                Address1 = req.Address1,
                Address2 = req.Address2,
                PostalCode = req.PostalCode,
                ServicePackage = req.ServicePackage
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return JwtHelper.GenerateToken(user, _config["Jwt:Key"]!);
        }

        public async Task<string?> LoginAsync(LoginRequest req)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
            if (user == null) return null;

            var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
            if (result == PasswordVerificationResult.Failed)
                return null;

            return JwtHelper.GenerateToken(user, _config["Jwt:Key"]!);
        }
    }
}
