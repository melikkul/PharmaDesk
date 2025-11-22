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
        private readonly IdentityDbContext _db;
        private readonly AppDbContext _appDb;
        private readonly string _jwtKey;

        public AuthService(IdentityDbContext db, AppDbContext appDb, IConfiguration cfg)
        {
            _db = db;
            _appDb = appDb;
            _jwtKey = cfg["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key missing.");
        }

        public async Task<LoginResponse?> RegisterAsync(RegisterRequest req)
        {
            // E-posta işleme
            var rawEmail = req.Email;
            var emailLower = rawEmail?.Trim().ToLowerInvariant();

            Console.WriteLine($"[SERVICE] RegisterAsync başladı.");
            Console.WriteLine($"[SERVICE] Ham Email: '{rawEmail}' -> İşlenmiş Email: '{emailLower}'");

            if (string.IsNullOrEmpty(emailLower))
            {
                 throw new Exception("Email adresi boş olamaz.");
            }

            // Veritabanı kontrolü
            var exists = await _db.IdentityUsers.AnyAsync(x => x.Email == emailLower);
            Console.WriteLine($"[SERVICE] Veritabanında var mı? : {exists}");
            
            if (exists) return null;

            // Generate PublicId (Timestamp based)
            var publicId = DateTime.Now.ToString("yyyyMMddHHmmssfff");

            // 1. Create PharmacyProfile FIRST
            var profile = new PharmacyProfile
            {
                GLN = req.GLN,
                PharmacyName = req.PharmacyName,
                PhoneNumber = req.PhoneNumber,
                City = req.City,
                District = req.District,
                Address = req.Address,
                PublicId = publicId,
                CreatedAt = DateTime.UtcNow
            };
            
            _appDb.PharmacyProfiles.Add(profile);
            await _appDb.SaveChangesAsync(); // Save to get Id

            // 2. Create IdentityUser linked to PharmacyProfile
            var user = new IdentityUser
            {
                FirstName = req.FirstName,
                LastName = req.LastName,
                Email = emailLower,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                PharmacyId = profile.Id, // Link here
                Role = "User",
                IsFirstLogin = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.IdentityUsers.Add(user);
            await _db.SaveChangesAsync();

            var token = JwtHelper.GenerateToken(user, _jwtKey);
            var authUser = new AuthUserDto
            {
                FullName = $"{user.FirstName} {user.LastName}",
                Email = user.Email ?? "",
                PharmacyName = profile.PharmacyName,
                GLN = profile.GLN,
                PublicId = profile.PublicId,
                City = profile.City,
                District = profile.District
            };

            return new LoginResponse 
            { 
                Token = token, 
                IsFirstLogin = user.IsFirstLogin,
                FullName = authUser.FullName,
                PharmacyName = authUser.PharmacyName,
                User = authUser
            };
        }

        public async Task<LoginResponse?> LoginAsync(LoginRequest req, string? requiredRole = null)
        {
            var emailLower = req.Email?.Trim().ToLowerInvariant();
            
            // 1. Check Admin Table first
            var admin = await _appDb.Admins.SingleOrDefaultAsync(a => a.Email == emailLower);
            if (admin != null)
            {
                if (BCrypt.Net.BCrypt.Verify(req.Password, admin.PasswordHash))
                {
                     // Create token for admin
                     var adminUser = new IdentityUser
                     {
                         Id = admin.Id,
                         Email = admin.Email,
                         FirstName = admin.FirstName,
                         LastName = admin.LastName,
                         Role = "Admin",
                         PharmacyId = 0 // No pharmacy for admin
                     };
                     
                     var adminToken = JwtHelper.GenerateToken(adminUser, _jwtKey);
                     
                     var adminAuthUser = new AuthUserDto
                     {
                         FullName = $"{admin.FirstName} {admin.LastName}",
                         Email = admin.Email,
                         PharmacyName = "System Admin",
                         GLN = "0000000000000",
                         PublicId = "ADMIN",
                         City = "System",
                         District = "System"
                     };

                     return new LoginResponse 
                     { 
                         Token = adminToken, 
                         IsFirstLogin = false,
                         FullName = adminAuthUser.FullName,
                         PharmacyName = adminAuthUser.PharmacyName,
                         User = adminAuthUser
                     };
                }
            }

            // 2. Check IdentityUsers (Regular Users)
            var user = await _db.IdentityUsers.SingleOrDefaultAsync(u => u.Email == emailLower);

            if (user == null)
            {
                return null;
            }

            if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            {
                return null;
            }

            var token = JwtHelper.GenerateToken(user, _jwtKey);
            
            // Fetch PharmacyProfile using PharmacyId
            var profile = await _appDb.PharmacyProfiles.FindAsync(user.PharmacyId);
            
            // Fallback if profile not found (should not happen if DB is consistent)
            if (profile == null) 
            {
                // Handle error or return basic info
                // For now, let's return empty strings to avoid crash
                profile = new PharmacyProfile(); 
            }

            var authUser = new AuthUserDto
            {
                FullName = $"{user.FirstName} {user.LastName}",
                Email = user.Email ?? "",
                PharmacyName = profile.PharmacyName,
                GLN = profile.GLN,
                PublicId = profile.PublicId,
                City = profile.City,
                District = profile.District
            };

            return new LoginResponse 
            { 
                Token = token, 
                IsFirstLogin = user.IsFirstLogin,
                FullName = authUser.FullName,
                PharmacyName = authUser.PharmacyName,
                User = authUser
            };
        }
        
        public async Task<bool> CompleteOnboardingAsync(string userId)
        {
            var user = await _db.IdentityUsers.FindAsync(Guid.Parse(userId));
            if (user == null) return false;
            
            user.IsFirstLogin = false;
            await _db.SaveChangesAsync();
            return true;
        }

        // Diğer metodlar (Placeholder)
        public Task<string?> GeneratePasswordResetTokenAsync(string email) => Task.FromResult<string?>(null);
        public Task<bool> ResetPasswordWithTokenAsync(string token, string newPassword) => Task.FromResult(false);
    }
}