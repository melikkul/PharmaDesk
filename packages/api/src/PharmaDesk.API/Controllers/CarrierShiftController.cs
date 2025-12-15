using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/carrier/shift")]
    [ApiController]
    [Authorize(Roles = "Carrier")]
    public class CarrierShiftController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<CarrierShiftController> _logger;

        public CarrierShiftController(AppDbContext context, ILogger<CarrierShiftController> logger)
        {
            _context = context;
            _logger = logger;
        }

        private int GetCarrierId()
        {
            var idClaim = User.FindFirst("id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(idClaim, out var id) ? id : 0;
        }

        /// <summary>
        /// Get current shift status
        /// </summary>
        [HttpGet("status")]
        public async Task<ActionResult<ShiftStatusResponse>> GetStatus()
        {
            var carrierId = GetCarrierId();
            if (carrierId == 0)
                return Unauthorized(new { error = "Geçersiz kullanıcı" });

            // Find active shift (no EndTime)
            var activeShift = await _context.CarrierShifts
                .Where(s => s.CarrierId == carrierId && s.EndTime == null)
                .OrderByDescending(s => s.StartTime)
                .FirstOrDefaultAsync();

            if (activeShift == null)
            {
                return Ok(new ShiftStatusResponse
                {
                    IsOnShift = false,
                    ShiftId = null,
                    StartTime = null,
                    DurationMinutes = 0,
                    DurationFormatted = "0:00"
                });
            }

            var duration = DateTime.UtcNow - activeShift.StartTime;
            var totalMinutes = (int)duration.TotalMinutes;
            var hours = totalMinutes / 60;
            var minutes = totalMinutes % 60;

            return Ok(new ShiftStatusResponse
            {
                IsOnShift = true,
                ShiftId = activeShift.Id,
                StartTime = activeShift.StartTime,
                DurationMinutes = totalMinutes,
                DurationFormatted = $"{hours}:{minutes:D2}"
            });
        }

        /// <summary>
        /// Start a new shift
        /// </summary>
        [HttpPost("start")]
        public async Task<ActionResult<StartShiftResponse>> StartShift([FromBody] StartShiftRequest? request)
        {
            var carrierId = GetCarrierId();
            if (carrierId == 0)
                return Unauthorized(new { error = "Geçersiz kullanıcı" });

            // Check if already on shift
            var existingShift = await _context.CarrierShifts
                .Where(s => s.CarrierId == carrierId && s.EndTime == null)
                .FirstOrDefaultAsync();

            if (existingShift != null)
            {
                return BadRequest(new { error = "Zaten aktif bir mesainiz var", shiftId = existingShift.Id });
            }

            // Create new shift
            var shift = new CarrierShift
            {
                CarrierId = carrierId,
                StartTime = DateTime.UtcNow,
                LastLatitude = request?.Latitude,
                LastLongitude = request?.Longitude,
                LastLocationUpdate = request?.Latitude != null ? DateTime.UtcNow : null
            };

            _context.CarrierShifts.Add(shift);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Carrier {CarrierId} started shift {ShiftId} at {Time}", 
                carrierId, shift.Id, shift.StartTime);

            return Ok(new StartShiftResponse
            {
                Success = true,
                ShiftId = shift.Id,
                StartTime = shift.StartTime,
                Message = "Mesai başladı. İyi çalışmalar! 🚀"
            });
        }

        /// <summary>
        /// End current shift
        /// </summary>
        [HttpPost("end")]
        public async Task<ActionResult<EndShiftResponse>> EndShift([FromBody] EndShiftRequest? request)
        {
            var carrierId = GetCarrierId();
            if (carrierId == 0)
                return Unauthorized(new { error = "Geçersiz kullanıcı" });

            // Find active shift
            var activeShift = await _context.CarrierShifts
                .Where(s => s.CarrierId == carrierId && s.EndTime == null)
                .FirstOrDefaultAsync();

            if (activeShift == null)
            {
                return BadRequest(new { error = "Aktif mesai bulunamadı" });
            }

            // End the shift
            activeShift.EndTime = DateTime.UtcNow;
            activeShift.DurationMinutes = (int)(activeShift.EndTime.Value - activeShift.StartTime).TotalMinutes;
            
            if (request?.Latitude != null)
            {
                activeShift.LastLatitude = request.Latitude;
                activeShift.LastLongitude = request.Longitude;
                activeShift.LastLocationUpdate = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Carrier {CarrierId} ended shift {ShiftId}. Duration: {Duration} minutes", 
                carrierId, activeShift.Id, activeShift.DurationMinutes);

            var hours = activeShift.DurationMinutes / 60;
            var minutes = activeShift.DurationMinutes % 60;

            return Ok(new EndShiftResponse
            {
                Success = true,
                ShiftId = activeShift.Id,
                StartTime = activeShift.StartTime,
                EndTime = activeShift.EndTime.Value,
                DurationMinutes = activeShift.DurationMinutes ?? 0,
                Message = $"Mesai bitti. Bugün {hours} saat {minutes} dakika çalıştınız. 👏"
            });
        }

        /// <summary>
        /// Update location during active shift
        /// </summary>
        [HttpPost("location")]
        public async Task<ActionResult> UpdateLocation([FromBody] UpdateLocationRequest request)
        {
            var carrierId = GetCarrierId();
            if (carrierId == 0)
                return Unauthorized(new { error = "Geçersiz kullanıcı" });

            // Find active shift
            var activeShift = await _context.CarrierShifts
                .Where(s => s.CarrierId == carrierId && s.EndTime == null)
                .FirstOrDefaultAsync();

            if (activeShift == null)
            {
                return BadRequest(new { error = "Aktif mesai bulunamadı" });
            }

            // Update location
            activeShift.LastLatitude = request.Latitude;
            activeShift.LastLongitude = request.Longitude;
            activeShift.LastLocationUpdate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        /// <summary>
        /// Get shift history for carrier
        /// </summary>
        [HttpGet("history")]
        public async Task<ActionResult> GetShiftHistory([FromQuery] int days = 7)
        {
            var carrierId = GetCarrierId();
            if (carrierId == 0)
                return Unauthorized(new { error = "Geçersiz kullanıcı" });

            var since = DateTime.UtcNow.AddDays(-days);

            var shifts = await _context.CarrierShifts
                .Where(s => s.CarrierId == carrierId && s.StartTime >= since)
                .OrderByDescending(s => s.StartTime)
                .Select(s => new
                {
                    s.Id,
                    s.StartTime,
                    s.EndTime,
                    s.DurationMinutes,
                    IsActive = s.EndTime == null
                })
                .ToListAsync();

            var totalMinutes = shifts.Where(s => s.DurationMinutes.HasValue).Sum(s => s.DurationMinutes ?? 0);
            var totalHours = totalMinutes / 60;

            return Ok(new
            {
                shifts,
                summary = new
                {
                    totalShifts = shifts.Count,
                    totalMinutes,
                    totalHoursFormatted = $"{totalHours} saat {totalMinutes % 60} dakika"
                }
            });
        }

        /// <summary>
        /// Get all currently active carriers with their locations (Admin only)
        /// </summary>
        [HttpGet("active-carriers")]
        [Authorize(Roles = "Admin,User")]
        public async Task<ActionResult> GetActiveCarriers()
        {
            var activeCarriers = await _context.CarrierShifts
                .Where(s => s.EndTime == null)
                .Include(s => s.Carrier)
                .Select(s => new
                {
                    CarrierId = s.CarrierId,
                    CarrierName = s.Carrier!.FirstName + " " + s.Carrier.LastName,
                    Email = s.Carrier.Email,
                    PhoneNumber = s.Carrier.PhoneNumber,
                    ShiftId = s.Id,
                    ShiftStartTime = s.StartTime,
                    Latitude = s.LastLatitude,
                    Longitude = s.LastLongitude,
                    LastLocationUpdate = s.LastLocationUpdate,
                    IsOnShift = true
                })
                .ToListAsync();

            return Ok(activeCarriers);
        }

        /// <summary>
        /// Get shipments assigned to this carrier or available in carrier's regions
        /// Includes real-time status from database
        /// </summary>
        [HttpGet("shipments")]
        public async Task<ActionResult> GetMyShipments()
        {
            var carrierId = GetCarrierId();
            if (carrierId == 0)
                return Unauthorized(new { error = "Geçersiz kullanıcı" });

            // Get carrier's assigned groups
            var carrier = await _context.Carriers
                .Include(c => c.CarrierGroups)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == carrierId);

            if (carrier == null)
                return NotFound(new { error = "Kurye bulunamadı" });

            var allowedGroupIds = carrier.CarrierGroups.Select(cg => cg.GroupId).ToList();

            // Get shipments:
            // 1. Directly assigned to this carrier (CarrierId = carrierId)
            // 2. OR in carrier's regions (Pending/Shipped status only) with no carrier assigned
            var shipments = await _context.Shipments
                .Include(s => s.Medication)
                .Include(s => s.SenderPharmacy)
                .Include(s => s.ReceiverPharmacy)
                .Where(s => 
                    // Directly assigned to this carrier
                    s.CarrierId == carrierId ||
                    // OR available in carrier's regions (no carrier assigned yet, pending/shipped only)
                    (s.CarrierId == null && 
                     (s.Status == ShipmentStatus.Pending || s.Status == ShipmentStatus.Shipped) &&
                     (_context.PharmacyGroups.Any(pg => 
                         pg.IsActive && 
                         allowedGroupIds.Contains(pg.GroupId) &&
                         (pg.PharmacyProfileId == s.SenderPharmacyId || pg.PharmacyProfileId == s.ReceiverPharmacyId)))))
                .OrderBy(s => s.Id) // Stable order by ID - list order stays the same after scanning
                .Take(20) // Limit to recent 20
                .Select(s => new CarrierShipmentDto
                {
                    Id = s.Id,
                    OrderNumber = s.OrderNumber,
                    PharmacyName = s.ReceiverPharmacy!.PharmacyName,
                    // Format: "İlçe/İl" - short format for mobile
                    PharmacyAddress = !string.IsNullOrEmpty(s.ReceiverPharmacy.District) && !string.IsNullOrEmpty(s.ReceiverPharmacy.City)
                        ? $"{s.ReceiverPharmacy.District}/{s.ReceiverPharmacy.City}"
                        : (s.ReceiverPharmacy.City ?? s.ReceiverPharmacy.Address ?? "Adres belirtilmemiş"),
                    PharmacyPhone = s.ReceiverPharmacy.PhoneNumber,
                    // Note: PharmacyProfile doesn't have Lat/Lng - leaving null
                    PharmacyLat = null,
                    PharmacyLng = null,
                    MedicationName = s.Medication != null ? s.Medication.Name : null,
                    Quantity = s.Quantity,
                    Status = s.Status.ToString().ToLower(),
                    StatusText = TranslateShipmentStatus(s.Status),
                    IsAssignedToMe = s.CarrierId == carrierId,
                    UpdatedAt = s.UpdatedAt
                })
                .ToListAsync();

            // Find the "next" pharmacy - first pending/in_transit shipment
            var nextShipment = shipments.FirstOrDefault(s => 
                s.Status == "pending" || s.Status == "intransit" || s.Status == "shipped");

            return Ok(new 
            {
                shipments,
                nextPharmacy = nextShipment != null ? new {
                    id = nextShipment.Id,
                    pharmacyName = nextShipment.PharmacyName,
                    pharmacyAddress = nextShipment.PharmacyAddress,
                    pharmacyPhone = nextShipment.PharmacyPhone,
                    lat = nextShipment.PharmacyLat,
                    lng = nextShipment.PharmacyLng,
                    status = nextShipment.Status
                } : null,
                totalCount = shipments.Count,
                pendingCount = shipments.Where(s => s.Status == "pending" || s.Status == "shipped").Count(),
                inTransitCount = shipments.Where(s => s.Status == "intransit").Count(),
                deliveredCount = shipments.Where(s => s.Status == "delivered").Count()
            });
        }

        private static string TranslateShipmentStatus(ShipmentStatus status)
        {
            return status switch
            {
                ShipmentStatus.Pending => "Beklemede",
                ShipmentStatus.Shipped => "Gönderildi",
                ShipmentStatus.InTransit => "Yolda",
                ShipmentStatus.Delivered => "Teslim Edildi",
                ShipmentStatus.Cancelled => "İptal",
                _ => status.ToString()
            };
        }
    }

    // DTO for carrier shipment list
    public class CarrierShipmentDto
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = "";
        public string PharmacyName { get; set; } = "";
        public string PharmacyAddress { get; set; } = "";
        public string? PharmacyPhone { get; set; }
        public double? PharmacyLat { get; set; }
        public double? PharmacyLng { get; set; }
        public string? MedicationName { get; set; }
        public int Quantity { get; set; }
        public string Status { get; set; } = "";
        public string StatusText { get; set; } = "";
        public bool IsAssignedToMe { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
