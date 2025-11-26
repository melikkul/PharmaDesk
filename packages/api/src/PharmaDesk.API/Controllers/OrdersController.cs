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
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrdersController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/orders?type=buyer|seller - List orders
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrders([FromQuery] string? type = null)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var query = _context.Orders
                .Include(o => o.BuyerPharmacy)
                .Include(o => o.SellerPharmacy)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Medication)
                .AsQueryable();

            if (type == "buyer")
            {
                query = query.Where(o => o.BuyerPharmacyId == pharmacyId.Value);
            }
            else if (type == "seller")
            {
                query = query.Where(o => o.SellerPharmacyId == pharmacyId.Value);
            }
            else
            {
                // Both buyer and seller
                query = query.Where(o => o.BuyerPharmacyId == pharmacyId.Value || o.SellerPharmacyId == pharmacyId.Value);
            }

            var orders = await query
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();

            return Ok(orders);
        }

        // GET /api/orders/{id} - Get order details
        [HttpGet("{id}")]
        public async Task<ActionResult<Order>> GetOrder(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var order = await _context.Orders
                .Include(o => o.BuyerPharmacy)
                .Include(o => o.SellerPharmacy)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Medication)
                .FirstOrDefaultAsync(o => o.Id == id && 
                    (o.BuyerPharmacyId == pharmacyId.Value || o.SellerPharmacyId == pharmacyId.Value));

            if (order == null)
                return NotFound(new { message = "Order not found" });

            return Ok(order);
        }

        // POST /api/orders - Create order from cart
        [HttpPost]
        public async Task<ActionResult<Order>> CreateOrder()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            // Get cart with items
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.Offer)
                        .ThenInclude(o => o.Medication)
                .FirstOrDefaultAsync(c => c.PharmacyProfileId == pharmacyId.Value);

            if (cart == null || !cart.CartItems.Any())
                return BadRequest(new { message = "Cart is empty" });

            // Group cart items by seller
            var ordersBySeller = cart.CartItems
                .GroupBy(ci => ci.Offer.PharmacyProfileId)
                .ToList();

            var createdOrders = new List<Order>();

            foreach (var sellerGroup in ordersBySeller)
            {
                var sellerId = sellerGroup.Key;
                var items = sellerGroup.ToList();

                // Calculate total
                decimal totalAmount = items.Sum(ci => ci.Offer.Price * ci.Quantity);

                // Generate order number
                var orderNumber = $"{DateTime.UtcNow.Year}-{Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper()}";

                // Create order
                var order = new Order
                {
                    OrderNumber = orderNumber,
                    BuyerPharmacyId = pharmacyId.Value,
                    SellerPharmacyId = sellerId,
                    TotalAmount = totalAmount,
                    OrderDate = DateTime.UtcNow,
                    Status = OrderStatus.Pending,
                    PaymentStatus = PaymentStatus.Pending
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync(); // Save to get order ID

                // Create order items
                foreach (var cartItem in items)
                {
                    var orderItem = new OrderItem
                    {
                        OrderId = order.Id,
                        MedicationId = cartItem.Offer.MedicationId,
                        Quantity = cartItem.Quantity,
                        UnitPrice = cartItem.Offer.Price,
                        BonusQuantity = cartItem.Offer.BonusQuantity
                    };
                    _context.OrderItems.Add(orderItem);

                    // Update offer stock
                    cartItem.Offer.Stock -= cartItem.Quantity;
                    if (cartItem.Offer.Stock <= 0)
                    {
                        cartItem.Offer.Status = OfferStatus.OutOfStock;
                    }
                }

                createdOrders.Add(order);
            }

            // Clear cart
            _context.CartItems.RemoveRange(cart.CartItems);

            await _context.SaveChangesAsync();

            return Ok(new { message = $"{createdOrders.Count} order(s) created", orders = createdOrders });
        }

        // PUT /api/orders/{id}/status - Update order status
        [HttpPut("{id}/status")]
        public async Task<ActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.Id == id && 
                    (o.BuyerPharmacyId == pharmacyId.Value || o.SellerPharmacyId == pharmacyId.Value));

            if (order == null)
                return NotFound(new { message = "Order not found" });

            // Only seller can update status
            if (order.SellerPharmacyId != pharmacyId.Value)
                return Forbid();

            order.Status = request.Status;
            order.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Order status updated", order });
        }

        private long? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            if (long.TryParse(pharmacyIdClaim, out var pharmacyId))
                return pharmacyId;
            return null;
        }
    }

    public class UpdateOrderStatusRequest
    {
        public OrderStatus Status { get; set; }
    }
}
