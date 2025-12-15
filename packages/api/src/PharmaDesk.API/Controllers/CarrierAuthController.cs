using Backend.Dtos;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/carrier")]
    public class CarrierAuthController : ControllerBase
    {
        private readonly CarrierAuthService _carrierAuth;

        public CarrierAuthController(CarrierAuthService carrierAuth)
        {
            _carrierAuth = carrierAuth;
        }

        /// <summary>
        /// Carrier login endpoint
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] CarrierLoginRequest req)
        {
            var response = await _carrierAuth.LoginAsync(req);
            if (response == null)
                return Unauthorized(new { error = "Email veya şifre hatalı." });

            return Ok(new { token = response.Token, user = response.User });
        }

        /// <summary>
        /// Register a new carrier using a token
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] CarrierRegisterRequest req)
        {
            var response = await _carrierAuth.RegisterAsync(req);
            
            if (!response.Success)
                return BadRequest(new { error = response.Message });

            return Ok(new { message = response.Message });
        }

        /// <summary>
        /// Validate a registration token
        /// </summary>
        [HttpGet("validate-token/{token}")]
        public async Task<IActionResult> ValidateToken(string token)
        {
            var response = await _carrierAuth.ValidateTokenAsync(token);
            
            if (!response.IsValid)
                return BadRequest(new { error = response.ErrorMessage });

            return Ok(new { email = response.Email });
        }

        /// <summary>
        /// Get current carrier profile (authenticated)
        /// </summary>
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            
            // Use IsInRole which respects the RoleClaimType mapping in JWT configuration
            if (string.IsNullOrEmpty(userIdClaim) || !User.IsInRole("Carrier"))
                return Unauthorized(new { error = "Geçersiz veya yetkisiz token." });

            if (!int.TryParse(userIdClaim, out int carrierId))
                return BadRequest(new { error = "Geçersiz kullanıcı ID." });

            var profile = await _carrierAuth.GetCarrierProfileAsync(carrierId);
            
            if (profile == null)
                return NotFound(new { error = "Profil bulunamadı." });

            return Ok(profile);
        }
    }
}
