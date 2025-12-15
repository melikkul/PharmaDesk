using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LocationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<LocationsController> _logger;
        private readonly IMemoryCache _cache;

        private const string CitiesCacheKey = "cities_list";
        private static readonly TimeSpan LocationCacheDuration = TimeSpan.FromHours(24);

        public LocationsController(
            AppDbContext context, 
            ILogger<LocationsController> logger,
            IMemoryCache cache)
        {
            _context = context;
            _logger = logger;
            _cache = cache;
        }

        /// <summary>
        /// Get all cities ordered by name (cached for 24 hours)
        /// </summary>
        [HttpGet("cities")]
        public async Task<IActionResult> GetCities()
        {
            try
            {
                // Try to get from cache first
                if (_cache.TryGetValue(CitiesCacheKey, out object? cachedCities) && cachedCities != null)
                {
                    return Ok(cachedCities);
                }

                var cities = await _context.Cities
                    .OrderBy(c => c.Name)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.PlateCode
                    })
                    .ToListAsync();

                // Cache for 24 hours
                _cache.Set(CitiesCacheKey, cities, LocationCacheDuration);

                return Ok(cities);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching cities");
                return StatusCode(500, new { error = "Failed to fetch cities" });
            }
        }

        /// <summary>
        /// Get districts for a specific city (cached for 24 hours per city)
        /// </summary>
        [HttpGet("districts/{cityId}")]
        public async Task<IActionResult> GetDistricts(int cityId)
        {
            try
            {
                var cacheKey = $"districts_{cityId}";

                // Try to get from cache first
                if (_cache.TryGetValue(cacheKey, out object? cachedDistricts) && cachedDistricts != null)
                {
                    return Ok(cachedDistricts);
                }

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

                // Cache for 24 hours per city
                _cache.Set(cacheKey, districts, LocationCacheDuration);

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
