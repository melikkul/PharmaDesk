using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LocationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<LocationsController> _logger;

        public LocationsController(AppDbContext context, ILogger<LocationsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get all cities ordered by name
        /// </summary>
        [HttpGet("cities")]
        public async Task<IActionResult> GetCities()
        {
            try
            {
                var cities = await _context.Cities
                    .OrderBy(c => c.Name)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.PlateCode
                    })
                    .ToListAsync();

                return Ok(cities);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching cities");
                return StatusCode(500, new { error = "Failed to fetch cities" });
            }
        }

        /// <summary>
        /// Get districts for a specific city
        /// </summary>
        [HttpGet("districts/{cityId}")]
        public async Task<IActionResult> GetDistricts(int cityId)
        {
            try
            {
                // Check if city exists
                var cityExists = await _context.Cities.AnyAsync(c => c.Id == cityId);
                if (!cityExists)
                {
                    return NotFound(new { error = "City not found" });
                }

                var districts = await _context.Districts
                    .Where(d => d.CityId == cityId)
                    .OrderBy(d => d.Name)
                    .Select(d => new
                    {
                        d.Id,
                        d.Name
                    })
                    .ToListAsync();

                return Ok(districts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching districts for city {CityId}", cityId);
                return StatusCode(500, new { error = "Failed to fetch districts" });
            }
        }
    }
}
