using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PharmaDesk.API.Hubs;
using PharmaDesk.Infrastructure.Persistence;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GroupsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IdentityDbContext _identityDb;
        private readonly ILogger<GroupsController> _logger;
        private readonly IHubContext<NotificationHub> _hubContext;

        public GroupsController(AppDbContext context, IdentityDbContext identityDb, ILogger<GroupsController> logger, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _identityDb = identityDb;
            _logger = logger;
            _hubContext = hubContext;
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

                // 🆕 Toplam kar: Order itemlardan ProfitAmount toplamı
                var totalProfit = orders.SelectMany(o => o.OrderItems).Sum(oi => oi.ProfitAmount);

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
                    GroupName = member.GroupName,
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
                    GroupContribution = groupContribution,
                    TotalProfit = totalProfit // 🆕 Toplam kar
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
        [Authorize(Roles = "Admin,SuperAdmin")]
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

        // ═══════════════════════════════════════════════════════════════
        // SaaS Admin Endpoints
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Update group pricing settings (Admin only)
        /// </summary>
        [HttpPut("{id}/pricing")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> UpdateGroupPricing(int id, [FromBody] PharmaDesk.Application.DTOs.GroupPricingDto dto)
        {
            try
            {
                var group = await _context.Groups.FindAsync(id);
                if (group == null)
                {
                    return NotFound(new { error = "Group not found" });
                }

                group.CustomSubscriptionPrice = dto.CustomSubscriptionPrice;
                group.HasCargoService = dto.HasCargoService;
                group.CargoPrice = dto.CargoPrice ?? 2450; // 🆕 Save cargo price

                await _context.SaveChangesAsync();

                // 🆕 SignalR: Notify all group members about pricing change
                var memberPharmacyIds = await _context.PharmacyGroups
                    .Where(pg => pg.GroupId == id && pg.IsActive)
                    .Select(pg => pg.PharmacyProfileId)
                    .ToListAsync();

                foreach (var pharmacyId in memberPharmacyIds)
                {
                    await _hubContext.Clients.Group($"pharmacy_{pharmacyId}")
                        .SendAsync("SubscriptionUpdated", new { pharmacyId, type = "groupPricing" });
                }

                _logger.LogInformation(
                    "Group {GroupId} pricing updated. CustomPrice: {CustomPrice}, HasCargo: {HasCargo}, CargoPrice: {CargoPrice}. Notified {MemberCount} members.",
                    id, dto.CustomSubscriptionPrice, dto.HasCargoService, group.CargoPrice, memberPharmacyIds.Count);

                return Ok(new
                {
                    message = "Grup fiyatlandırması güncellendi",
                    groupId = id,
                    customSubscriptionPrice = group.CustomSubscriptionPrice,
                    hasCargoService = group.HasCargoService
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating group pricing");
                return StatusCode(500, new { error = "Failed to update group pricing" });
            }
        }

        /// <summary>
        /// Get group financial summary with member details (Admin only)
        /// </summary>
        [HttpGet("{id}/financial")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<PharmaDesk.Application.DTOs.GroupFinancialSummaryDto>> GetGroupFinancial(int id)
        {
            try
            {
                var group = await _context.Groups
                    .Include(g => g.City)
                    .Include(g => g.PharmacyGroups)
                        .ThenInclude(pg => pg.PharmacyProfile)
                    .FirstOrDefaultAsync(g => g.Id == id);

                if (group == null)
                {
                    return NotFound(new { error = "Group not found" });
                }

                var members = new List<PharmaDesk.Application.DTOs.GroupMemberFinancialDto>();
                var now = DateTime.UtcNow;

                foreach (var pg in group.PharmacyGroups.Where(pg => pg.IsActive))
                {
                    var profile = pg.PharmacyProfile;
                    
                    // Get user status from IdentityDbContext
                    var user = await _identityDb.IdentityUsers
                        .FirstOrDefaultAsync(u => u.PharmacyId == profile.Id);

                    // Calculate days remaining
                    int? daysRemaining = null;
                    if (profile.SubscriptionExpireDate.HasValue && profile.SubscriptionExpireDate > now)
                    {
                        daysRemaining = (int)(profile.SubscriptionExpireDate.Value - now).TotalDays;
                    }

                    // Get subscription start date from first payment or profile creation
                    var firstSubscription = await _context.Subscriptions
                        .Where(s => s.PharmacyProfileId == profile.Id)
                        .OrderBy(s => s.StartDate)
                        .FirstOrDefaultAsync();
                    var subscriptionStartDate = firstSubscription?.StartDate ?? profile.CreatedAt;

                    // Get transaction totals for profit calculation
                    var salesTransactions = await _context.Transactions
                        .Where(t => t.PharmacyProfileId == profile.Id && !t.IsDeleted && t.Type == Backend.Models.TransactionType.Sale)
                        .ToListAsync();

                    var purchaseTransactions = await _context.Transactions
                        .Where(t => t.PharmacyProfileId == profile.Id && !t.IsDeleted && t.Type == Backend.Models.TransactionType.Purchase)
                        .ToListAsync();

                    var totalSales = salesTransactions.Sum(t => t.Amount);
                    var salesCount = salesTransactions.Count;

                    var totalPurchases = purchaseTransactions.Sum(t => t.Amount);
                    var purchasesCount = purchaseTransactions.Count;

                    var estimatedProfit = totalSales - totalPurchases;
                    var totalCount = salesCount + purchasesCount;
                    var averageProfitPerUnit = totalCount > 0 ? estimatedProfit / totalCount : 0;

                    // 🆕 Calculate subscription months
                    int subscriptionMonths = 0;
                    if (subscriptionStartDate != null)
                    {
                        subscriptionMonths = (int)Math.Floor((now - subscriptionStartDate).TotalDays / 30);
                        if (subscriptionMonths < 0) subscriptionMonths = 0;
                    }

                    // 🆕 Get payment status from last payment
                    var lastPayment = await _context.SubscriptionPaymentHistories
                        .Where(p => p.PharmacyProfileId == profile.Id)
                        .OrderByDescending(p => p.PaymentDate)
                        .FirstOrDefaultAsync();
                    
                    var paymentStatus = lastPayment?.Status == Backend.Models.SubscriptionPaymentStatus.Completed 
                        ? "Ödendi" 
                        : profile.SubscriptionStatus == Backend.Models.SubscriptionStatus.Active ? "Aktif" : "Beklemede";

                    members.Add(new PharmaDesk.Application.DTOs.GroupMemberFinancialDto
                    {
                        PharmacyId = profile.Id,
                        PharmacyName = profile.PharmacyName,
                        OwnerName = user != null ? $"{user.FirstName} {user.LastName}" : null,
                        IsActive = user?.Status != Backend.Models.UserStatus.Suspended,
                        SubscriptionStatus = profile.SubscriptionStatus.ToString(),
                        SubscriptionStartDate = subscriptionStartDate,
                        SubscriptionExpireDate = profile.SubscriptionExpireDate,
                        DaysRemaining = daysRemaining,
                        VirtualBalance = profile.Balance,
                        BalanceLimit = profile.BalanceLimit,
                        TotalSales = totalSales,
                        SalesCount = salesCount,
                        TotalPurchases = totalPurchases,
                        PurchasesCount = purchasesCount,
                        EstimatedProfit = estimatedProfit,
                        DiscountPercent = profile.DiscountPercent,
                        DiscountAmount = profile.DiscountAmount,
                        // 🆕 New fields
                        SubscriptionMonths = subscriptionMonths,
                        PaymentStatus = paymentStatus
                    });
                }

                var activeSubscriptions = members.Count(m => m.SubscriptionStatus == "Active");

                // 🆕 Calculate total confirmed payments for this group
                var memberPharmacyIds = members.Select(m => m.PharmacyId).ToList();
                var totalConfirmedPayments = await _context.SubscriptionPaymentHistories
                    .Where(p => memberPharmacyIds.Contains(p.PharmacyProfileId) 
                             && p.Status == Backend.Models.SubscriptionPaymentStatus.Completed)
                    .SumAsync(p => p.Amount);

                var result = new PharmaDesk.Application.DTOs.GroupFinancialSummaryDto
                {
                    GroupId = group.Id,
                    GroupName = group.Name,
                    CityName = group.City.Name,
                    TotalMembers = members.Count,
                    ActiveSubscriptions = activeSubscriptions,
                    HasCustomPrice = group.CustomSubscriptionPrice.HasValue,
                    CustomPrice = group.CustomSubscriptionPrice,
                    HasCargoService = group.HasCargoService,
                    CargoPrice = group.CargoPrice,
                    TotalConfirmedPayments = totalConfirmedPayments, // 🆕
                    Members = members
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting group financial data");
                return StatusCode(500, new { error = "Failed to get group financial data" });
            }
        }

        /// <summary>
        /// Get all groups with SaaS info (Admin only)
        /// </summary>
        [HttpGet("admin/all")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetAllGroupsAdmin()
        {
            try
            {
                var groups = await _context.Groups
                    .Include(g => g.City)
                    .Include(g => g.PharmacyGroups)
                        .ThenInclude(pg => pg.PharmacyProfile)
                    .Select(g => new
                    {
                        g.Id,
                        g.Name,
                        g.Description,
                        CityName = g.City.Name,
                        MemberCount = g.PharmacyGroups.Count(pg => pg.IsActive),
                        ActiveSubscriptions = g.PharmacyGroups
                            .Count(pg => pg.IsActive && 
                                   pg.PharmacyProfile.SubscriptionStatus == Backend.Models.SubscriptionStatus.Active),
                        HasCustomPrice = g.CustomSubscriptionPrice != null,
                        CustomPrice = g.CustomSubscriptionPrice,
                        g.HasCargoService
                    })
                    .ToListAsync();

                return Ok(groups);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching admin groups");
                return StatusCode(500, new { error = "Failed to fetch groups" });
            }
        }

        /// <summary>
        /// Manage user subscription (Admin only) - extend days, change status
        /// </summary>
        [HttpPut("admin/subscription/{pharmacyId}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> ManageUserSubscription(long pharmacyId, [FromBody] AdminSubscriptionUpdateDto dto)
        {
            try
            {
                var profile = await _context.PharmacyProfiles.FindAsync(pharmacyId);
                if (profile == null)
                {
                    return NotFound(new { error = "Pharmacy not found" });
                }

                var now = DateTime.UtcNow;

                switch (dto.Action)
                {
                    case "extend_days":
                        // Add days to subscription
                        var currentExpire = profile.SubscriptionExpireDate ?? now;
                        if (currentExpire < now) currentExpire = now;
                        profile.SubscriptionExpireDate = currentExpire.AddDays(dto.Days ?? 30);
                        profile.SubscriptionStatus = Backend.Models.SubscriptionStatus.Active;
                        break;

                    case "set_status":
                        // Set subscription status manually
                        if (Enum.TryParse<Backend.Models.SubscriptionStatus>(dto.Status, out var status))
                        {
                            profile.SubscriptionStatus = status;
                        }
                        break;

                    case "reset":
                        // Reset to trial
                        profile.SubscriptionStatus = Backend.Models.SubscriptionStatus.Trial;
                        profile.SubscriptionExpireDate = now.AddDays(14);
                        break;

                    case "cancel":
                        // Cancel subscription
                        profile.SubscriptionStatus = Backend.Models.SubscriptionStatus.Cancelled;
                        // 🆕 Set expire date to now so remaining days shows as 0
                        profile.SubscriptionExpireDate = now;
                        
                        // 🆕 Auto-hide all active offers when subscription is cancelled
                        var activeOffers = await _context.Offers
                            .Where(o => o.PharmacyProfileId == pharmacyId && o.Status == Backend.Models.OfferStatus.Active)
                            .ToListAsync();
                        
                        foreach (var offer in activeOffers)
                        {
                            offer.Status = Backend.Models.OfferStatus.Passive;
                        }
                        
                        _logger.LogInformation(
                            "Auto-hid {OfferCount} active offers for pharmacy {PharmacyId} due to subscription cancellation",
                            activeOffers.Count, pharmacyId);
                        break;

                    default:
                        return BadRequest(new { error = "Invalid action" });
                }

                await _context.SaveChangesAsync();

                // 🆕 Send real-time notification via SignalR
                await _hubContext.Clients.Group($"pharmacy_{pharmacyId}")
                    .SendAsync("SubscriptionStatusChanged", new
                    {
                        status = profile.SubscriptionStatus.ToString(),
                        expireDate = profile.SubscriptionExpireDate?.ToString("o")
                    });

                _logger.LogInformation(
                    "Admin updated subscription for pharmacy {PharmacyId}. Action: {Action}. SignalR notification sent.",
                    pharmacyId, dto.Action);

                return Ok(new
                {
                    message = "Abonelik güncellendi",
                    pharmacyId,
                    subscriptionStatus = profile.SubscriptionStatus.ToString(),
                    subscriptionExpireDate = profile.SubscriptionExpireDate
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error managing subscription for pharmacy {PharmacyId}", pharmacyId);
                return StatusCode(500, new { error = "Failed to update subscription" });
            }
        }

        /// <summary>
        /// 🆕 Update member discount (Admin only)
        /// </summary>
        [HttpPut("admin/member-discount/{pharmacyId}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> UpdateMemberDiscount(long pharmacyId, [FromBody] MemberDiscountUpdateDto dto)
        {
            try
            {
                var profile = await _context.PharmacyProfiles.FindAsync(pharmacyId);
                if (profile == null)
                {
                    return NotFound(new { error = "Pharmacy not found" });
                }

                // Clear both first
                profile.DiscountPercent = null;
                profile.DiscountAmount = null;

                // Set based on type
                if (dto.DiscountValue > 0)
                {
                    if (dto.DiscountType == "percent")
                    {
                        profile.DiscountPercent = dto.DiscountValue;
                    }
                    else
                    {
                        profile.DiscountAmount = dto.DiscountValue;
                    }
                }

                await _context.SaveChangesAsync();

                // 🆕 SignalR notification
                await _hubContext.Clients.Group($"pharmacy_{pharmacyId}")
                    .SendAsync("SubscriptionUpdated", new { pharmacyId, type = "discount" });

                _logger.LogInformation(
                    "Member {PharmacyId} discount updated. Type: {Type}, Value: {Value}. SignalR sent.",
                    pharmacyId, dto.DiscountType, dto.DiscountValue);

                return Ok(new
                {
                    message = "İndirim güncellendi",
                    pharmacyId,
                    discountType = dto.DiscountType,
                    discountValue = dto.DiscountValue
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating member discount for pharmacy {PharmacyId}", pharmacyId);
                return StatusCode(500, new { error = "Failed to update member discount" });
            }
        }

        /// <summary>
        /// 🆕 Add balance to pharmacy (Admin only)
        /// </summary>
        [HttpPost("admin/add-balance/{pharmacyId}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> AddBalance(long pharmacyId, [FromBody] AddBalanceDto dto)
        {
            try
            {
                var profile = await _context.PharmacyProfiles.FindAsync(pharmacyId);
                if (profile == null)
                {
                    return NotFound(new { error = "Pharmacy not found" });
                }

                profile.Balance += dto.Amount;

                await _context.SaveChangesAsync();

                // 🆕 SignalR notification
                await _hubContext.Clients.Group($"pharmacy_{pharmacyId}")
                    .SendAsync("SubscriptionUpdated", new { pharmacyId, type = "balance" });

                _logger.LogInformation(
                    "Added {Amount} balance to pharmacy {PharmacyId}. New balance: {NewBalance}. SignalR sent.",
                    dto.Amount, pharmacyId, profile.Balance);

                return Ok(new
                {
                    message = "Bakiye eklendi",
                    pharmacyId,
                    addedAmount = dto.Amount,
                    newBalance = profile.Balance
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding balance for pharmacy {PharmacyId}", pharmacyId);
                return StatusCode(500, new { error = "Failed to add balance" });
            }
        }

        /// <summary>
        /// 🆕 Update balance limit for pharmacy (Admin only)
        /// </summary>
        [HttpPut("admin/balance-limit/{pharmacyId}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> UpdateBalanceLimit(long pharmacyId, [FromBody] UpdateBalanceLimitDto dto)
        {
            try
            {
                var profile = await _context.PharmacyProfiles.FindAsync(pharmacyId);
                if (profile == null)
                {
                    return NotFound(new { error = "Pharmacy not found" });
                }

                profile.BalanceLimit = dto.BalanceLimit;

                await _context.SaveChangesAsync();

                // 🆕 SignalR notification
                await _hubContext.Clients.Group($"pharmacy_{pharmacyId}")
                    .SendAsync("SubscriptionUpdated", new { pharmacyId, type = "balanceLimit" });

                _logger.LogInformation(
                    "Updated balance limit to {Limit} for pharmacy {PharmacyId}. SignalR sent.",
                    dto.BalanceLimit, pharmacyId);

                return Ok(new
                {
                    message = "Bakiye limiti güncellendi",
                    pharmacyId,
                    balanceLimit = profile.BalanceLimit
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating balance limit for pharmacy {PharmacyId}", pharmacyId);
                return StatusCode(500, new { error = "Failed to update balance limit" });
            }
        }
    }

    public class CreateGroupDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int CityId { get; set; }
    }

    public class AdminSubscriptionUpdateDto
    {
        public string Action { get; set; } = string.Empty; // extend_days, set_status, reset, cancel
        public int? Days { get; set; }
        public string? Status { get; set; }
    }

    /// <summary>
    /// 🆕 Üye indirim güncelleme DTO
    /// </summary>
    public class MemberDiscountUpdateDto
    {
        public string DiscountType { get; set; } = "percent"; // "percent" or "amount"
        public decimal DiscountValue { get; set; }
    }

    /// <summary>
    /// 🆕 Bakiye ekleme DTO
    /// </summary>
    public class AddBalanceDto
    {
        public decimal Amount { get; set; }
    }

    /// <summary>
    /// 🆕 Bakiye limiti güncelleme DTO
    /// </summary>
    public class UpdateBalanceLimitDto
    {
        public decimal BalanceLimit { get; set; }
    }
}

