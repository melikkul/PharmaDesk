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
        /// Get statistics for members of user's groups
        /// </summary>
        [HttpGet("my-groups/statistics")]
        [Authorize]
        public async Task<ActionResult<List<PharmaDesk.Application.DTOs.GroupMemberStatisticsDto>>> GetMyGroupStatistics(
            [FromQuery] string? pharmacyName,
            [FromQuery] string? district,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            if (!long.TryParse(pharmacyIdClaim, out long pharmacyId))
                return Unauthorized(new { message = "Pharmacy not found" });

            // Default to last 24 hours if no date range provided
            if (!startDate.HasValue && !endDate.HasValue)
            {
                endDate = DateTime.UtcNow;
                startDate = endDate.Value.AddDays(-1);
            }

            // Get user's groups
            var userGroups = await _context.PharmacyGroups
                .Where(pg => pg.PharmacyProfileId == pharmacyId && pg.IsActive)
                .Select(pg => pg.GroupId)
                .ToListAsync();

            if (!userGroups.Any())
                return Ok(new List<PharmaDesk.Application.DTOs.GroupMemberStatisticsDto>());

            // Get all group members
            var groupMembers = await _context.PharmacyGroups
                .Where(pg => userGroups.Contains(pg.GroupId) && pg.IsActive)
                .Include(pg => pg.PharmacyProfile)
                .Include(pg => pg.Group)
                .Select(pg => new
                {
                    PharmacyId = pg.PharmacyProfileId,
                    pg.PharmacyProfile.PharmacyName,
                    pg.PharmacyProfile.District,
                    pg.PharmacyProfile.Balance,
                    GroupName = pg.Group.Name
                })
                .ToListAsync();

            // Apply filters
            var filteredMembers = groupMembers.AsEnumerable();

            if (!string.IsNullOrEmpty(pharmacyName))
                filteredMembers = filteredMembers.Where(m => m.PharmacyName.Contains(pharmacyName, StringComparison.OrdinalIgnoreCase));

            if (!string.IsNullOrEmpty(district))
                filteredMembers = filteredMembers.Where(m => m.District != null && m.District.Equals(district, StringComparison.OrdinalIgnoreCase));

            // Calculate statistics for each member
            var statistics = new List<PharmaDesk.Application.DTOs.GroupMemberStatisticsDto>();

            foreach (var member in filteredMembers)
            {
                // Get orders (purchases) count and amount
                var orders = await _context.Orders
                    .Where(o => o.BuyerPharmacyId == member.PharmacyId
                             && o.CreatedAt >= startDate
                             && o.CreatedAt <= endDate)
                    .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Medication)
                    .ToListAsync();

                var purchaseCount = orders.Count;
                var purchaseAmount = orders.Sum(o => o.TotalAmount);

                // Calculate system earnings based on MF profit
                decimal systemEarnings = 0;
                foreach (var order in orders)
                {
                    foreach (var item in order.OrderItems)
                    {
                        // Find the original offer for this order item to get DepotPrice and NetPrice
                        var offer = await _context.Offers
                            .Where(o => o.MedicationId == item.MedicationId
                                     && o.PharmacyProfileId == order.SellerPharmacyId)
                            .OrderByDescending(o => o.CreatedAt)
                            .FirstOrDefaultAsync();

                        if (offer != null && offer.DepotPrice > 0 && offer.NetPrice > 0)
                        {
                            // System earnings = (Depot Price - MF Net Price) × Quantity
                            // This represents the actual profit/savings from MF discount
                            var profitPerUnit = offer.DepotPrice - offer.NetPrice;
                            systemEarnings += profitPerUnit * item.Quantity;
                        }
                    }
                }

                // Get offers count
                var offerCount = await _context.Offers
                    .Where(o => o.PharmacyProfileId == member.PharmacyId
                             && o.CreatedAt >= startDate
                             && o.CreatedAt <= endDate)
                    .CountAsync();

                // Get shipments count (no total amount in Shipment entity)
                var shipmentCount = await _context.Shipments
                    .Where(s => s.SenderPharmacyId == member.PharmacyId
                             && s.CreatedAt >= startDate
                             && s.CreatedAt <= endDate)
                    .CountAsync();

                // Calculate derived metrics
                var groupContribution = purchaseAmount * 0.02m; // 2% to group
                var groupLoad = offerCount + shipmentCount;

                statistics.Add(new PharmaDesk.Application.DTOs.GroupMemberStatisticsDto
                {
                    GroupName =member.GroupName,
                    District = member.District ?? "N/A",
                    PharmacyName = member.PharmacyName,
                    Balance = member.Balance,
                    GroupLoad = groupLoad,
                    PurchaseCount = purchaseCount,
                    PurchaseAmount = purchaseAmount,
                    SystemEarnings = systemEarnings,
                    OfferCount = offerCount,
                    ShipmentCount = shipmentCount,
                    ShipmentAmount = 0, // Shipment doesn't have amount field
                    GroupContribution = groupContribution
                });
            }

            return Ok(statistics);
        }

        /// <summary>
        /// Get user's groups
        /// </summary>
        [HttpGet("my-groups")]
        [Authorize]
        public async Task<ActionResult<List<PharmaDesk.Application.DTOs.GroupDto>>> GetMyGroups()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            if (!long.TryParse(pharmacyIdClaim, out long pharmacyId))
                return Unauthorized(new { message = "Pharmacy not found" });

            var groups = await _context.PharmacyGroups
                .Where(pg => pg.PharmacyProfileId == pharmacyId && pg.IsActive)
                .Include(pg => pg.Group)
                    .ThenInclude(g => g.City)
                .Select(pg => new PharmaDesk.Application.DTOs.GroupDto
                {
                    Id = pg.Group.Id,
                    Name = pg.Group.Name,
                    Description = pg.Group.Description,
                    CityId = pg.Group.CityId,
                    CityName = pg.Group.City.Name
                })
                .ToListAsync();

            return Ok(groups);
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
