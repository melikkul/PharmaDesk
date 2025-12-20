using Backend.Dtos;

namespace Backend.Services
{
    /// <summary>
    /// Shipment business logic operations interface
    /// Separates business logic from controller for better testability and maintainability
    /// </summary>
    public interface IShipmentService
    {
        /// <summary>
        /// Get shipments for a pharmacy with optional filtering
        /// </summary>
        Task<IEnumerable<ShipmentDto>> GetShipmentsAsync(
            long pharmacyId,
            string? type = null,
            int page = 1,
            int pageSize = 50,
            int? groupId = null);
        
        /// <summary>
        /// Get a single shipment by ID
        /// </summary>
        Task<ShipmentResult> GetShipmentByIdAsync(int id, long pharmacyId);
        
        /// <summary>
        /// Create a new shipment
        /// </summary>
        Task<ShipmentResult> CreateShipmentAsync(CreateShipmentRequest request, long pharmacyId);
        
        /// <summary>
        /// Scan a shipment QR code and update status (State Machine)
        /// Pending -> InTransit -> Delivered
        /// </summary>
        Task<ScanResult> ScanShipmentAsync(string encryptedToken, int carrierId);
        
        /// <summary>
        /// Get tracking status for a shipment (Queue-based visibility algorithm)
        /// Used by pharmacy users to track their deliveries
        /// </summary>
        Task<TrackingResult> GetTrackingStatusAsync(int shipmentId, long pharmacyId);
    }

    /// <summary>
    /// Result type for shipment operations
    /// </summary>
    public class ShipmentResult
    {
        public bool Success { get; set; }
        public ShipmentDto? Data { get; set; }
        public string? ErrorMessage { get; set; }
        public int? ErrorCode { get; set; }

        public static ShipmentResult Ok(ShipmentDto data) => new() { Success = true, Data = data };
        public static ShipmentResult NotFound(string message = "Shipment not found") => new() { Success = false, ErrorMessage = message, ErrorCode = 404 };
        public static ShipmentResult BadRequest(string message) => new() { Success = false, ErrorMessage = message, ErrorCode = 400 };
        public static ShipmentResult Unauthorized(string message = "Pharmacy not found") => new() { Success = false, ErrorMessage = message, ErrorCode = 401 };
    }
    
    /// <summary>
    /// Result type for QR scan operations (state machine)
    /// </summary>
    public class ScanResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? NewStatus { get; set; }
        public int? ShipmentId { get; set; }
        public string? OrderNumber { get; set; }
        public int? ErrorCode { get; set; }

        public static ScanResult Ok(int shipmentId, string orderNumber, string newStatus, string message) => new() 
        { 
            Success = true, 
            ShipmentId = shipmentId,
            OrderNumber = orderNumber,
            NewStatus = newStatus, 
            Message = message 
        };
        
        public static ScanResult NotFound(string message = "Kargo bulunamadı") => new() 
        { 
            Success = false, 
            Message = message, 
            ErrorCode = 404 
        };
        
        public static ScanResult BadRequest(string message) => new() 
        { 
            Success = false, 
            Message = message, 
            ErrorCode = 400 
        };
        
        public static ScanResult InvalidToken(string message = "Geçersiz veya bozulmuş QR kod") => new() 
        { 
            Success = false, 
            Message = message, 
            ErrorCode = 400 
        };

        public static ScanResult Forbidden(string message = "Yetkisiz işlem") => new() 
        { 
            Success = false, 
            Message = message, 
            ErrorCode = 403 
        };
    }
}
