using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    /// <summary>
    /// Barem (iskonto/satış koşulları) bilgisi DTO
    /// Alliance Healthcare API'den anlık olarak çekilir, veritabanına kaydedilmez
    /// </summary>
    public class BaremInfoDto
    {
        public int WarehouseId { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
        
        /// <summary>
        /// Vade (ödeme vadesi gün olarak)
        /// </summary>
        public int Vade { get; set; }
        
        /// <summary>
        /// Minimum sipariş adedi
        /// </summary>
        public int MinimumAdet { get; set; } = 1;
        
        /// <summary>
        /// Mal fazlası formatı: "10+1" (10 alana 1 bedava) veya sayı olarak bonus adedi
        /// </summary>
        public string MalFazlasi { get; set; } = string.Empty;
        
        /// <summary>
        /// Kurum iskontosu yüzdesi
        /// </summary>
        public decimal IskontoKurum { get; set; }
        
        /// <summary>
        /// Ticari iskonto yüzdesi
        /// </summary>
        public decimal IskontoTicari { get; set; }
        
        /// <summary>
        /// Vergi hariç birim fiyat
        /// </summary>
        public decimal BirimFiyat { get; set; }
        
        // Legacy fields for backward compatibility
        public decimal DiscountPercentage { get; set; }
        public decimal MaxPrice { get; set; }
        public int MinQuantity { get; set; }
        public int BonusQuantity { get; set; }
        
        /// <summary>
        /// Barem tipi: "warehouse" (depo baremi) veya "manufacturer" (üretici baremi)
        /// </summary>
        public string BaremType { get; set; } = "warehouse";
    }

    /// <summary>
    /// İlaç detayı + anlık barem bilgisi DTO
    /// </summary>
    public class DrugDetailWithBaremDto
    {
        public int Id { get; set; }
        public int? ExternalApiId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public string? Manufacturer { get; set; }
        public decimal BasePrice { get; set; }
        public string? PackageType { get; set; }
        public List<string>? Alternatives { get; set; }
        
        /// <summary>
        /// Anlık barem bilgileri - veritabanına kaydedilmez (transient data)
        /// </summary>
        public List<BaremInfoDto> Barems { get; set; } = new();
        
        /// <summary>
        /// Barem verisinin ne zaman çekildiği
        /// </summary>
        public DateTime? BaremFetchedAt { get; set; }
        
        /// <summary>
        /// Barem verisi çekilirken hata oluştu mu?
        /// </summary>
        public string? BaremError { get; set; }
    }

    /// <summary>
    /// Alliance Healthcare API Response parsing için
    /// </summary>
    public class AllianceItemDetailResponse
    {
        public bool Result { get; set; }
        public string? Message { get; set; }
        public string? ItemDetailString { get; set; }
    }
}
