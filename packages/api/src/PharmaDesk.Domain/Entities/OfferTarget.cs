using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Join table for Offer-PharmacyProfile many-to-many relationship (targets)
    /// Replaces the comma-separated TargetPharmacyIds string (1NF normalization)
    /// </summary>
    public class OfferTarget
    {
        // Composite primary key: OfferId + TargetPharmacyId
        public int OfferId { get; set; }
        public long TargetPharmacyId { get; set; }

        // Additional metadata
        public DateTime AddedAt { get; set; } = DateTime.UtcNow;

        // 🆕 Joint Order Conversion için
        /// <summary>Bu katılımcının talep ettiği/ekleyeceği adet</summary>
        public int RequestedQuantity { get; set; } = 0;
        
        /// <summary>Bu kullanıcı tedarikçi/sorumlu mu? (Depodan sipariş veren)</summary>
        public bool IsSupplier { get; set; } = false;

        // Navigation properties
        [ForeignKey(nameof(OfferId))]
        public Offer Offer { get; set; } = null!;

        [ForeignKey(nameof(TargetPharmacyId))]
        public PharmacyProfile TargetPharmacy { get; set; } = null!;
    }
}
