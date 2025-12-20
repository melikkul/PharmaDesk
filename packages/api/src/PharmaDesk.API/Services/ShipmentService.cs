using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    /// <summary>
    /// Shipment business logic implementation
    /// Handles CRUD operations for shipments between pharmacies
    /// </summary>
    public class ShipmentService : IShipmentService
    {
        private readonly AppDbContext _context;
        private readonly ICryptoService _cryptoService;

        public ShipmentService(AppDbContext context, ICryptoService cryptoService)
        {
            _context = context;
            _cryptoService = cryptoService;
        }

        /// <inheritdoc />
        public async Task<IEnumerable<ShipmentDto>> GetShipmentsAsync(
            long pharmacyId,
            string? type = null,
            int page = 1,
            int pageSize = 50,
            int? groupId = null)
        {
            var query = _context.Shipments
                .Include(s => s.SenderPharmacy)
                .Include(s => s.ReceiverPharmacy)
                .Include(s => s.Medication)
                .AsQueryable();

            // Filter by transfer type
            if (type == "inbound")
            {
                query = query.Where(s => s.ReceiverPharmacyId == pharmacyId);
            }
            else if (type == "outbound")
            {
                query = query.Where(s => s.SenderPharmacyId == pharmacyId);
            }
            else
            {
                // Show both inbound and outbound
                query = query.Where(s => s.SenderPharmacyId == pharmacyId || s.ReceiverPharmacyId == pharmacyId);
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

            return shipments.Select(s => new ShipmentDto
            {
                Id = s.Id,
                OrderNumber = s.OrderNumber,
                ProductName = s.Medication.Name,
                Quantity = s.Quantity,
                TrackingNumber = s.TrackingNumber,
                Date = s.UpdatedAt.ToString("yyyy-MM-dd"),
                TransferType = s.SenderPharmacyId == pharmacyId ? "outbound" : "inbound",
                Counterparty = s.SenderPharmacyId == pharmacyId 
                    ? s.ReceiverPharmacy.PharmacyName 
                    : s.SenderPharmacy.PharmacyName,
                ShippingProvider = s.Carrier,
                Status = TranslateShipmentStatus(s.Status),
                TrackingHistory = new List<TrackingEventDto>() // Will be loaded separately if needed
            });
        }

        /// <inheritdoc />
        public async Task<ShipmentResult> GetShipmentByIdAsync(int id, long pharmacyId)
        {
            var shipment = await _context.Shipments
                .Include(s => s.SenderPharmacy)
                .Include(s => s.ReceiverPharmacy)
                .Include(s => s.Medication)
                .FirstOrDefaultAsync(s => s.Id == id && 
                    (s.SenderPharmacyId == pharmacyId || s.ReceiverPharmacyId == pharmacyId));

            if (shipment == null)
                return ShipmentResult.NotFound("Shipment not found");

            var trackingHistory = await GetShipmentEventsAsync(shipment.Id);

            var dto = new ShipmentDto
            {
                Id = shipment.Id,
                OrderNumber = shipment.OrderNumber,
                ProductName = shipment.Medication.Name,
                Quantity = shipment.Quantity,
                TrackingNumber = shipment.TrackingNumber,
                Date = shipment.UpdatedAt.ToString("yyyy-MM-dd"),
                TransferType = shipment.SenderPharmacyId == pharmacyId ? "outbound" : "inbound",
                Counterparty = shipment.SenderPharmacyId == pharmacyId 
                    ? shipment.ReceiverPharmacy.PharmacyName 
                    : shipment.SenderPharmacy.PharmacyName,
                ShippingProvider = shipment.Carrier,
                Status = TranslateShipmentStatus(shipment.Status),
                TrackingHistory = trackingHistory
            };

            return ShipmentResult.Ok(dto);
        }

        /// <inheritdoc />
        public async Task<ShipmentResult> CreateShipmentAsync(CreateShipmentRequest request, long pharmacyId)
        {
            // Verify medication exists
            var medication = await _context.Medications.FindAsync(request.MedicationId);
            if (medication == null)
                return ShipmentResult.NotFound("Medication not found");

            // Verify receiver pharmacy exists
            var receiverPharmacy = await _context.PharmacyProfiles.FindAsync(request.ReceiverPharmacyId);
            if (receiverPharmacy == null)
                return ShipmentResult.NotFound("Receiver pharmacy not found");

            var shipment = new Shipment
            {
                OrderNumber = request.OrderNumber,
                SenderPharmacyId = pharmacyId,
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

            var dto = new ShipmentDto
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

            return ShipmentResult.Ok(dto);
        }

        /// <inheritdoc />
        /// <summary>
        /// Scan a shipment QR code and update status using state machine:
        /// Pending -> InTransit (Teslim Alındı)
        /// InTransit -> Delivered (Teslim Edildi)
        /// </summary>
        public async Task<ScanResult> ScanShipmentAsync(string encryptedToken, int carrierId)
        {
            // 1. Decrypt the token to get shipment ID
            var shipmentId = _cryptoService.DecryptShipmentToken(encryptedToken);
            
            if (!shipmentId.HasValue)
            {
                return ScanResult.InvalidToken("Geçersiz veya bozulmuş QR kod. Lütfen tekrar deneyin.");
            }

            // 2. Find the shipment
            var shipment = await _context.Shipments
                .Include(s => s.Medication)
                .Include(s => s.SenderPharmacy)
                .Include(s => s.ReceiverPharmacy)
                .FirstOrDefaultAsync(s => s.Id == shipmentId.Value);

            if (shipment == null)
            {
                return ScanResult.NotFound($"Kargo #{shipmentId} bulunamadı.");
            }

            // 🛡️ 3. SCOPE VALIDATION INTERCEPTOR (GBAC)
            // Check if the carrier has permission to handle this shipment
            
            // 3.1 Fetch Carrier Permissions (Groups)
            var carrier = await _context.Carriers
                .Include(c => c.CarrierGroups)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == carrierId);
                
            if (carrier == null) return ScanResult.Forbidden("Kurye profili bulunamadı.");
            
            // 3.2 Get allowed group IDs
            var allowedGroupIds = carrier.CarrierGroups.Select(cg => cg.GroupId).ToList();
            
            // If carrier has no groups assigned, they cannot scan anything (Strict Mode)
            if (!allowedGroupIds.Any()) 
                return ScanResult.Forbidden("Bu işlemi yapmak için herhangi bir bölgeye atanmamışsınız.");

            // 3.3 Intersection Check: Is Sender OR Receiver in allowed groups?
            // Get Sender Pharmacy Groups
            var senderPharmacyGroupIds = await _context.PharmacyGroups
                .Where(pg => pg.PharmacyProfileId == shipment.SenderPharmacyId && pg.IsActive)
                .Select(pg => pg.GroupId)
                .ToListAsync();

            // Get Receiver Pharmacy Groups
            var receiverPharmacyGroupIds = await _context.PharmacyGroups
                .Where(pg => pg.PharmacyProfileId == shipment.ReceiverPharmacyId && pg.IsActive)
                .Select(pg => pg.GroupId)
                .ToListAsync();
            
            // Check overlaps
            bool isAllowed = senderPharmacyGroupIds.Any(gid => allowedGroupIds.Contains(gid)) || 
                             receiverPharmacyGroupIds.Any(gid => allowedGroupIds.Contains(gid));
                             
            if (!isAllowed)
            {
                return ScanResult.Forbidden("Bu kargoyu taşıma yetkiniz yok. (Hizmet Bölgeniz Dışında)");
            }

            // 4. State Machine - Determine new status
            string newStatusString;
            string message;
            string eventStatus;
            string eventLocation;

            switch (shipment.Status)
            {
                case ShipmentStatus.Pending:
                    // First scan: Pending -> InTransit
                    shipment.Status = ShipmentStatus.InTransit;
                    newStatusString = "in_transit";
                    message = $"✅ Kargo #{shipment.Id} teslim alındı. İlaç: {shipment.Medication?.Name ?? "Bilinmiyor"}";
                    eventStatus = "Kurye Teslim Aldı";
                    eventLocation = $"Kurye: {carrier.FullName}";
                    shipment.CarrierId = carrierId; // Assign carrier
                    break;

                case ShipmentStatus.InTransit:
                    // Second scan: InTransit -> Delivered
                    // Prevent other carriers from delivering? Or only the one who picked it up?
                    // Usually handover is possible, but for simplicity, let's allow any authorized carrier to deliver.
                    // But preferably the same carrier or authorized one. Since we passed Scope Validation, it's allowed.
                    
                    shipment.Status = ShipmentStatus.Delivered;
                    newStatusString = "delivered";
                    message = $"🎉 Kargo #{shipment.Id} başarıyla teslim edildi! İlaç: {shipment.Medication?.Name ?? "Bilinmiyor"}";
                    eventStatus = "Alıcıya Teslim Edildi";
                    eventLocation = shipment.ReceiverPharmacy?.PharmacyName ?? "Alıcı Eczane";
                    break;

                case ShipmentStatus.Delivered:
                    // Already delivered - no action needed
                    return ScanResult.BadRequest($"Bu kargo zaten teslim edilmiş. Sipariş No: {shipment.OrderNumber}");

                case ShipmentStatus.Cancelled:
                    // Cancelled shipment cannot be processed
                    return ScanResult.BadRequest($"Bu kargo iptal edilmiş. Sipariş No: {shipment.OrderNumber}");

                case ShipmentStatus.Shipped:
                    // Shipped -> InTransit (alternative first scan)
                    shipment.Status = ShipmentStatus.InTransit;
                    newStatusString = "in_transit";
                    message = $"✅ Kargo #{shipment.Id} teslim alındı. İlaç: {shipment.Medication?.Name ?? "Bilinmiyor"}";
                    eventStatus = "Kurye Teslim Aldı";
                    eventLocation = $"Kurye: {carrier.FullName}";
                    shipment.CarrierId = carrierId;
                    break;

                default:
                    return ScanResult.BadRequest($"Bilinmeyen kargo durumu: {shipment.Status}");
            }

            // 5. Update shipment timestamp
            shipment.UpdatedAt = DateTime.UtcNow;

            // 6. Create tracking event
            var trackingEvent = new ShipmentEvent
            {
                ShipmentId = shipment.Id,
                Status = eventStatus,
                Location = eventLocation,
                EventDate = DateTime.UtcNow
            };
            _context.ShipmentEvents.Add(trackingEvent);

            // 7. Save changes
            await _context.SaveChangesAsync();

            return ScanResult.Ok(shipment.Id, shipment.OrderNumber, newStatusString, message);
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

        private async Task<List<TrackingEventDto>> GetShipmentEventsAsync(int shipmentId)
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

        /// <summary>
        /// Get tracking status for a shipment (Queue-based visibility algorithm)
        /// Calculates queue position and remaining stops for pharmacy users
        /// </summary>
        public async Task<TrackingResult> GetTrackingStatusAsync(int shipmentId, long pharmacyId)
        {
            // 1. Kargo bilgisini getir ve yetkilendirme kontrolü
            var shipment = await _context.Shipments
                .Include(s => s.AssignedCarrier)
                .FirstOrDefaultAsync(s => s.Id == shipmentId && 
                    (s.SenderPharmacyId == pharmacyId || s.ReceiverPharmacyId == pharmacyId));
            
            if (shipment == null)
                return TrackingResult.NotFound("Kargo bulunamadı veya erişim yetkiniz yok");
            
            // 2. Kurye atanmamışsa veya teslim edildiyse basit response
            if (shipment.CarrierId == null || shipment.Status == ShipmentStatus.Delivered)
            {
                return TrackingResult.Ok(new TrackingStatusDto
                {
                    ShipmentId = shipmentId,
                    ShipmentStatus = TranslateShipmentStatus(shipment.Status),
                    IsLiveTrackingAvailable = false,
                    EstimatedArrival = shipment.Status == ShipmentStatus.Delivered ? "Teslim Edildi" : "Kurye bekleniyor"
                });
            }
            
            // 3. Kuryenin aktif mesai bilgisini al (konum için)
            var activeShift = await _context.CarrierShifts
                .Where(s => s.CarrierId == shipment.CarrierId && s.EndTime == null)
                .FirstOrDefaultAsync();
            
            // 4. Bugünkü tüm teslimatları al ve CreatedAt ile sırala (sabit sıralama)
            var todayStart = DateTime.UtcNow.Date;
            var carrierShipments = await _context.Shipments
                .Where(s => s.CarrierId == shipment.CarrierId && 
                            s.CreatedAt >= todayStart &&
                            (s.Status == ShipmentStatus.InTransit || s.Status == ShipmentStatus.Delivered))
                .OrderBy(s => s.CreatedAt) // CreatedAt for stable ordering
                .ToListAsync();
            
            // 5. Hesaplamalar
            var deliveredCount = carrierShipments.Count(s => s.Status == ShipmentStatus.Delivered);
            var myOrder = carrierShipments.FindIndex(s => s.Id == shipmentId) + 1;
            if (myOrder == 0) myOrder = deliveredCount + 1; // Henüz listeye eklenmemişse
            var remainingStops = Math.Max(0, myOrder - deliveredCount);
            
            // 6. Basit heuristic: Her durak ortalama 15 dk
            var estimatedArrival = remainingStops > 0 
                ? DateTime.Now.AddMinutes(remainingStops * 15).ToString("HH:mm") 
                : "Yakında";
            
            return TrackingResult.Ok(new TrackingStatusDto
            {
                ShipmentId = shipmentId,
                CarrierId = shipment.CarrierId,
                CarrierName = shipment.AssignedCarrier?.FullName,
                CarrierPhone = shipment.AssignedCarrier?.PhoneNumber,
                CarrierLocation = activeShift?.LastLatitude != null ? new CarrierLocationDto
                {
                    Latitude = activeShift.LastLatitude.Value,
                    Longitude = activeShift.LastLongitude!.Value,
                    LastUpdate = activeShift.LastLocationUpdate ?? DateTime.UtcNow
                } : null,
                CurrentStopCount = deliveredCount,
                MyStopOrder = myOrder,
                RemainingStops = remainingStops,
                EstimatedArrival = estimatedArrival,
                ShipmentStatus = TranslateShipmentStatus(shipment.Status),
                IsLiveTrackingAvailable = remainingStops <= 5
            });
        }
    }
}
