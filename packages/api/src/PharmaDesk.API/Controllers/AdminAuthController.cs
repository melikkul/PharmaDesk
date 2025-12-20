using Backend.Dtos;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminAuthController : ControllerBase
    {
        private readonly AuthService _auth;
        private readonly IConfiguration _configuration;

        public AdminAuthController(AuthService auth, IConfiguration configuration)
        {
            _auth = auth;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> AdminLogin([FromBody] LoginRequest req)
        {
            try
            {
                var ipAddress = GetIpAddress();
                var response = await _auth.LoginAsync(req, requiredRole: "Admin", ipAddress: ipAddress);
                if (response == null)
                    return Unauthorized(new { error = "Yetkisiz veya kullanıcı bulunamadı." });

                // Set HttpOnly cookies for admin
                SetAccessTokenCookie(response.AccessToken);
                SetRefreshTokenCookie(response.RefreshToken, req.RememberMe);

                return Ok(new { 
                    accessToken = response.AccessToken, 
                    expiresIn = response.ExpiresIn,
                    user = response.User 
                });
            }
            catch (PendingApprovalException)
            {
                return StatusCode(403, new { 
                    error = "Hesabınız onay bekliyor.",
                    code = "PENDING_APPROVAL"
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "Giriş işlemi sırasında bir hata oluştu." });
            }
        }

        private void SetAccessTokenCookie(string token)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = !IsDevelopment(),
                SameSite = SameSiteMode.Strict,
                Path = "/",
                Domain = GetCookieDomain(),
                Expires = DateTimeOffset.UtcNow.AddMinutes(60),
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

            if (rememberMe)
            {
                cookieOptions.Expires = DateTimeOffset.UtcNow.AddDays(30);
            }

            Response.Cookies.Append("refreshToken", token, cookieOptions);
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

