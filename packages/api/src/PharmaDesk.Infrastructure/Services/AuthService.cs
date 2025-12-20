using System.Text;
using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Backend.Utils;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Backend.Services
{
    /// <summary>
    /// Custom exception for pending admin approval.
    /// </summary>
    public class PendingApprovalException : Exception
    {
        public PendingApprovalException() : base("PENDING_APPROVAL") { }
    }

    /// <summary>
    /// Custom exception for suspended/inactive accounts.
    /// </summary>
    public class AccountSuspendedException : Exception
    {
        public AccountSuspendedException() : base("ACCOUNT_SUSPENDED") { }
    }

    public class AuthService
    {
        private readonly IdentityDbContext _db;
        private readonly AppDbContext _appDb;
        private readonly string _jwtKey;
        
        // Token expiry constants
        private const int ACCESS_TOKEN_EXPIRY_MINUTES = 60;
        private const int REFRESH_TOKEN_EXPIRY_DAYS_REMEMBER = 30;
        private const int REFRESH_TOKEN_EXPIRY_DAYS_SESSION = 1;

        public AuthService(IdentityDbContext db, AppDbContext appDb, IConfiguration cfg)
        {
            _db = db;
            _appDb = appDb;
            _jwtKey = cfg["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key missing.");
        }

        public async Task<LoginResponse?> RegisterAsync(RegisterRequest req)
        {
            var rawEmail = req.Email;
            var emailLower = rawEmail?.Trim().ToLowerInvariant();

            Console.WriteLine($"[SERVICE] RegisterAsync başladı.");
            Console.WriteLine($"[SERVICE] Ham Email: '{rawEmail}' -> İşlenmiş Email: '{emailLower}'");

            if (string.IsNullOrEmpty(emailLower))
            {
                 throw new Exception("Email adresi boş olamaz.");
            }

            var emailExists = await _db.IdentityUsers.AnyAsync(x => x.Email == emailLower);
            Console.WriteLine($"[SERVICE] Email veritabanında var mı? : {emailExists}");
            
            if (emailExists)
            {
                Console.WriteLine($"[SERVICE] Bu e-posta zaten kayıtlı: {emailLower}");
                return null;
            }

            var glnExists = await _appDb.PharmacyProfiles.AnyAsync(p => p.GLN == req.GLN);
            Console.WriteLine($"[SERVICE] GLN veritabanında var mı? : {glnExists}");
            
            if (glnExists)
            {
                Console.WriteLine($"[SERVICE] Bu GLN numarası zaten kayıtlı: {req.GLN}");
                return null;
            }

            var publicId = DateTime.Now.ToString("yyyyMMddHHmmssfff");

            var profile = new PharmacyProfile
            {
                Id = IdGenerator.GenerateTimestampId(),
                GLN = req.GLN,
                PharmacyName = req.PharmacyName,
                PhoneNumber = req.PhoneNumber,
                City = req.City,
                District = req.District,
                Address = req.Address,
                PublicId = publicId,
                Username = GenerateSlug(req.PharmacyName) + "-" + publicId.Substring(8),
                CreatedAt = DateTime.UtcNow
            };
            
            _appDb.PharmacyProfiles.Add(profile);
            await _appDb.SaveChangesAsync();

            if (req.GroupId.HasValue)
            {
                var groupExists = await _appDb.Groups.AnyAsync(g => g.Id == req.GroupId.Value);
                if (groupExists)
                {
                    var pharmacyGroup = new PharmacyGroup
                    {
                        PharmacyProfileId = profile.Id,
                        GroupId = req.GroupId.Value,
                        JoinedAt = DateTime.UtcNow,
                        IsActive = true
                    };
                    _appDb.PharmacyGroups.Add(pharmacyGroup);
                    await _appDb.SaveChangesAsync();
                }
            }

            // Create user with IsApproved = false (requires admin approval)
            var user = new IdentityUser
            {
                FirstName = req.FirstName,
                LastName = req.LastName,
                Email = emailLower,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                GLN = req.GLN,
                PharmacyId = profile.Id,
                Role = "User",
                IsFirstLogin = true,
                IsApproved = false, // New users need admin approval
                CreatedAt = DateTime.UtcNow
            };

            _db.IdentityUsers.Add(user);
            await _db.SaveChangesAsync();

            // Return null response - user needs to be approved before they can login
            // Don't generate tokens for unapproved users
            var authUser = new AuthUserDto
            {
                FullName = $"{user.FirstName} {user.LastName}",
                Email = user.Email ?? "",
                PharmacyName = profile.PharmacyName,
                GLN = profile.GLN,
                PublicId = profile.PublicId,
                City = profile.City,
                District = profile.District,
                Address = profile.Address ?? "",
                PharmacyId = user.PharmacyId.ToString()
            };

            // For registration, we return a response but without valid tokens
            // The frontend should show a "pending approval" message
            return new LoginResponse 
            { 
                AccessToken = "", // Empty - user needs approval
                RefreshToken = "", // Empty - user needs approval
                ExpiresIn = 0,
                IsFirstLogin = true,
                FullName = authUser.FullName,
                PharmacyName = authUser.PharmacyName,
                User = authUser
            };
        }

        public async Task<LoginResponse?> LoginAsync(LoginRequest req, string? requiredRole = null, string? ipAddress = null)
        {
            var emailLower = req.Email?.Trim().ToLowerInvariant();
            
            // 1. Admin login flow
            if (requiredRole == "Admin")
            {
                var admin = await _appDb.Admins.SingleOrDefaultAsync(a => a.Email == emailLower);
                if (admin != null)
                {
                    if (BCrypt.Net.BCrypt.Verify(req.Password, admin.PasswordHash))
                    {
                         var adminUser = new IdentityUser
                         {
                             Id = admin.Id,
                             Email = admin.Email,
                             FirstName = admin.FirstName,
                             LastName = admin.LastName,
                             Role = "Admin",
                             PharmacyId = 0,
                             IsApproved = true // Admins are always approved
                         };
                         
                         var adminAccessToken = JwtHelper.GenerateAccessToken(adminUser, _jwtKey, ACCESS_TOKEN_EXPIRY_MINUTES);
                         var adminRefreshToken = JwtHelper.GenerateRefreshToken();
                         
                         // Store admin refresh token (using admin.Id as UserId with negative sign to differentiate)
                         // For simplicity, we'll skip storing admin refresh tokens for now
                         // Admin sessions can use the access token directly for the dashboard
                         
                         var adminAuthUser = new AuthUserDto
                         {
                             FullName = $"{admin.FirstName} {admin.LastName}",
                             Email = admin.Email,
                             PharmacyName = "System Admin",
                             GLN = "0000000000000",
                             PublicId = "ADMIN",
                             City = "System",
                             District = "System",
                             PharmacyId = "0"
                         };

                         return new LoginResponse 
                         { 
                             AccessToken = adminAccessToken, 
                             RefreshToken = adminRefreshToken,
                             ExpiresIn = ACCESS_TOKEN_EXPIRY_MINUTES * 60,
                             IsFirstLogin = false,
                             FullName = adminAuthUser.FullName,
                             PharmacyName = adminAuthUser.PharmacyName,
                             User = adminAuthUser
                         };
                    }
                }
                return null;
            }

            // 2. Regular user login flow
            var user = await _db.IdentityUsers.SingleOrDefaultAsync(u => u.Email == emailLower);

            if (user == null)
            {
                return null;
            }

            if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            {
                return null;
            }

            // 🔒 Check if user is approved by admin
            if (!user.IsApproved)
            {
                throw new PendingApprovalException();
            }

            // 🔒 Check if user is active (not suspended)
            if (user.Status == UserStatus.Suspended)
            {
                throw new AccountSuspendedException();
            }

            // Update last login date
            user.LastLoginDate = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Get profile for subscription claims
            var profile = await _appDb.PharmacyProfiles.FindAsync(user.PharmacyId);
            
            if (profile != null)
            {
                Console.WriteLine($"[LoginAsync] Found Profile for PharmacyId: {user.PharmacyId}");
                Console.WriteLine($"[LoginAsync] DB SubscriptionStatus: {profile.SubscriptionStatus} ({(int)profile.SubscriptionStatus})");
                Console.WriteLine($"[LoginAsync] DB ExpireDate: {profile.SubscriptionExpireDate}");
            }
            else
            {
                 Console.WriteLine($"[LoginAsync] Profile NOT FOUND for PharmacyId: {user.PharmacyId}");
            }

            // Generate tokens with subscription claims
            var accessToken = JwtHelper.GenerateAccessToken(user, profile, _jwtKey, ACCESS_TOKEN_EXPIRY_MINUTES);
            var refreshToken = JwtHelper.GenerateRefreshToken();
            
            // Calculate refresh token expiry based on RememberMe
            var refreshExpiryDays = req.RememberMe ? REFRESH_TOKEN_EXPIRY_DAYS_REMEMBER : REFRESH_TOKEN_EXPIRY_DAYS_SESSION;
            
            // Store refresh token (hashed) in database
            var refreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                TokenHash = JwtHelper.HashToken(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(refreshExpiryDays),
                CreatedByIp = ipAddress
            };
            _db.RefreshTokens.Add(refreshTokenEntity);
            await _db.SaveChangesAsync();
            
            if (profile == null) 
            {
                profile = new PharmacyProfile(); 
            }

            var authUser = new AuthUserDto
            {
                FullName = $"{user.FirstName} {user.LastName}",
                Email = user.Email ?? "",
                PharmacyName = profile.PharmacyName,
                GLN = profile.GLN,
                PublicId = profile.PublicId,
                City = profile.City ?? "",
                District = profile.District ?? "",
                Address = profile.Address ?? "",
                PharmacyId = user.PharmacyId.ToString()
            };

            Console.WriteLine($"[LoginAsync] user.PharmacyId: {user.PharmacyId}, IsApproved: {user.IsApproved}");

            return new LoginResponse 
            { 
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresIn = ACCESS_TOKEN_EXPIRY_MINUTES * 60,
                IsFirstLogin = user.IsFirstLogin,
                FullName = authUser.FullName,
                PharmacyName = authUser.PharmacyName,
                User = authUser
            };
        }
        
        /// <summary>
        /// Exchange a valid refresh token for a new access token.
        /// </summary>
        public async Task<TokenResponse?> RefreshTokenAsync(string refreshToken, string? ipAddress = null)
        {
            var tokenHash = JwtHelper.HashToken(refreshToken);
            
            var storedToken = await _db.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash);
            
            // Validate token
            if (storedToken == null || storedToken.IsRevoked || storedToken.ExpiresAt < DateTime.UtcNow)
            {
                return null;
            }
            
            // Token is valid - generate new access token
            var user = storedToken.User;
            
            // Double-check user is still approved
            if (!user.IsApproved)
            {
                // Revoke the refresh token
                storedToken.IsRevoked = true;
                storedToken.RevokedAt = DateTime.UtcNow;
                storedToken.RevokedByIp = ipAddress;
                await _db.SaveChangesAsync();
                return null;
            }

            // Get profile for subscription claims
            var profile = await _appDb.PharmacyProfiles.FindAsync(user.PharmacyId);
            
            var accessToken = JwtHelper.GenerateAccessToken(user, profile, _jwtKey, ACCESS_TOKEN_EXPIRY_MINUTES);
            
            return new TokenResponse
            {
                AccessToken = accessToken,
                ExpiresIn = ACCESS_TOKEN_EXPIRY_MINUTES * 60
            };
        }
        
        /// <summary>
        /// Revoke a refresh token (logout).
        /// </summary>
        public async Task<bool> RevokeTokenAsync(string refreshToken, string? ipAddress = null)
        {
            var tokenHash = JwtHelper.HashToken(refreshToken);
            
            var storedToken = await _db.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash);
            
            if (storedToken == null)
            {
                return false;
            }
            
            storedToken.IsRevoked = true;
            storedToken.RevokedAt = DateTime.UtcNow;
            storedToken.RevokedByIp = ipAddress;
            await _db.SaveChangesAsync();
            
            return true;
        }
        
        /// <summary>
        /// Revoke all refresh tokens for a user (force logout from all devices).
        /// </summary>
        public async Task RevokeAllUserTokensAsync(int userId, string? ipAddress = null)
        {
            var tokens = await _db.RefreshTokens
                .Where(rt => rt.UserId == userId && !rt.IsRevoked)
                .ToListAsync();
            
            foreach (var token in tokens)
            {
                token.IsRevoked = true;
                token.RevokedAt = DateTime.UtcNow;
                token.RevokedByIp = ipAddress;
            }
            
            await _db.SaveChangesAsync();
        }
        
        public async Task<bool> CompleteOnboardingAsync(string userId)
        {
            if (!int.TryParse(userId, out int id))
            {
                return false;
            }
            
            var user = await _db.IdentityUsers.FindAsync(id);
            if (user == null) return false;
            
            user.IsFirstLogin = false;
            await _db.SaveChangesAsync();
            return true;
        }

        // Diğer metodlar (Placeholder)
        public Task<string?> GeneratePasswordResetTokenAsync(string email) => Task.FromResult<string?>(null);
        public Task<bool> ResetPasswordWithTokenAsync(string token, string newPassword) => Task.FromResult(false);
        
        private string GenerateSlug(string phrase)
        {
            string str = phrase.ToLowerInvariant();
            str = System.Text.RegularExpressions.Regex.Replace(str, @"[^a-z0-9\s-]", "");
            str = System.Text.RegularExpressions.Regex.Replace(str, @"\s+", " ").Trim();
            str = str.Substring(0, str.Length <= 45 ? str.Length : 45).Trim();
            str = System.Text.RegularExpressions.Regex.Replace(str, @"\s", "-");
            return str;
        }
    }
}