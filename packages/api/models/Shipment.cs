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

        public int SenderPharmacyId { get; set; }
        public int ReceiverPharmacyId { get; set; }
        public int MedicationId { get; set; }

        [Required]
        public int Quantity { get; set; } // Gönderilen miktar

        [Required, StringLength(100)]
        public string TrackingNumber { get; set; } = string.Empty; // Kargo takip no

        [Required]
        public ShipmentStatus Status { get; set; } = ShipmentStatus.Pending;

        [Required, StringLength(100)]
        public string Carrier { get; set; } = string.Empty; // Kargo firması (Yurtiçi, MNG, Aras, vb.)

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // JSON formatında kargo geçmişi (TrackingEvent array)
        [Column(TypeName = "jsonb")]
        public string? TrackingHistory { get; set; }

        // Navigation Properties
        [ForeignKey(nameof(SenderPharmacyId))]
        public PharmacyProfile SenderPharmacy { get; set; } = null!;

        [ForeignKey(nameof(ReceiverPharmacyId))]
        public PharmacyProfile ReceiverPharmacy { get; set; } = null!;

        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!;
    }
}
