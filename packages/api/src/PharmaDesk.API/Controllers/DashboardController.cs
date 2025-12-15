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
    [Authorize(Roles = "User,Admin")]
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
                .Include(o => o.Medication)
                .Where(o => o.PharmacyProfileId == pharmacyId)
                .OrderByDescending(o => o.CreatedAt)
                .Take(5)
                .Select(o => new
                {
                    o.Id,
                    o.MedicationId,
                    ProductName = o.Medication.Name,
                    Stock = o.Stock,
                    Price = o.Price,
                    Status = o.Status.ToString(),
                    ImageUrl = !string.IsNullOrEmpty(o.Medication.ImagePath) ? $"/{o.Medication.ImagePath}" : "/logoYesil.png",
                    Type = o.Type.ToString(),  // 🆕 Teklif tipi
                    MalFazlasi = o.MalFazlasi, // 🆕 Barem değeri
                    o.CreatedAt
                })
                .ToListAsync();

            // Balance history (last 7 days) - İlaç adı ve sipariş ID'si dahil (FK-based, not string-based)
            var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
            var balanceHistory = await _context.Transactions
                .Include(t => t.Order)
                    .ThenInclude(o => o != null ? o.OrderItems : null!)
                        .ThenInclude(oi => oi.Medication)
                .Include(t => t.Offer)
                    .ThenInclude(o => o != null ? o.Medication : null!)
                .Where(t => t.PharmacyProfileId == pharmacyId && t.Date >= sevenDaysAgo)
                .OrderByDescending(t => t.Date)
                .Take(10)
                .ToListAsync();

            // Map to anonymous objects after loading (avoids complex EF translation issues)
            var balanceHistoryDto = balanceHistory.Select(t => new
            {
                Id = t.Id,
                Date = t.Date.ToString("dd/MM/yyyy"),
                t.Amount,
                Type = t.Amount >= 0 ? "positive" : "negative",
                Description = t.Description,
                // 🆕 Get medication name from Order->OrderItems or Offer->Medication (FK-based)
                ProductName = t.Order?.OrderItems?.FirstOrDefault()?.Medication?.Name 
                    ?? t.Offer?.Medication?.Name,
                // İlaç ID'si (detay sayfasına link için)
                MedicationId = t.Order?.OrderItems?.FirstOrDefault()?.MedicationId 
                    ?? t.Offer?.MedicationId,
                // Sipariş ID'si
                OrderId = t.OrderId
            }).ToList();

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
                BalanceHistory = balanceHistoryDto,
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
