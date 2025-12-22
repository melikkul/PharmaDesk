using Backend.Dtos;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    /// <summary>
    /// REFACTORED: Thin Controller - delegating all business logic to IShipmentService
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "User,Admin,SuperAdmin,Carrier")]  // Carrier added for scan endpoint access
    public class ShipmentsController : ControllerBase
    {
        private readonly IShipmentService _shipmentService;

        public ShipmentsController(IShipmentService shipmentService)
        {
            _shipmentService = shipmentService;
        }

        // GET /api/shipments?type=inbound|outbound&groupId=123 - Sevkiyatları listele
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ShipmentDto>>> GetShipments(
            [FromQuery] string? type = null, // "inbound" or "outbound"
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] int? groupId = null)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var shipments = await _shipmentService.GetShipmentsAsync(
                pharmacyId.Value, type, page, pageSize, groupId);

            return Ok(shipments);
        }

        // GET /api/shipments/{id} - Sevkiyat detayı
        [HttpGet("{id}")]
        public async Task<ActionResult<ShipmentDto>> GetShipment(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var result = await _shipmentService.GetShipmentByIdAsync(id, pharmacyId.Value);

            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    404 => NotFound(new { message = result.ErrorMessage }),
                    401 => Unauthorized(new { message = result.ErrorMessage }),
                    _ => BadRequest(new { message = result.ErrorMessage })
                };
            }

            return Ok(result.Data);
        }

        // POST /api/shipments - Yeni sevkiyat oluştur
        [HttpPost]
        public async Task<ActionResult<ShipmentDto>> CreateShipment([FromBody] CreateShipmentRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var result = await _shipmentService.CreateShipmentAsync(request, pharmacyId.Value);

            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    404 => NotFound(new { message = result.ErrorMessage }),
                    401 => Unauthorized(new { message = result.ErrorMessage }),
                    _ => BadRequest(new { message = result.ErrorMessage })
                };
            }

            return CreatedAtAction(nameof(GetShipment), new { id = result.Data!.Id }, result.Data);
        }

        /// <summary>
        /// POST /api/shipments/scan - QR kod okutarak kargo durumunu güncelle
        /// State Machine: Pending -> InTransit -> Delivered
        /// AllowAnonymous: Kurye uygulaması için özel erişim
        /// </summary>
        /// <summary>
        /// POST /api/shipments/scan - QR kod okutarak kargo durumunu güncelle
        /// State Machine: Pending -> InTransit -> Delivered
        /// Authorize: Sadece Kuryeler erişebilir
        /// </summary>
        [HttpPost("scan")]
        [Authorize(Roles = "Carrier")] // 🔒 Şimdi sadece giriş yapmış kuryeler erişebilir
        public async Task<ActionResult<ScanResult>> ScanShipment([FromBody] ScanShipmentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Token))
            {
                return BadRequest(new ScanResult 
                { 
                    Success = false, 
                    Message = "QR token gereklidir.",
                    ErrorCode = 400
                });
            }

            // Extract Carrier ID from JWT
            var carrierIdClaim = User.FindFirst("id")?.Value;
            if (!int.TryParse(carrierIdClaim, out int carrierId))
            {
                 return Unauthorized(new ScanResult 
                 { 
                     Success = false, 
                     Message = "Kurye kimliği doğrulanamadı.",
                     ErrorCode = 401
                 });
            }

            // Pass carrierId to service for GBAC Validation
            var result = await _shipmentService.ScanShipmentAsync(request.Token, carrierId);

            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    404 => NotFound(result),
                    403 => StatusCode(403, result), // Forbidden
                    401 => Unauthorized(result),
                    _ => BadRequest(result)
                };
            }

            return Ok(result);
        }

        /// <summary>
        /// GET /api/shipments/{id}/tracking-status
        /// Eczane kullanıcıları için kargo takip durumu (Kuyruk Bazlı Görünürlük)
        /// Returns carrier location, queue position, and estimated arrival
        /// </summary>
        [HttpGet("{id}/tracking-status")]
        public async Task<ActionResult<TrackingStatusDto>> GetTrackingStatus(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var result = await _shipmentService.GetTrackingStatusAsync(id, pharmacyId.Value);
            
            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    404 => NotFound(new { message = result.ErrorMessage }),
                    _ => BadRequest(new { message = result.ErrorMessage })
                };
            }
            
            return Ok(result.Data);
        }

        /// <summary>
        /// GET /api/shipments/{id}/qr-token - Test için QR token üret
        /// Only for development/testing purposes
        /// </summary>
        [HttpGet("{id}/qr-token")]
        [AllowAnonymous]
        public ActionResult<object> GetQRToken(int id, [FromServices] ICryptoService cryptoService)
        {
            var token = cryptoService.GenerateShipmentToken(id);
            return Ok(new 
            { 
                shipmentId = id, 
                qrToken = token,
                message = "Bu token'ı Cargo App'te manuel giriş alanına yapıştırın."
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

    /// <summary>
    /// Request DTO for QR code scanning
    /// </summary>
    public class ScanShipmentRequest
    {
        /// <summary>
        /// The encrypted QR token from the shipment label
        /// </summary>
        public string Token { get; set; } = string.Empty;
    }
}
