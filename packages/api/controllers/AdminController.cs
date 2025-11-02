using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        [HttpGet("ping")]
        [Authorize(Roles = "Admin")]
        public IActionResult Ping() => Ok(new { ok = true, role = "Admin" });
    }
}
