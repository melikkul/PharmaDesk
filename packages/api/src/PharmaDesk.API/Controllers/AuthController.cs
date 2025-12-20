using Backend.Dtos;
using Backend.Services;
using Backend.Data;
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
            // 🆕 Subscription fields for frontend access control
            string subscriptionStatus = "Trial";
            DateTime? subscriptionExpireDate = null;

            if (!string.IsNullOrEmpty(pharmacyId) && long.TryParse(pharmacyId, out long pId))
            {
                var profile = _appDb.PharmacyProfiles.Find(pId);
                if (profile != null)
                {
                    pharmacyName = profile.PharmacyName;
                    address = profile.Address ?? "";
                    city = profile.City ?? "";
                    district = profile.District ?? "";
                    // 🆕 Get subscription info from profile
                    subscriptionStatus = profile.SubscriptionStatus.ToString();
                    subscriptionExpireDate = profile.SubscriptionExpireDate;
                }
                else
                {
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
                name = name ?? "",
                fullName = name ?? "",
                email = email ?? "",
                pharmacyId = pharmacyId,
                pharmacyName = pharmacyName,
                address = address,
                city = city,
                district = district,
                // 🆕 Subscription fields
                subscriptionStatus = subscriptionStatus,
                subscriptionExpireDate = subscriptionExpireDate?.ToString("o")
            });
        }

        /// <summary>
        /// User registration - returns pending approval status
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

                // Don't set any cookies - user needs admin approval first
                return Ok(new
                {
                    user = response.User,
                    message = "Kayıt başarılı. Hesabınız yönetici onayına gönderildi. Onaylandıktan sonra giriş yapabilirsiniz.",
                    pendingApproval = true
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "Kayıt işlemi sırasında bir hata oluştu." });
            }
        }

        /// <summary>
        /// User login - sets HttpOnly cookie for refresh token on success
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            try
            {
                var ipAddress = GetIpAddress();
                var result = await _authService.LoginAsync(req, ipAddress: ipAddress);

                if (result == null)
                {
                    return Unauthorized(new { error = "E-posta adresi veya şifre hatalı." });
                }

                // Set refresh token as HttpOnly cookie
                SetRefreshTokenCookie(result.RefreshToken, req.RememberMe);
                
                // Also set access token as HttpOnly cookie for middleware compatibility
                SetAccessTokenCookie(result.AccessToken);

                return Ok(new
                {
                    accessToken = result.AccessToken,
                    expiresIn = result.ExpiresIn,
                    user = result.User,
                    isFirstLogin = result.IsFirstLogin,
                    message = "Giriş başarılı."
                });
            }
            catch (PendingApprovalException)
            {
                return StatusCode(403, new { 
                    error = "Hesabınız oluşturuldu ancak yönetici onayı bekleniyor. Lütfen daha sonra tekrar deneyin.",
                    code = "PENDING_APPROVAL"
                });
            }
            catch (AccountSuspendedException)
            {
                return StatusCode(403, new { 
                    error = "Hesabınız askıya alınmıştır. Daha fazla bilgi için yönetici ile iletişime geçin.",
                    code = "ACCOUNT_SUSPENDED"
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "Giriş işlemi sırasında bir hata oluştu." });
            }
        }

        /// <summary>
        /// Refresh access token using refresh token from cookie
        /// </summary>
        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (string.IsNullOrEmpty(refreshToken))
            {
                return Unauthorized(new { error = "Oturum süresi doldu. Lütfen tekrar giriş yapın." });
            }

            try
            {
                var ipAddress = GetIpAddress();
                var result = await _authService.RefreshTokenAsync(refreshToken, ipAddress);
                
                if (result == null)
                {
                    // Clear invalid cookies
                    ClearAuthCookies();
                    return Unauthorized(new { error = "Geçersiz veya süresi dolmuş oturum." });
                }

                // Update access token cookie
                SetAccessTokenCookie(result.AccessToken);

                return Ok(new
                {
                    accessToken = result.AccessToken,
                    expiresIn = result.ExpiresIn
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "Token yenileme sırasında bir hata oluştu." });
            }
        }

        /// <summary>
        /// Logout - clears auth cookies and revokes refresh token
        /// </summary>
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            
            if (!string.IsNullOrEmpty(refreshToken))
            {
                var ipAddress = GetIpAddress();
                await _authService.RevokeTokenAsync(refreshToken, ipAddress);
            }

            ClearAuthCookies();

            // Force browser to clear all cookies and storage
            Response.Headers.Append("Clear-Site-Data", "\"cookies\", \"storage\"");

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

        private void SetAccessTokenCookie(string token)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = !IsDevelopment(),
                SameSite = SameSiteMode.Strict,
                Path = "/",
                Domain = GetCookieDomain(),
                Expires = DateTimeOffset.UtcNow.AddMinutes(15),
                IsEssential = true
            };

            Response.Cookies.Append("token", token, cookieOptions);
        }

        private void SetRefreshTokenCookie(string token, bool rememberMe)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = !IsDevelopment(),
                SameSite = SameSiteMode.Strict,
                Path = "/",
                Domain = GetCookieDomain(),
                IsEssential = true
            };

            // If RememberMe, set 30-day expiry; otherwise session cookie
            if (rememberMe)
            {
                cookieOptions.Expires = DateTimeOffset.UtcNow.AddDays(30);
            }
            // If not rememberMe, no Expires = session cookie (expires when browser closes)

            Response.Cookies.Append("refreshToken", token, cookieOptions);
        }

        private void ClearAuthCookies()
        {
            var cookieOptions = new CookieOptions
            {
                Path = "/",
                Domain = GetCookieDomain(),
                Secure = !IsDevelopment(),
                SameSite = SameSiteMode.Strict
            };

            Response.Cookies.Delete("token", cookieOptions);
            Response.Cookies.Delete("refreshToken", cookieOptions);
        }

        private bool IsDevelopment()
        {
            var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            return env == "Development";
        }

        private string? GetCookieDomain()
        {
            if (IsDevelopment()) return null;
            return _configuration["CookieDomain"];
        }

        private string? GetIpAddress()
        {
            if (Request.Headers.ContainsKey("X-Forwarded-For"))
            {
                return Request.Headers["X-Forwarded-For"].FirstOrDefault();
            }
            return HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString();
        }
    }
}