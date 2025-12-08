using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Services
{
    public class CarrierAuthService
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public CarrierAuthService(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        /// <summary>
        /// Authenticate carrier and return JWT token
        /// </summary>
        public async Task<CarrierLoginResponse?> LoginAsync(CarrierLoginRequest req)
        {
            var carrier = await _db.Carriers.FirstOrDefaultAsync(c => c.Email == req.Email);
            if (carrier == null || !VerifyPassword(req.Password, carrier.PasswordHash))
                return null;

            if (carrier.Status != CarrierStatus.Active)
                return null;

            // Update last login date
            carrier.LastLoginDate = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var token = GenerateJwtToken(carrier);

            return new CarrierLoginResponse
            {
                Token = token,
                User = new CarrierUserResponse
                {
                    Id = carrier.Id,
                    Email = carrier.Email,
                    FirstName = carrier.FirstName,
                    LastName = carrier.LastName,
                    PhoneNumber = carrier.PhoneNumber,
                    CompanyName = carrier.CompanyName,
                    VehicleInfo = carrier.VehicleInfo,
                    Status = carrier.Status.ToString()
                }
            };
        }

        /// <summary>
        /// Register a new carrier using a registration token
        /// </summary>
        public async Task<CarrierRegisterResponse> RegisterAsync(CarrierRegisterRequest req)
        {
            // Validate token
            var tokenEntity = await _db.CarrierRegistrationTokens
                .FirstOrDefaultAsync(t => t.Token == req.Token);

            if (tokenEntity == null)
                return new CarrierRegisterResponse { Success = false, Message = "Geçersiz kayıt token'ı." };

            if (tokenEntity.IsUsed)
                return new CarrierRegisterResponse { Success = false, Message = "Bu token daha önce kullanılmış." };

            if (tokenEntity.ExpiresAt < DateTime.UtcNow)
                return new CarrierRegisterResponse { Success = false, Message = "Token süresi dolmuş." };

            if (tokenEntity.Email.ToLower() != req.Email.ToLower())
                return new CarrierRegisterResponse { Success = false, Message = "Email adresi token ile eşleşmiyor." };

            // Check if carrier already exists
            var existingCarrier = await _db.Carriers.FirstOrDefaultAsync(c => c.Email == req.Email);
            if (existingCarrier != null)
                return new CarrierRegisterResponse { Success = false, Message = "Bu email adresi zaten kayıtlı." };

            // Create new carrier
            var carrier = new Carrier
            {
                Email = req.Email,
                PasswordHash = HashPassword(req.Password),
                FirstName = req.FirstName,
                LastName = req.LastName,
                PhoneNumber = req.PhoneNumber,
                CompanyName = req.CompanyName,
                VehicleInfo = req.VehicleInfo,
                Status = CarrierStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            _db.Carriers.Add(carrier);

            // Mark token as used
            tokenEntity.IsUsed = true;
            tokenEntity.UsedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return new CarrierRegisterResponse { Success = true, Message = "Kayıt başarılı." };
        }

        /// <summary>
        /// Get carrier profile by ID
        /// </summary>
        public async Task<CarrierUserResponse?> GetCarrierProfileAsync(int carrierId)
        {
            var carrier = await _db.Carriers.FindAsync(carrierId);
            if (carrier == null)
                return null;

            return new CarrierUserResponse
            {
                Id = carrier.Id,
                Email = carrier.Email,
                FirstName = carrier.FirstName,
                LastName = carrier.LastName,
                PhoneNumber = carrier.PhoneNumber,
                CompanyName = carrier.CompanyName,
                VehicleInfo = carrier.VehicleInfo,
                Status = carrier.Status.ToString()
            };
        }

        /// <summary>
        /// Create a registration token (called by admin)
        /// </summary>
        public async Task<CarrierTokenResponse> CreateRegistrationTokenAsync(CreateCarrierTokenRequest req, int adminId)
        {
            // Check if email already has an active unused token
            var existingToken = await _db.CarrierRegistrationTokens
                .Where(t => t.Email == req.Email && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
                .FirstOrDefaultAsync();

            if (existingToken != null)
            {
                // Return existing token
                var baseUrl = _config["CargoApp:BaseUrl"] ?? "http://localhost:3002";
                return new CarrierTokenResponse
                {
                    Token = existingToken.Token,
                    Email = existingToken.Email,
                    RegistrationLink = $"{baseUrl}/register?token={existingToken.Token}",
                    ExpiresAt = existingToken.ExpiresAt
                };
            }

            // Create new token
            var token = Guid.NewGuid().ToString();
            var expiresAt = DateTime.UtcNow.AddDays(req.ExpiresInDays);

            var tokenEntity = new CarrierRegistrationToken
            {
                Token = token,
                Email = req.Email,
                CreatedById = adminId,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = expiresAt,
                IsUsed = false
            };

            _db.CarrierRegistrationTokens.Add(tokenEntity);
            await _db.SaveChangesAsync();

            var cargoBaseUrl = _config["CargoApp:BaseUrl"] ?? "http://localhost:3002";
            return new CarrierTokenResponse
            {
                Token = token,
                Email = req.Email,
                RegistrationLink = $"{cargoBaseUrl}/register?token={token}",
                ExpiresAt = expiresAt
            };
        }

        /// <summary>
        /// Validate a registration token
        /// </summary>
        public async Task<ValidateTokenResponse> ValidateTokenAsync(string token)
        {
            var tokenEntity = await _db.CarrierRegistrationTokens
                .FirstOrDefaultAsync(t => t.Token == token);

            if (tokenEntity == null)
                return new ValidateTokenResponse { IsValid = false, ErrorMessage = "Token bulunamadı." };

            if (tokenEntity.IsUsed)
                return new ValidateTokenResponse { IsValid = false, ErrorMessage = "Token daha önce kullanılmış." };

            if (tokenEntity.ExpiresAt < DateTime.UtcNow)
                return new ValidateTokenResponse { IsValid = false, ErrorMessage = "Token süresi dolmuş." };

            return new ValidateTokenResponse
            {
                IsValid = true,
                Email = tokenEntity.Email
            };
        }

        // --- HELPER METHODS ---
        private string GenerateJwtToken(Carrier carrier)
        {
            var key = _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new System.Security.Claims.Claim("id", carrier.Id.ToString()),
                new System.Security.Claims.Claim("email", carrier.Email),
                new System.Security.Claims.Claim("role", "Carrier")
            };

            var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
                issuer: "PharmaDeskApi",
                audience: "PharmaDeskClient",
                claims: claims,
                expires: DateTime.UtcNow.AddDays(30),
                signingCredentials: credentials
            );

            return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
        }

        private static string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        private static bool VerifyPassword(string password, string hash)
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
    }
}
