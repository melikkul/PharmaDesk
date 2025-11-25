using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public enum OfferStatus
    {
        Active,
        Paused,
        Expired,
        OutOfStock,
        Stopped  // New status for manually stopped offers
    }

    public enum OfferType
    {
        Standard,   // Regular inventory sale
        Campaign,   // Time-limited promotional offer
        Tender      // Bulk order with bidding capability
    }

    public class Offer
    {
        [Key]
        public int Id { get; set; }

        public long PharmacyProfileId { get; set; }
        public int MedicationId { get; set; }
        public int? InventoryItemId { get; set; } // Hangi stoktan düşülecek

        [Required]
        public OfferType Type { get; set; } = OfferType.Standard; // Offer type

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; } // Satış fiyatı

        [Required]
        public int Stock { get; set; } // Satışa açılan adet
        
        public int MinSaleQuantity { get; set; } = 1; // Minimum alım adedi

        public int BonusQuantity { get; set; } = 0; // Verilecek MF

        [Required]
        public OfferStatus Status { get; set; } = OfferStatus.Active;
        
        public DateTime PublishDate { get; set; } = DateTime.UtcNow;
        public DateTime? EndDate { get; set; }
        public DateTime? ExpirationDate { get; set; } // SKT - Son Kullanma Tarihi

        // Campaign-specific fields
        public DateTime? CampaignStartDate { get; set; }
        public DateTime? CampaignEndDate { get; set; }
        public decimal CampaignBonusMultiplier { get; set; } = 1.0m; // Bonus multiplier for campaigns

        // Tender-specific fields
        public int? MinimumOrderQuantity { get; set; } // Minimum order for tender
        public DateTime? BiddingDeadline { get; set; } // Deadline for bidding
        public bool AcceptingCounterOffers { get; set; } = false; // Whether accepting counter offers

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;

        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!;
    }
}
