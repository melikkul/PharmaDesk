using Backend.Dtos;
using Backend.Services;
using Backend.Data; // 🆕 Added for AppDbContext
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly IConfiguration _configuration;
        private readonly Backend.Data.AppDbContext _appDb;

        public AuthController(AuthService authService, IConfiguration configuration, Backend.Data.AppDbContext appDb)
        {
            _authService = authService;
            _configuration = configuration;
            _appDb = appDb;
        }

        /// <summary>
        /// Get current user profile from JWT cookie
        /// Frontend calls this after login to populate user state
        /// </summary>
        [HttpGet("me")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public IActionResult GetCurrentUser()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var name = User.FindFirst(ClaimTypes.Name)?.Value;
            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            var pharmacyId = User.FindFirst("PharmacyId")?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "Kullanıcı bilgisi bulunamadı." });
            }

            string pharmacyName = "";
            string userAvatar = "";
            string address = "";
            string city = "";
            string district = "";

            // Check if PharmacyProfile exists in database
            if (!string.IsNullOrEmpty(pharmacyId) && long.TryParse(pharmacyId, out long pId))
            {
                var profile = _appDb.PharmacyProfiles.Find(pId);
                if (profile != null)
                {
                    pharmacyName = profile.PharmacyName;
                    address = profile.Address ?? "";
                    city = profile.City ?? "";
                    district = profile.District ?? "";
                    // userAvatar = profile.LogoUrl; // Future improvement
                }
                else
                {
                    // 🆕 PharmacyProfile doesn't exist - likely stale JWT from old database
                    // Return 401 to force re-authentication
                    return Unauthorized(new { 
                        error = "Oturum geçersiz. Lütfen tekrar giriş yapın.",
                        code = "PROFILE_NOT_FOUND"
                    });
                }
            }

            return Ok(new
            {
                id = userId,
                role = role ?? "Pharmacy",
                name = name ?? "", // Keep for backward compatibility
                fullName = name ?? "", // 🆕 Match frontend interface
                email = email ?? "",
                pharmacyId = pharmacyId,
                pharmacyName = pharmacyName, // 🆕 Return real pharmacy name
                address = address, // 🆕 For cart address pre-fill
                city = city, // 🆕 For cart address pre-fill
                district = district // 🆕 For cart address pre-fill
            });
        }

        /// <summary>
        /// User registration - sets HttpOnly cookie on success
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { error = "Eksik veya hatalı veri." });
            }

            try
            {
                var response = await _authService.RegisterAsync(req);
                if (response == null)
                {
                    return BadRequest(new { error = "Bu e-posta adresi veya GLN numarası zaten kayıtlı." });
                }

                // 🆕 Set JWT as HttpOnly cookie
                SetAuthCookie(response.Token);

                // Return user info without token in body (token is in cookie)
                return Ok(new
                {
                    user = response.User,
                    message = "Kayıt başarılı."
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "Kayıt işlemi sırasında bir hata oluştu." });
            }
        }

        /// <summary>
        /// User login - sets HttpOnly cookie on success
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            try
            {
                var result = await _authService.LoginAsync(req);

                if (result == null)
                {
                    return Unauthorized(new { error = "E-posta adresi veya şifre hatalı." });
                }

                // 🆕 Set JWT as HttpOnly cookie
                SetAuthCookie(result.Token);

                // Return user info without token in body (token is in cookie)
                // Also return token for backward compatibility during transition
                return Ok(new
                {
                    user = result.User,
                    token = result.Token, // Keep for backward compatibility, remove after frontend update
                    message = "Giriş başarılı."
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "Giriş işlemi sırasında bir hata oluştu." });
            }
        }

        /// <summary>
        /// Logout - clears auth cookie
        /// </summary>
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            // 🆕 Clear the auth cookie
            Response.Cookies.Delete("token", new CookieOptions
            {
                Path = "/",
                Domain = GetCookieDomain(),
                Secure = !IsDevelopment(),
                SameSite = SameSiteMode.Strict
            });

            return Ok(new { message = "Çıkış yapıldı." });
        }

        [HttpPost("complete-onboarding")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> CompleteOnboarding()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var success = await _authService.CompleteOnboardingAsync(userId);
            if (!success) return BadRequest("User not found or error updating.");

            return Ok(new { message = "Onboarding completed." });
        }

        [HttpPost("forgot")]
        public IActionResult Forgot([FromBody] ForgotRequest req)
        {
            return Ok(new { message = "Not implemented for debug" });
        }

        [HttpPost("reset")]
        public IActionResult Reset([FromBody] ResetRequest req)
        {
            return Ok(new { message = "Not implemented for debug" });
        }

        // ═══════════════════════════════════════════════════════════════
        // Private Helpers
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Sets JWT token as HttpOnly, Secure, SameSite=Strict cookie
        /// </summary>
        private void SetAuthCookie(string token)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,                    // 🔒 JavaScript cannot access
                Secure = !IsDevelopment(),          // 🔒 HTTPS only in production
                SameSite = SameSiteMode.Strict,     // 🔒 Prevent CSRF
                Path = "/",
                Domain = GetCookieDomain(),
                Expires = DateTimeOffset.UtcNow.AddDays(7), // Match JWT expiry
                IsEssential = true
            };

            Response.Cookies.Append("token", token, cookieOptions);
        }

        private bool IsDevelopment()
        {
            var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            return env == "Development";
        }

        private string? GetCookieDomain()
        {
            // In development, don't set domain (localhost doesn't need it)
            if (IsDevelopment()) return null;

            // In production, set to your domain
            return _configuration["CookieDomain"]; // e.g., ".pharmadesk.com"
        }
    }
}