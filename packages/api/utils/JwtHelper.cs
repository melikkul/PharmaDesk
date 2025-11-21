using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Models; 
using Microsoft.IdentityModel.Tokens;

namespace Backend.Utils
{
    public static class JwtHelper
    {
        public static string GenerateToken(IdentityUser user, string jwtKey)
        {
            if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
                throw new InvalidOperationException("Jwt key too short.");

            // İsim ve Soyisimi birleştirip claim olarak ekliyoruz
            var fullName = $"{user.FirstName} {user.LastName}";

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim("sub", user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                // DÜZELTME: PharmacyName yerine fullName kullanıldı
                new Claim(ClaimTypes.Name, string.IsNullOrWhiteSpace(fullName) ? user.Email : fullName),
                new Claim(ClaimTypes.Role, user.Role ?? "User"),
                
                // İsterseniz frontend'de kullanmak için ek alanlar da gönderebilirsiniz
                new Claim("City", user.City ?? ""),
                new Claim("Group", user.Group ?? "")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: "PharmaDeskApi",
                audience: "PharmaDeskClient",
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}