using Backend.Dtos;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json; // JSON loglama için eklendi

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

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
                    return BadRequest(new { error = "Bu e-posta adresi zaten kayıtlı." });
                }
                
                return Ok(response);
            }
            catch (Exception)
            {
                // Loglama yapılabilir ama kullanıcıya detay dönülmemeli
                return StatusCode(500, new { error = "Kayıt işlemi sırasında bir hata oluştu." });
            }
        }

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

                return Ok(result);
            }
            catch (Exception)
            {
                return StatusCode(500, new { error = "Giriş işlemi sırasında bir hata oluştu." });
            }
        }
        
        // Forgot ve Reset metodları buraya eklenebilir...
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
    }
}