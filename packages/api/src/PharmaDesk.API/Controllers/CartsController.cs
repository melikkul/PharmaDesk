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

            if (request.Quantity > availableStock)
                return BadRequest(new { message = $"Yetersiz stok. Mevcut stok: {availableStock}" });

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

            if (request.Quantity > availableStock)
                return BadRequest(new { message = $"Yetersiz stok. Mevcut stok: {availableStock}" });

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
}
