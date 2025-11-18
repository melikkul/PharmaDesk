using Backend.Dtos;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

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
            try
            {
                var token = await _authService.RegisterAsync(req);
                return Ok(new { Token = token });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            try
            {
                var token = await _authService.LoginAsync(req);
                return Ok(new { Token = token });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("forgot")]
        public async Task<IActionResult> Forgot([FromBody] ForgotRequest req)
        {
            var token = await _authService.GeneratePasswordResetTokenAsync(req.Email);
            if (token == null) return NotFound(new { error = "Kullanıcı bulunamadı." });

            var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
            if (env.Equals("Development", StringComparison.OrdinalIgnoreCase))
                return Ok(new { token });

            return NoContent();
        }

        [HttpPost("reset")]
        public async Task<IActionResult> Reset([FromBody] ResetRequest req)
        {
            var ok = await _authService.ResetPasswordWithTokenAsync(req.Token, req.NewPassword);
            if (!ok) return BadRequest(new { error = "Token geçersiz veya süresi dolmuş." });
            return NoContent();
        }
    }
}