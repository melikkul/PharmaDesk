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
    [Authorize(Roles = "User,Admin,Pharmacy")]
    public class CartsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;

        public CartsController(AppDbContext context, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // GET /api/carts - Get current user's cart
        [HttpGet]
        public async Task<ActionResult<Cart>> GetCart()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var cart = await _context.Carts
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.Offer)
                        .ThenInclude(o => o.Medication)
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.Offer)
                        .ThenInclude(o => o.PharmacyProfile)
                .FirstOrDefaultAsync(c => c.PharmacyProfileId == pharmacyId.Value);

            if (cart == null)
            {
                // Verify PharmacyProfile exists before creating cart
                var profileExists = await _context.PharmacyProfiles.AnyAsync(p => p.Id == pharmacyId.Value);
                if (!profileExists)
                {
                    return BadRequest(new { message = "PharmacyProfile not found. Please contact support.", pharmacyId = pharmacyId.Value });
                }
                
                // Create empty cart
                cart = new Cart
                {
                    PharmacyProfileId = pharmacyId.Value
                };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }

            return Ok(cart);
        }

        // POST /api/carts/items - Add item to cart
        [HttpPost("items")]
        public async Task<ActionResult<CartItem>> AddItem([FromBody] AddCartItemRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            // Verify offer exists and is active
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .FirstOrDefaultAsync(o => o.Id == request.OfferId);

            if (offer == null)
                return NotFound(new { message = "Offer not found" });

            if (offer.Status != OfferStatus.Active)
                return BadRequest(new { message = "Offer is not active" });

            // Calculate available stock based on offer type
            int availableStock;
            if (offer.Type == OfferType.JointOrder || offer.Type == OfferType.PurchaseRequest)
            {
                // For JointOrder/PurchaseRequest: available = barem total - sold quantity
                // Parse barem if exists (format: "20+2")
                if (!string.IsNullOrEmpty(offer.MalFazlasi))
                {
                    var baremParts = offer.MalFazlasi.Split('+').Select(s => int.TryParse(s.Trim(), out var v) ? v : 0).ToArray();
                    var baremTotal = baremParts.Sum();
                    // Calculate barem multiple based on offer stock
                    var baremMultiple = Math.Max(1, (int)Math.Ceiling((double)offer.Stock / Math.Max(1, baremTotal)));
                    availableStock = (baremTotal * baremMultiple) - offer.SoldQuantity;
                }
                else
                {
                    availableStock = offer.Stock - offer.SoldQuantity;
                }
            }
            else
            {
                // For StockSale: available = stock - sold quantity
                availableStock = offer.Stock - offer.SoldQuantity;
            }

            // 🆕 Deduct locked quantities from ALL users (including current user's own locks)
            // This prevents adding more items when already in payment process
            var allLockedQuantity = await _context.StockLocks
                .Where(sl => sl.OfferId == request.OfferId 
                    && sl.ExpiresAt > DateTime.UtcNow)
                .SumAsync(sl => sl.LockedQuantity);
            
            availableStock -= allLockedQuantity;

            // 🆕 Check if user already has this item in cart (not locked yet)
            var existingCart = await _context.Carts
                .Include(c => c.CartItems)
                .FirstOrDefaultAsync(c => c.PharmacyProfileId == pharmacyId.Value);
            
            var existingCartQuantity = existingCart?.CartItems
                .Where(ci => ci.OfferId == request.OfferId)
                .Sum(ci => ci.Quantity) ?? 0;

            // 🆕 Check if this user has locked this item (in payment process)
            var myLockedQuantity = await _context.StockLocks
                .Where(sl => sl.OfferId == request.OfferId 
                    && sl.PharmacyProfileId == pharmacyId.Value
                    && sl.ExpiresAt > DateTime.UtcNow)
                .SumAsync(sl => sl.LockedQuantity);

            // If user has locked items, they cannot add more - redirect to complete payment
            if (myLockedQuantity > 0)
            {
                return BadRequest(new { message = $"Bu ürün için ödeme işleminiz devam ediyor. Lütfen önce ödemeyi tamamlayın veya iptal edin." });
            }

            // Calculate how much more the user can add
            // Note: existingCartQuantity is what they have in cart (not locked yet)
            // availableStock already has allLockedQuantity deducted
            var canAddMore = availableStock - existingCartQuantity;
            
            if (request.Quantity > canAddMore)
                return BadRequest(new { message = $"Yetersiz stok. Ekleyebileceğiniz maksimum: {Math.Max(0, canAddMore)}, Sepetinizde: {existingCartQuantity}" });

            // Get or create cart
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .FirstOrDefaultAsync(c => c.PharmacyProfileId == pharmacyId.Value);

            if (cart == null)
            {
                cart = new Cart { PharmacyProfileId = pharmacyId.Value };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }

            // Check if item already in cart
            var existingItem = cart.CartItems.FirstOrDefault(ci => ci.OfferId == request.OfferId);
            if (existingItem != null)
            {
                existingItem.Quantity += request.Quantity;
                cart.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var cartItem = new CartItem
                {
                    CartId = cart.Id,
                    OfferId = request.OfferId,
                    Quantity = request.Quantity
                };
                _context.CartItems.Add(cartItem);
                cart.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            // SignalR ile kullanıcıya bildir
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                await _hubContext.Clients.Group(userId).SendAsync("ReceiveCartUpdate", new
                {
                    type = "itemAdded",
                    offerId = request.OfferId,
                    quantity = request.Quantity,
                    cartItemCount = cart.CartItems.Count
                });
            }

            return Ok(new { message = "Item added to cart", cartItemCount = cart.CartItems.Count });
        }

        // PUT /api/carts/items/{id} - Update item quantity
        [HttpPut("items/{id}")]
        public async Task<ActionResult> UpdateQuantity(int id, [FromBody] UpdateQuantityRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var cartItem = await _context.CartItems
                .Include(ci => ci.Cart)
                .Include(ci => ci.Offer)
                .FirstOrDefaultAsync(ci => ci.Id == id && ci.Cart.PharmacyProfileId == pharmacyId.Value);

            if (cartItem == null)
                return NotFound(new { message = "Cart item not found" });

            if (request.Quantity <= 0)
                return BadRequest(new { message = "Quantity must be positive" });

            // Calculate available stock based on offer type
            var offer = cartItem.Offer;
            int availableStock;
            if (offer.Type == OfferType.JointOrder || offer.Type == OfferType.PurchaseRequest)
            {
                if (!string.IsNullOrEmpty(offer.MalFazlasi))
                {
                    var baremParts = offer.MalFazlasi.Split('+').Select(s => int.TryParse(s.Trim(), out var v) ? v : 0).ToArray();
                    var baremTotal = baremParts.Sum();
                    var baremMultiple = Math.Max(1, (int)Math.Ceiling((double)offer.Stock / Math.Max(1, baremTotal)));
                    availableStock = (baremTotal * baremMultiple) - offer.SoldQuantity;
                }
                else
                {
                    availableStock = offer.Stock - offer.SoldQuantity;
                }
            }
            else
            {
                availableStock = offer.Stock - offer.SoldQuantity;
            }

            // 🆕 Deduct locked quantities from ALL users (including current user's own locks)
            // This prevents increasing quantity when already in payment process
            var allLockedQuantity = await _context.StockLocks
                .Where(sl => sl.OfferId == cartItem.OfferId 
                    && sl.ExpiresAt > DateTime.UtcNow)
                .SumAsync(sl => sl.LockedQuantity);
            
            availableStock -= allLockedQuantity;

            // 🆕 Check if this user has locked this item (in payment process)
            var myLockedQuantity = await _context.StockLocks
                .Where(sl => sl.OfferId == cartItem.OfferId 
                    && sl.PharmacyProfileId == pharmacyId.Value
                    && sl.ExpiresAt > DateTime.UtcNow)
                .SumAsync(sl => sl.LockedQuantity);

            // If user has locked items, they cannot update quantity - redirect to complete payment
            if (myLockedQuantity > 0)
            {
                return BadRequest(new { message = $"Bu ürün için ödeme işleminiz devam ediyor. Lütfen önce ödemeyi tamamlayın veya iptal edin." });
            }

            if (request.Quantity > availableStock)
                return BadRequest(new { message = $"Yetersiz stok. Mevcut stok: {Math.Max(0, availableStock)}" });

            cartItem.Quantity = request.Quantity;
            cartItem.Cart.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // SignalR ile kullanıcıya bildir
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                await _hubContext.Clients.Group(userId).SendAsync("ReceiveCartUpdate", new
                {
                    type = "quantityUpdated",
                    cartItemId = id,
                    quantity = request.Quantity
                });
            }

            return Ok(new { message = "Quantity updated" });
        }

        // DELETE /api/carts/items/{id} - Remove item from cart
        [HttpDelete("items/{id}")]
        public async Task<ActionResult> RemoveItem(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var cartItem = await _context.CartItems
                .Include(ci => ci.Cart)
                .FirstOrDefaultAsync(ci => ci.Id == id && ci.Cart.PharmacyProfileId == pharmacyId.Value);

            if (cartItem == null)
                return NotFound(new { message = "Cart item not found" });

            _context.CartItems.Remove(cartItem);
            cartItem.Cart.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Sepetteki kalan item sayısını hesapla
            var remainingItems = await _context.CartItems
                .CountAsync(ci => ci.Cart.PharmacyProfileId == pharmacyId.Value);

            // SignalR ile kullanıcıya bildir
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                await _hubContext.Clients.Group(userId).SendAsync("ReceiveCartUpdate", new
                {
                    type = "itemRemoved",
                    cartItemId = id,
                    cartItemCount = remainingItems
                });
            }

            return Ok(new { message = "Item removed from cart" });
        }

        // DELETE /api/carts/clear - Clear all items from cart
        [HttpDelete("clear")]
        public async Task<ActionResult> ClearCart()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .FirstOrDefaultAsync(c => c.PharmacyProfileId == pharmacyId.Value);

            if (cart == null || !cart.CartItems.Any())
                return Ok(new { message = "Cart is already empty" });

            _context.CartItems.RemoveRange(cart.CartItems);
            cart.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // SignalR ile kullanıcıya bildir
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                await _hubContext.Clients.Group(userId).SendAsync("ReceiveCartUpdate", new
                {
                    type = "cartCleared",
                    cartItemCount = 0
                });
            }

            return Ok(new { message = "Cart cleared successfully" });
        }

        private long? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            if (long.TryParse(pharmacyIdClaim, out var pharmacyId))
                return pharmacyId;
            return null;
        }

        // PUT /api/carts/items/{id}/depot-fulfillment - Set depot fulfillment flag
        [HttpPut("items/{id}/depot-fulfillment")]
        public async Task<ActionResult> SetDepotFulfillment(int id, [FromBody] SetDepotFulfillmentRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var cartItem = await _context.CartItems
                .Include(ci => ci.Cart)
                .Include(ci => ci.Offer)
                .FirstOrDefaultAsync(ci => ci.Id == id && ci.Cart.PharmacyProfileId == pharmacyId.Value);

            if (cartItem == null)
                return NotFound(new { message = "Cart item not found" });

            // Sadece PurchaseRequest için geçerli
            if (cartItem.Offer.Type != OfferType.PurchaseRequest)
                return BadRequest(new { message = "Bu ayar sadece Alım Talebi türündeki ilanlar için geçerlidir." });

            cartItem.IsDepotFulfillment = request.IsDepotFulfillment;
            cartItem.Cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Depo sorumluluğu güncellendi.", isDepotFulfillment = request.IsDepotFulfillment });
        }
    }

    public class AddCartItemRequest
    {
        public int OfferId { get; set; }
        public int Quantity { get; set; }
    }

    public class UpdateQuantityRequest
    {
        public int Quantity { get; set; }
    }

    public class SetDepotFulfillmentRequest
    {
        public bool IsDepotFulfillment { get; set; }
    }
}
