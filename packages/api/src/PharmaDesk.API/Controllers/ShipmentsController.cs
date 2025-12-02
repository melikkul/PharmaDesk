using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ShipmentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ShipmentsController(AppDbContext context)
        {
            _context = context;
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

            var query = _context.Shipments
                .Include(s => s.SenderPharmacy)
                .Include(s => s.ReceiverPharmacy)
                .Include(s => s.Medication)
                .AsQueryable();

            // Filter by transfer type
            if (type == "inbound")
            {
                query = query.Where(s => s.ReceiverPharmacyId == pharmacyId.Value);
            }
            else if (type == "outbound")
            {
                query = query.Where(s => s.SenderPharmacyId == pharmacyId.Value);
            }
            else
            {
                // Show both inbound and outbound
                query = query.Where(s => s.SenderPharmacyId == pharmacyId.Value || s.ReceiverPharmacyId == pharmacyId.Value);
            }

            // Filter by group if groupId is provided
            if (groupId.HasValue)
            {
                query = query.Where(s =>
                    _context.PharmacyGroups.Any(pg =>
                        pg.GroupId == groupId.Value &&
                        pg.IsActive &&
                        (pg.PharmacyProfileId == s.SenderPharmacyId || pg.PharmacyProfileId == s.ReceiverPharmacyId)));
            }

            var shipments = await query
                .OrderByDescending(s => s.UpdatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var response = shipments.Select(s => new ShipmentDto
            {
                Id = s.Id,
                OrderNumber = s.OrderNumber,
                ProductName = s.Medication.Name,
                Quantity = s.Quantity,
                TrackingNumber = s.TrackingNumber,
                Date = s.UpdatedAt.ToString("yyyy-MM-dd"),
                TransferType = s.SenderPharmacyId == pharmacyId.Value ? "outbound" : "inbound",
                Counterparty = s.SenderPharmacyId == pharmacyId.Value 
                    ? s.ReceiverPharmacy.PharmacyName 
                    : s.SenderPharmacy.PharmacyName,
                ShippingProvider = s.Carrier,
                Status = TranslateShipmentStatus(s.Status),
                TrackingHistory = new List<TrackingEventDto>() // Will be loaded separately if needed
            });

            return Ok(response);
        }

        // GET /api/shipments/{id} - Sevkiyat detayı
        [HttpGet("{id}")]
        public async Task<ActionResult<ShipmentDto>> GetShipment(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var shipment = await _context.Shipments
                .Include(s => s.SenderPharmacy)
                .Include(s => s.ReceiverPharmacy)
                .Include(s => s.Medication)
                .FirstOrDefaultAsync(s => s.Id == id && 
                    (s.SenderPharmacyId == pharmacyId.Value || s.ReceiverPharmacyId == pharmacyId.Value));

            if (shipment == null)
                return NotFound(new { message = "Shipment not found" });

            var response = new ShipmentDto
            {
                Id = shipment.Id,
                OrderNumber = shipment.OrderNumber,
                ProductName = shipment.Medication.Name,
                Quantity = shipment.Quantity,
                TrackingNumber = shipment.TrackingNumber,
                Date = shipment.UpdatedAt.ToString("yyyy-MM-dd"),
                TransferType = shipment.SenderPharmacyId == pharmacyId.Value ? "outbound" : "inbound",
                Counterparty = shipment.SenderPharmacyId == pharmacyId.Value 
                    ? shipment.ReceiverPharmacy.PharmacyName 
                    : shipment.SenderPharmacy.PharmacyName,
                ShippingProvider = shipment.Carrier,
                Status = TranslateShipmentStatus(shipment.Status),
                TrackingHistory = await GetShipmentEvents(shipment.Id)
            };

            return Ok(response);
        }

        // POST /api/shipments - Yeni sevkiyat oluştur
        [HttpPost]
        public async Task<ActionResult<ShipmentDto>> CreateShipment([FromBody] CreateShipmentRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            // Verify medication exists
            var medication = await _context.Medications.FindAsync(request.MedicationId);
            if (medication == null)
                return NotFound(new { message = "Medication not found" });

            // Verify receiver pharmacy exists
            var receiverPharmacy = await _context.PharmacyProfiles.FindAsync(request.ReceiverPharmacyId);
            if (receiverPharmacy == null)
                return NotFound(new { message = "Receiver pharmacy not found" });

            // Create initial tracking history
            var trackingHistory = new List<TrackingEventDto>
            {
                new TrackingEventDto
                {
                    Date = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    Status = "Sipariş Alındı",
                    Location = "Merkez Depo"
                }
            };

            var shipment = new Shipment
            {
                OrderNumber = request.OrderNumber,
                SenderPharmacyId = pharmacyId.Value,
                ReceiverPharmacyId = request.ReceiverPharmacyId,
                MedicationId = request.MedicationId,
                Quantity = request.Quantity,
                TrackingNumber = request.TrackingNumber,
                Status = ShipmentStatus.Pending,
                Carrier = request.Carrier,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Shipments.Add(shipment);
            await _context.SaveChangesAsync();
            
            // Create initial tracking event
            var initialEvent = new ShipmentEvent
            {
                ShipmentId = shipment.Id,
                Status = "Sipariş Alındı",
                Location = "Merkez Depo",
                EventDate = DateTime.UtcNow
            };
            _context.ShipmentEvents.Add(initialEvent);
            await _context.SaveChangesAsync();

            // Load navigation properties
            await _context.Entry(shipment).Reference(s => s.SenderPharmacy).LoadAsync();
            await _context.Entry(shipment).Reference(s => s.ReceiverPharmacy).LoadAsync();
            await _context.Entry(shipment).Reference(s => s.Medication).LoadAsync();

            var response = new ShipmentDto
            {
                Id = shipment.Id,
                OrderNumber = shipment.OrderNumber,
                ProductName = shipment.Medication.Name,
                Quantity = shipment.Quantity,
                TrackingNumber = shipment.TrackingNumber,
                Date = shipment.UpdatedAt.ToString("yyyy-MM-dd"),
                TransferType = "outbound",
                Counterparty = shipment.ReceiverPharmacy.PharmacyName,
                ShippingProvider = shipment.Carrier,
                Status = TranslateShipmentStatus(shipment.Status),
                TrackingHistory = new List<TrackingEventDto> 
                {
                    new TrackingEventDto
                    {
                        Date = initialEvent.EventDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                        Status = initialEvent.Status,
                        Location = initialEvent.Location
                    }
                }
            };

            return CreatedAtAction(nameof(GetShipment), new { id = shipment.Id }, response);
        }

        // Helper methods
        private string TranslateShipmentStatus(ShipmentStatus status)
        {
            return status switch
            {
                ShipmentStatus.Pending => "pending",
                ShipmentStatus.Shipped => "shipped",
                ShipmentStatus.InTransit => "in_transit",
                ShipmentStatus.Delivered => "delivered",
                ShipmentStatus.Cancelled => "cancelled",
                _ => status.ToString().ToLower()
            };
        }

        private List<TrackingEventDto>? ParseTrackingHistory(string? trackingHistoryJson)
        {
            if (string.IsNullOrEmpty(trackingHistoryJson))
                return null;

            try
            {
                return JsonSerializer.Deserialize<List<TrackingEventDto>>(trackingHistoryJson);
            }
            catch
            {
                return null;
            }
        }

        private async Task<List<TrackingEventDto>> GetShipmentEvents(int shipmentId)
        {
            var events = await _context.ShipmentEvents
                .Where(e => e.ShipmentId == shipmentId)
                .OrderBy(e => e.EventDate)
                .ToListAsync();

            return events.Select(e => new TrackingEventDto
            {
                Date = e.EventDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                Status = e.Status,
                Location = e.Location ?? ""
            }).ToList();
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
