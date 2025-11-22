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

        public AdminAuthController(AuthService auth) => _auth = auth;

        [HttpPost("login")]
        public async Task<IActionResult> AdminLogin([FromBody] LoginRequest req)
        {
            var response = await _auth.LoginAsync(req, requiredRole: "Admin");
            if (response == null)
                return Unauthorized(new { error = "Yetkisiz veya kullanıcı bulunamadı." });

            return Ok(new { token = response.Token, user = response.User });
        }
    }
}
