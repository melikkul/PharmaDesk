using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CartsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CartsController(AppDbContext context)
        {
            _context = context;
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

            if (request.Quantity > offer.Stock)
                return BadRequest(new { message = "Insufficient stock" });

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

            if (request.Quantity > cartItem.Offer.Stock)
                return BadRequest(new { message = "Insufficient stock" });

            cartItem.Quantity = request.Quantity;
            cartItem.Cart.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

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

            return Ok(new { message = "Item removed from cart" });
        }

        private int? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            if (int.TryParse(pharmacyIdClaim, out var pharmacyId))
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
