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
        StockSale,       // Stok Satışı
        JointOrder,      // Ortak Sipariş
        PurchaseRequest  // Alım Talebi
    }

    public class Offer
    {
        [Key]
        public int Id { get; set; }

        public long PharmacyProfileId { get; set; }
        public int MedicationId { get; set; }
        public int? InventoryItemId { get; set; } // Hangi stoktan düşülecek

        [Required]
        public OfferType Type { get; set; } = OfferType.StockSale; // Offer type
        
        // Eczaneye özel teklif için hedef eczane ID'leri (virgülle ayrılmış)
        public string? TargetPharmacyIds { get; set; }
        
        // Bu teklif özel mi?
        public bool IsPrivate { get; set; } = false;
        
        // Seçilen barem referansı
        public int? WarehouseBaremId { get; set; }
        
        // Fiyat validasyonu için maksimum limit (Barem fiyatı)
        [Column(TypeName = "decimal(18,2)")]
        public decimal MaxPriceLimit { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; } // Satış fiyatı

        [Required]
        public int Stock { get; set; } // Satışa açılan adet
        
        public int MinSaleQuantity { get; set; } = 1; // Minimum alım adedi

        public int BonusQuantity { get; set; } = 0; // Verilecek MF

        // New Financial Fields
        [Column(TypeName = "decimal(18,2)")]
        public decimal DepotPrice { get; set; } // Depo Fiyatı

        public string? MalFazlasi { get; set; } // Format: "X+Y" (e.g., "10+2")

        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountPercentage { get; set; } // İskonto Oranı

        [Column(TypeName = "decimal(18,2)")]
        public decimal NetPrice { get; set; } // Net Birim Maliyet

        public int? MaxSaleQuantity { get; set; } // Maksimum Satış Adedi

        public int SoldQuantity { get; set; } = 0; // Satılan/Sipariş geçilen adet (default 0)

        public string? Description { get; set; } // Açıklama

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
        public string? TargetPharmacyId { get; set; } // For Pharmacy Specific Offers

        // 🆕 Depo Sorumlusu - Ortak Sipariş için depodan söyleyecek kişi
        // TODO: Migration yapıldıktan sonra [NotMapped] kaldırılacak
        [NotMapped]
        public long? DepotClaimerUserId { get; set; } // Depodan sipariş geçeceğini söyleyen kullanıcı
        [NotMapped]
        public DateTime? DepotClaimedAt { get; set; } // Ne zaman üstlendiği

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;

        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!;
    }
}
