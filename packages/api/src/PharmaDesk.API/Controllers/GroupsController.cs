using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GroupsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<GroupsController> _logger;

        public GroupsController(AppDbContext context, ILogger<GroupsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get all groups
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllGroups()
        {
            try
            {
                var groups = await _context.Groups
                    .Include(g => g.City)
                    .Select(g => new
                    {
                        g.Id,
                        g.Name,
                        g.Description,
                        g.CityId,
                        CityName = g.City.Name
                    })
                    .ToListAsync();

                return Ok(groups);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching groups");
                return StatusCode(500, new { error = "Failed to fetch groups" });
            }
        }

        /// <summary>
        /// Get groups for a specific city (for registration)
        /// </summary>
        [HttpGet("by-city/{cityId}")]
        public async Task<IActionResult> GetGroupsByCity(int cityId)
        {
            try
            {
                // Check if city exists
                var cityExists = await _context.Cities.AnyAsync(c => c.Id == cityId);
                if (!cityExists)
                {
                    return NotFound(new { error = "City not found" });
                }

                var groups = await _context.Groups
                    .Where(g => g.CityId == cityId)
                    .OrderBy(g => g.Name)
                    .Select(g => new
                    {
                        g.Id,
                        g.Name,
                        g.Description
                    })
                    .ToListAsync();

                return Ok(groups);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching groups for city {CityId}", cityId);
                return StatusCode(500, new { error = "Failed to fetch groups" });
            }
        }

        /// <summary>
        /// Create a new group (Admin only)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateGroup([FromBody] CreateGroupDto dto)
        {
            try
            {
                // Validate city exists
                var cityExists = await _context.Cities.AnyAsync(c => c.Id == dto.CityId);
                if (!cityExists)
                {
                    return BadRequest(new { error = "Invalid city ID" });
                }

                // Check if group name already exists in this city
                var nameExists = await _context.Groups
                    .AnyAsync(g => g.CityId == dto.CityId && g.Name == dto.Name);
                
                if (nameExists)
                {
                    return BadRequest(new { error = "A group with this name already exists in this city" });
                }

                var group = new Group
                {
                    Name = dto.Name,
                    Description = dto.Description,
                    CityId = dto.CityId
                };

                _context.Groups.Add(group);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Group created: {GroupName} in city {CityId}", dto.Name, dto.CityId);

                return Ok(new
                {
                    message = "Group created successfully",
                    groupId = group.Id,
                    group = new
                    {
                        group.Id,
                        group.Name,
                        group.Description,
                        group.CityId
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating group");
                return StatusCode(500, new { error = "Failed to create group" });
            }
        }
    }

    public class CreateGroupDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int CityId { get; set; }
    }
}
