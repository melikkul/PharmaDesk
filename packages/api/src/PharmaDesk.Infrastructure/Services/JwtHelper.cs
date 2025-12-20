using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Backend.Models; 
using Microsoft.IdentityModel.Tokens;

namespace Backend.Utils
{
    public static class JwtHelper
    {
        /// <summary>
        /// Generate an access token with configurable expiry.
        /// Default: 15 minutes for production-ready short-lived tokens.
        /// </summary>
        public static string GenerateAccessToken(IdentityUser user, string jwtKey, int expiryMinutes = 15)
        {
            // Use the overload with null PharmacyProfile for backward compatibility
            return GenerateAccessToken(user, null, jwtKey, expiryMinutes);
        }

        /// <summary>
        /// Generate an access token with subscription claims.
        /// SubscriptionStatus and SubscriptionExpireDate are embedded in the token
        /// so middleware can check access without DB queries.
        /// </summary>
        public static string GenerateAccessToken(IdentityUser user, PharmacyProfile? profile, string jwtKey, int expiryMinutes = 15)
        {
            if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
                throw new InvalidOperationException("Jwt key too short.");

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim("sub", user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
                new Claim(ClaimTypes.Role, user.Role ?? "User"),
                new Claim("PharmacyId", user.PharmacyId.ToString())
            };

            // 🆕 Add subscription claims for middleware access control
            if (profile != null)
            {
                claims.Add(new Claim("SubscriptionStatus", profile.SubscriptionStatus.ToString()));
                
                if (profile.SubscriptionExpireDate.HasValue)
                {
                    claims.Add(new Claim("SubscriptionExpireDate", 
                        profile.SubscriptionExpireDate.Value.ToString("o"))); // ISO 8601 format
                }
            }
            else
            {
                // Default to Trial if no profile info
                claims.Add(new Claim("SubscriptionStatus", "Trial"));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: "PharmaDeskApi",
                audience: "PharmaDeskClient",
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
        
        /// <summary>
        /// Generate a cryptographically secure refresh token (64 bytes, Base64 encoded).
        /// </summary>
        public static string GenerateRefreshToken()
        {
            var randomBytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }
        
        /// <summary>
        /// Hash a token using SHA256 for secure storage.
        /// Never store plain refresh tokens in the database.
        /// </summary>
        public static string HashToken(string token)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(token);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }
        
        /// <summary>
        /// Legacy method for backward compatibility.
        /// Generates a 7-day token (not recommended for production).
        /// </summary>
        [Obsolete("Use GenerateAccessToken with shorter expiry for production")]
        public static string GenerateToken(IdentityUser user, string jwtKey)
        {
            return GenerateAccessToken(user, jwtKey, 10080); // 7 days in minutes
        }
    }
}