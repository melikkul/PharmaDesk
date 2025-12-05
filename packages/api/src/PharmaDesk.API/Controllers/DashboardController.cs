using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IdentityDbContext _identityContext;

        public DashboardController(AppDbContext context, IdentityDbContext identityContext)
        {
            _context = context;
            _identityContext = identityContext;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var pharmacyId = await GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            // Real data from database
            var totalInventory = await _context.InventoryItems
                .Where(i => i.PharmacyProfileId == pharmacyId)
                .SumAsync(i => i.Quantity);

            var totalMedications = await _context.InventoryItems
                .Where(i => i.PharmacyProfileId == pharmacyId)
                .CountAsync();

            var activeOrders = await _context.Shipments
                .Where(s => (s.SenderPharmacyId == pharmacyId || s.ReceiverPharmacyId == pharmacyId) 
                    && s.Status != Models.ShipmentStatus.Delivered && s.Status != Models.ShipmentStatus.Cancelled)
                .CountAsync();

            var activeOffers = await _context.Offers
                .Where(o => o.PharmacyProfileId == pharmacyId && o.Status == Models.OfferStatus.Active)
                .CountAsync();

            // Offer counts by type
            var standardOffers = await _context.Offers
                .Where(o => o.PharmacyProfileId == pharmacyId && o.Type == Models.OfferType.StockSale)
                .CountAsync();
            
            var campaignOffers = await _context.Offers
                .Where(o => o.PharmacyProfileId == pharmacyId && o.Type == Models.OfferType.JointOrder)
                .CountAsync();
            
            var tenderOffers = await _context.Offers
                .Where(o => o.PharmacyProfileId == pharmacyId && o.Type == Models.OfferType.PurchaseRequest)
                .CountAsync();

            // Calculate total sales from completed transactions
            var totalSales = await _context.Transactions
                .Where(t => t.PharmacyProfileId == pharmacyId && t.Type == Models.TransactionType.Sale)
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

            // Recent offers
            var recentOffers = await _context.Offers
                .Where(o => o.PharmacyProfileId == pharmacyId)
                .OrderByDescending(o => o.CreatedAt)
                .Take(5)
                .Select(o => new
                {
                    o.Id,
                    o.MedicationId,
                    ProductName = o.Medication.Name, // Added ProductName
                    Stock = o.Stock,
                    Price = o.Price,
                    Status = o.Status.ToString(),
                    o.CreatedAt
                })
                .ToListAsync();

            // Balance history (last 7 days)
            var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
            var balanceHistory = await _context.Transactions
                .Where(t => t.PharmacyProfileId == pharmacyId && t.Date >= sevenDaysAgo)
                .OrderBy(t => t.Date)
                .Select(t => new
                {
                    Date = t.Date.ToString("yyyy-MM-dd"),
                    t.Amount,
                    Type = t.Type.ToString()
                })
                .ToListAsync();

            // Recent shipments
            var shipments = await _context.Shipments
                .Where(s => s.SenderPharmacyId == pharmacyId || s.ReceiverPharmacyId == pharmacyId)
                .OrderByDescending(s => s.CreatedAt)
                .Take(5)
                .Select(s => new
                {
                    s.Id,
                    s.OrderNumber,
                    s.Status,
                    s.SenderPharmacyId,
                    s.ReceiverPharmacyId,
                    s.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                Stats = new
                {
                    TotalInventory = totalInventory,
                    TotalMedications = totalMedications,
                    ActiveOrders = activeOrders,
                    ActiveOffers = activeOffers,
                    TotalSales = totalSales,
                    StandardOffers = standardOffers,
                    CampaignOffers = campaignOffers,
                    TenderOffers = tenderOffers
                },
                RecentOffers = recentOffers,
                BalanceHistory = balanceHistory,
                Transfers = new List<object>(), // Deprecated, use shipments
                Shipments = shipments
            });
        }
        
        private async Task<long?> GetPharmacyIdFromToken()
        {
            // Get user ID from token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return null;

            // Fetch PharmacyId from IdentityUser using EF Core
            var user = await _identityContext.IdentityUsers
                .Where(u => u.Id == userId)
                .Select(u => u.PharmacyId)
                .FirstOrDefaultAsync();

            return user;
        }
    }
}
