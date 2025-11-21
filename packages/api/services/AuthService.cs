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

            var user = new IdentityUser
            {
                FirstName = req.FirstName,
                LastName = req.LastName,
                Email = emailLower,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                PhoneNumber = req.PhoneNumber,
                GLN = req.GLN,
                City = req.City,
                District = req.District,
                Address = req.Address,
                Group = req.Group,
                PharmacyName = req.PharmacyName,
                Role = "User",
                IsFirstLogin = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.IdentityUsers.Add(user);
            await _db.SaveChangesAsync();

            // Generate PublicId (Timestamp based)
            var publicId = DateTime.Now.ToString("yyyyMMddHHmmssfff");

            // Create PharmacyProfile
            // Note: We are assuming Id sync or we need to handle it. 
            // Since we just saved 'user', it has an Id.
            // If PharmacyProfile.Id is Identity, we can't force it easily without SET IDENTITY_INSERT.
            // BUT, if we want to support the existing UsersController logic which queries by Id,
            // we should try to match them. 
            // However, for now, let's just create the profile. 
            // If they get out of sync, we might need to update UsersController to use a common field (like Email or GLN) or add a FK.
            // Given the constraints, let's try to add it.
            
            var profile = new PharmacyProfile
            {
                // If we can't set Id explicitly, we rely on auto-inc. 
                // If this is the first user, it will be 1.
                // If IdentityUser is 1, they match.
                // This is brittle but let's proceed with creating the record first.
                GLN = user.GLN,
                PharmacyName = user.PharmacyName,
                PhoneNumber = user.PhoneNumber,
                City = user.City,
                District = user.District,
                Address1 = user.Address,
                PublicId = publicId,
                CreatedAt = DateTime.UtcNow
            };
            
            _appDb.PharmacyProfiles.Add(profile);
            await _appDb.SaveChangesAsync();

            var token = JwtHelper.GenerateToken(user, _jwtKey);
            var authUser = new AuthUserDto
            {
                FullName = $"{user.FirstName} {user.LastName}",
                Email = user.Email ?? "",
                PharmacyName = user.PharmacyName,
                GLN = user.GLN,
                PublicId = publicId,
                City = user.City,
                District = user.District
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
                     // We need to map Admin to IdentityUser-like structure for token generation or update GenerateToken to accept Admin
                     // For simplicity, let's create a dummy IdentityUser for token generation
                     var adminUser = new IdentityUser
                     {
                         Id = admin.Id,
                         Email = admin.Email,
                         FirstName = admin.FirstName,
                         LastName = admin.LastName,
                         Role = "Admin",
                         PharmacyName = "System Admin",
                         GLN = "0000000000000"
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
            
            // Fetch PublicId from PharmacyProfile
            var profile = await _appDb.PharmacyProfiles.FirstOrDefaultAsync(p => p.GLN == user.GLN);
            var publicId = profile?.PublicId ?? "";

            var authUser = new AuthUserDto
            {
                FullName = $"{user.FirstName} {user.LastName}",
                Email = user.Email ?? "",
                PharmacyName = user.PharmacyName,
                GLN = user.GLN,
                PublicId = publicId,
                City = user.City,
                District = user.District
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