using Backend.Dtos;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    /// <summary>
    /// THIN CONTROLLER: Delegates all business logic to IOrderService
    /// Only handles HTTP request/response mapping
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "User,Admin")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public OrdersController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        // ═══════════════════════════════════════════════════════════════
        // GET Endpoints
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// GET /api/orders - Tüm siparişleri listele (Admin only)
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetAllOrders(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? status = null)
        {
            var orders = await _orderService.GetAllOrdersAsync(page, pageSize, status);
            return Ok(orders);
        }

        /// <summary>
        /// GET /api/orders/my-orders - Kendi siparişlerimi getir
        /// </summary>
        [HttpGet("my-orders")]
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetMyOrders(
            [FromQuery] string? role = null)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var orders = await _orderService.GetOrdersByPharmacyAsync(pharmacyId.Value, role);
            return Ok(orders);
        }

        /// <summary>
        /// GET /api/orders/{id} - Sipariş detayını getir
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<OrderDto>> GetOrderById(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var order = await _orderService.GetOrderByIdAsync(id, pharmacyId.Value);

            if (order == null)
                return NotFound(new { message = "Sipariş bulunamadı veya erişim yetkiniz yok." });

            return Ok(order);
        }

        // ═══════════════════════════════════════════════════════════════
        // POST Endpoints
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// POST /api/orders - Sepetteki ürünlerden sipariş oluştur
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<OrderResult>> CreateOrderFromCart()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var result = await _orderService.CreateOrderFromCartAsync(pharmacyId.Value);

            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    404 => NotFound(new { message = result.ErrorMessage }),
                    _ => BadRequest(new { message = result.ErrorMessage })
                };
            }

            return Ok(new
            {
                success = true,
                message = $"{result.OrderCount} sipariş başarıyla oluşturuldu.",
                orders = result.Orders,
                totalAmount = result.TotalAmount,
                orderCount = result.OrderCount
            });
        }

        /// <summary>
        /// POST /api/orders/single - Tek bir teklif için sipariş oluştur
        /// </summary>
        [HttpPost("single")]
        public async Task<ActionResult<OrderDto>> CreateSingleOrder([FromBody] CreateOrderRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var result = await _orderService.CreateOrderAsync(request, pharmacyId.Value);

            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    404 => NotFound(new { message = result.ErrorMessage }),
                    _ => BadRequest(new { message = result.ErrorMessage })
                };
            }

            return CreatedAtAction(nameof(GetOrderById), new { id = result.Order!.Id }, result.Order);
        }

        // ═══════════════════════════════════════════════════════════════
        // PATCH/PUT Endpoints
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// PATCH /api/orders/{id}/status - Sipariş durumunu güncelle
        /// </summary>
        [HttpPatch("{id}/status")]
        public async Task<ActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var success = await _orderService.UpdateOrderStatusAsync(id, request.Status, pharmacyId.Value);

            if (!success)
                return NotFound(new { message = "Sipariş bulunamadı veya güncelleme yetkiniz yok." });

            return Ok(new { message = "Sipariş durumu başarıyla güncellendi." });
        }

        // ═══════════════════════════════════════════════════════════════
        // DELETE Endpoints
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// DELETE /api/orders/{id} - Siparişi iptal et
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> CancelOrder(int id, [FromQuery] string? reason = null)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var success = await _orderService.CancelOrderAsync(id, pharmacyId.Value, reason);

            if (!success)
                return BadRequest(new { message = "Sipariş iptal edilemedi. Sipariş bulunamadı, yetkiniz yok veya sipariş durumu iptal edilemez." });

            return Ok(new { message = "Sipariş başarıyla iptal edildi." });
        }

        // ═══════════════════════════════════════════════════════════════
        // Private Helper
        // ═══════════════════════════════════════════════════════════════

        private long? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            return long.TryParse(pharmacyIdClaim, out var pharmacyId) ? pharmacyId : null;
        }
    }

    // Request DTOs
    public class UpdateOrderStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}
