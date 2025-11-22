using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public enum OfferStatus
    {
        Active,
        Paused,
        Expired,
        OutOfStock
    }

    public class Offer
    {
        [Key]
        public int Id { get; set; }

        public int PharmacyProfileId { get; set; }
        public int MedicationId { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; } // Satış fiyatı

        [Required]
        public int Stock { get; set; } // Satışa açılan adet

        public int BonusQuantity { get; set; } = 0; // Verilecek MF

        [Required]
        public OfferStatus Status { get; set; } = OfferStatus.Active;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;

        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!;
    }
}
