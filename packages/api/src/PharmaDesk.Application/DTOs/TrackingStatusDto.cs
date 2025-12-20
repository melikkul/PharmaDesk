namespace Backend.Dtos
{
    /// <summary>
    /// Eczane kullanıcıları için kargo takip durumu DTO
    /// Kuyruk bazlı görünürlük algoritması ile canlı takip bilgisi
    /// </summary>
    public class TrackingStatusDto
    {
        public int ShipmentId { get; set; }
        
        /// <summary>Atanmış kurye ID (null ise henüz atanmamış)</summary>
        public int? CarrierId { get; set; }
        
        /// <summary>Kurye adı</summary>
        public string? CarrierName { get; set; }
        
        /// <summary>Kurye telefonu</summary>
        public string? CarrierPhone { get; set; }
        
        /// <summary>Kuryenin son bilinen konumu</summary>
        public CarrierLocationDto? CarrierLocation { get; set; }
        
        /// <summary>Kuryenin bugün teslim ettiği adet</summary>
        public int CurrentStopCount { get; set; }
        
        /// <summary>Bu siparişin teslimat sırasındaki yeri</summary>
        public int MyStopOrder { get; set; }
        
        /// <summary>Hesaplama: MyStopOrder - CurrentStopCount</summary>
        public int RemainingStops { get; set; }
        
        /// <summary>Tahmini varış zamanı (HH:mm formatında)</summary>
        public string? EstimatedArrival { get; set; }
        
        /// <summary>Kargo durumu: "pending", "in_transit", "delivered"</summary>
        public string ShipmentStatus { get; set; } = string.Empty;
        
        /// <summary>Canlı takip aktif mi? (RemainingStops <= 5)</summary>
        public bool IsLiveTrackingAvailable { get; set; }
    }

    /// <summary>
    /// Kurye konum bilgisi DTO
    /// </summary>
    public class CarrierLocationDto
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public DateTime LastUpdate { get; set; }
    }

    /// <summary>
    /// Tracking status service result wrapper
    /// </summary>
    public class TrackingResult
    {
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public int ErrorCode { get; set; }
        public TrackingStatusDto? Data { get; set; }

        public static TrackingResult Ok(TrackingStatusDto data) => new() { Success = true, Data = data };
        public static TrackingResult NotFound(string message) => new() { Success = false, ErrorMessage = message, ErrorCode = 404 };
        public static TrackingResult BadRequest(string message) => new() { Success = false, ErrorMessage = message, ErrorCode = 400 };
    }
}
