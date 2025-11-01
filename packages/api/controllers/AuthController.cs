using Backend.DTOs;
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
            var token = await _authService.RegisterAsync(req);
            if (token == null)
                return BadRequest("Bu e-posta zaten kayıtlı.");

            return Ok(new { Token = token });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            var token = await _authService.LoginAsync(req);
            if (token == null)
                return Unauthorized("E-posta veya şifre hatalı.");

            return Ok(new { Token = token });
        }
    }
}
