using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public enum ShipmentStatus
    {
        Pending,    // Beklemede
        Shipped,    // Kargoya Verildi
        InTransit,  // Yolda
        Delivered,  // Teslim Edildi
        Cancelled   // İptal Edildi
    }

    public class Shipment
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(50)]
        public string OrderNumber { get; set; } = string.Empty; // Sipariş numarası
        
        public int? OrderId { get; set; } // Bağlı sipariş

        public long SenderPharmacyId { get; set; }
        public long ReceiverPharmacyId { get; set; }
        public int MedicationId { get; set; }

        [Required]
        public int Quantity { get; set; } // Gönderilen miktar

        [Required, StringLength(100)]
        public string TrackingNumber { get; set; } = string.Empty; // Kargo takip no

        [Required]
        public ShipmentStatus Status { get; set; } = ShipmentStatus.Pending;

        [Required, StringLength(100)]
        public string Carrier { get; set; } = string.Empty; // Kargo firması adı (Legacy) Or Display Name
        
        public int? CarrierId { get; set; } // İşlemi yapan/taşıyan kurye ID
        [ForeignKey("CarrierId")]
        public Carrier? AssignedCarrier { get; set; }

        public DateTime? ShippedDate { get; set; } // Kargoya verilme tarihi
        public DateTime? EstimatedDeliveryDate { get; set; } // Tahmini teslimat
        
        [StringLength(200)]
        public string? CurrentLocation { get; set; } // Güncel konum

        // ═══════════════════════════════════════════════════════════════
        // Cold Chain (Soğuk Zincir) Takibi
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Gönderi soğuk zincir gerektiriyor mu? (Aşı, insulin vb.)
        /// </summary>
        public bool RequiresColdChain { get; set; } = false;

        /// <summary>
        /// Minimum taşıma sıcaklığı (°C) - Soğuk zincir için zorunlu
        /// </summary>
        [Column(TypeName = "decimal(5,2)")]
        public decimal? MinTemperature { get; set; }

        /// <summary>
        /// Maksimum taşıma sıcaklığı (°C) - Soğuk zincir için zorunlu
        /// </summary>
        [Column(TypeName = "decimal(5,2)")]
        public decimal? MaxTemperature { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Taşınan Ürün Detayları (SKT ve Parti Takibi)
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Taşınan ürünün parti numarası
        /// </summary>
        [StringLength(50)]
        public string? BatchNumber { get; set; }

        /// <summary>
        /// Taşınan ürünün son kullanma tarihi (SKT)
        /// </summary>
        public DateTime? ProductExpiryDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        [ForeignKey(nameof(SenderPharmacyId))]
        public PharmacyProfile SenderPharmacy { get; set; } = null!;

        [ForeignKey(nameof(ReceiverPharmacyId))]
        public PharmacyProfile ReceiverPharmacy { get; set; } = null!;

        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!;
    }
}
