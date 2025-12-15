using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PharmaDesk.API.Hubs;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StockLocksController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;
        private const int LOCK_DURATION_MINUTES = 10; // Kilit süresi

        public StockLocksController(AppDbContext context, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        /// <summary>
        /// Sepetteki ürünlerin stoklarını kilitle (ödeme sayfasına geçerken)
        /// POST /api/stocklocks/lock
        /// </summary>
        [HttpPost("lock")]
        public async Task<ActionResult> LockStocks()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            // Kullanıcının sepetini al
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.Offer)
                .FirstOrDefaultAsync(c => c.PharmacyProfileId == pharmacyId.Value);

            if (cart == null || !cart.CartItems.Any())
                return BadRequest(new { message = "Sepet boş" });

            // Önce mevcut kilitleri temizle (bu kullanıcının)
            var existingLocks = await _context.StockLocks
                .Where(sl => sl.PharmacyProfileId == pharmacyId.Value)
                .ToListAsync();
            
            if (existingLocks.Any())
            {
                _context.StockLocks.RemoveRange(existingLocks);
            }

            // Süre dolmuş tüm kilitleri temizle
            var expiredLocks = await _context.StockLocks
                .Where(sl => sl.ExpiresAt < DateTime.UtcNow)
                .ToListAsync();
            
            if (expiredLocks.Any())
            {
                _context.StockLocks.RemoveRange(expiredLocks);
            }

            var lockedOfferIds = new List<int>();
            var expiresAt = DateTime.UtcNow.AddMinutes(LOCK_DURATION_MINUTES);

            foreach (var cartItem in cart.CartItems)
            {
                // Her ürün için kilit oluştur
                var stockLock = new StockLock
                {
                    OfferId = cartItem.OfferId,
                    PharmacyProfileId = pharmacyId.Value,
                    LockedQuantity = cartItem.Quantity,
                    LockedAt = DateTime.UtcNow,
                    ExpiresAt = expiresAt
                };

                _context.StockLocks.Add(stockLock);
                lockedOfferIds.Add(cartItem.OfferId);
            }

            await _context.SaveChangesAsync();

            // 🆕 SignalR broadcast - notify all clients about stock lock
            await _hubContext.Clients.All.SendAsync("ReceiveStockLockUpdate", new 
            { 
                type = "lock",
                offerIds = lockedOfferIds,
                pharmacyId = pharmacyId.Value,
                expiresAt = expiresAt.ToString("o")
            });

            return Ok(new 
            { 
                message = "Stoklar kilitlendi", 
                lockedOfferIds,
                expiresAt = expiresAt.ToString("o")
            });
        }

        /// <summary>
        /// Kilitleri serbest bırak (ödeme tamamlandığında veya sayfadan ayrıldığında)
        /// POST /api/stocklocks/unlock
        /// </summary>
        [HttpPost("unlock")]
        public async Task<ActionResult> UnlockStocks()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var locks = await _context.StockLocks
                .Where(sl => sl.PharmacyProfileId == pharmacyId.Value)
                .ToListAsync();

            if (locks.Any())
            {
                var unlockedOfferIds = locks.Select(l => l.OfferId).Distinct().ToList();
                _context.StockLocks.RemoveRange(locks);
                await _context.SaveChangesAsync();

                // 🆕 SignalR broadcast - notify all clients about stock unlock
                await _hubContext.Clients.All.SendAsync("ReceiveStockLockUpdate", new 
                { 
                    type = "unlock",
                    offerIds = unlockedOfferIds,
                    pharmacyId = pharmacyId.Value
                });
            }

            return Ok(new { message = "Kilitler serbest bırakıldı" });
        }

        /// <summary>
        /// Kullanıcının kilit durumunu al
        /// GET /api/stocklocks/status
        /// </summary>
        [HttpGet("status")]
        public async Task<ActionResult> GetLockStatus()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var myLocks = await _context.StockLocks
                .Where(sl => sl.PharmacyProfileId == pharmacyId.Value && sl.ExpiresAt > DateTime.UtcNow)
                .Select(sl => new 
                {
                    offerId = sl.OfferId,
                    lockedQuantity = sl.LockedQuantity,
                    expiresAt = sl.ExpiresAt
                })
                .ToListAsync();

            return Ok(new 
            { 
                myLocks,
                isLocked = myLocks.Any()
            });
        }

        /// <summary>
        /// Belirli bir teklifin kilit durumunu al
        /// GET /api/stocklocks/offer/{offerId}
        /// </summary>
        [HttpGet("offer/{offerId}")]
        public async Task<ActionResult> GetOfferLockStatus(int offerId)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var activeLocks = await _context.StockLocks
                .Where(sl => sl.OfferId == offerId && sl.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

            var myLocked = activeLocks
                .Where(sl => sl.PharmacyProfileId == pharmacyId.Value)
                .Sum(sl => sl.LockedQuantity);

            var othersLocked = activeLocks
                .Where(sl => sl.PharmacyProfileId != pharmacyId.Value)
                .Sum(sl => sl.LockedQuantity);

            return Ok(new 
            { 
                totalLocked = myLocked + othersLocked,
                myLocked,
                othersLocked
            });
        }

        private long? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            if (long.TryParse(pharmacyIdClaim, out var pharmacyId))
                return pharmacyId;
            return null;
        }
    }
}
