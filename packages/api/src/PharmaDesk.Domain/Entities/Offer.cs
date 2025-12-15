using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public enum OfferStatus
    {
        Active,
        Passive, 
        Expired,
        Sold
    }

    public enum OfferType
    {
        StockSale,      // Stok Satış
        JointOrder,     // Ortak Sipariş
        PurchaseRequest // Alım Talebi
    }

    /// <summary>
    /// Refactored Offer entity with:
    /// - OfferTarget collection instead of TargetPharmacyIds string (1NF)
    /// - PostgreSQL xmin concurrency token
    /// - ISoftDelete & IAuditable implementation
    /// </summary>
    public class Offer : BaseEntity
    {
        // Foreign Keys
        public long PharmacyProfileId { get; set; }
        public int MedicationId { get; set; }
        public int? InventoryItemId { get; set; }
        public int? WarehouseBaremId { get; set; }

        // Core Fields
        [Required]
        public OfferType Type { get; set; }

        [Required]
        public OfferStatus Status { get; set; } = OfferStatus.Active;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        public int Stock { get; set; }
        public int BonusQuantity { get; set; }
        public int MinSaleQuantity { get; set; }
        public int? MaxSaleQuantity { get; set; }
        public int SoldQuantity { get; set; }

        // Pricing Fields
        [Column(TypeName = "decimal(18,2)")]
        public decimal DepotPrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountPercentage { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal NetPrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal MaxPriceLimit { get; set; }

        // Barem Info
        public string? MalFazlasi { get; set; } // e.g., "10+2"

        // Date Fields
        public DateTime? ExpirationDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime PublishDate { get; set; } = DateTime.UtcNow;

        // Campaign Fields (for JointOrder)
        public DateTime? CampaignStartDate { get; set; }
        public DateTime? CampaignEndDate { get; set; }
        public decimal CampaignBonusMultiplier { get; set; }

        // Purchase Request Fields
        public int? MinimumOrderQuantity { get; set; }
        public DateTime? BiddingDeadline { get; set; }
        public bool AcceptingCounterOffers { get; set; }

        // Private Offer Fields
        public bool IsPrivate { get; set; }
        
        // ⚠️ DEPRECATED: Use OfferTargets collection instead
        // Kept for backwards compatibility during migration
        [Obsolete("Use OfferTargets collection instead")]
        public string? TargetPharmacyId { get; set; }
        
        [Obsolete("Use OfferTargets collection instead")]
        public string? TargetPharmacyIds { get; set; }

        // Depot Fields
        public long? DepotClaimerUserId { get; set; }
        public DateTime? DepotClaimedAt { get; set; }

        // 🆕 Finalization Tracking (for Provision/Capture Pattern)
        /// <summary>
        /// Teklif sonlandırılmış mı? (Stok tükendi veya manuel kapatıldı)
        /// </summary>
        public bool IsFinalized { get; set; } = false;
        
        /// <summary>
        /// Ödeme işlendi mi? (ProcessBalance çağrıldı mı)
        /// </summary>
        public bool IsPaymentProcessed { get; set; } = false;

        // Description
        public string? Description { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Navigation Properties
        // ═══════════════════════════════════════════════════════════════

        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;

        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!;

        [ForeignKey(nameof(InventoryItemId))]
        public InventoryItem? InventoryItem { get; set; }

        [ForeignKey(nameof(WarehouseBaremId))]
        public WarehouseBarem? WarehouseBarem { get; set; }

        // 🆕 Normalized Target Pharmacies Collection (replaces TargetPharmacyIds string)
        public ICollection<OfferTarget> OfferTargets { get; set; } = new List<OfferTarget>();

        // Related entities
        public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
        public ICollection<StockLock> StockLocks { get; set; } = new List<StockLock>();
        public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    }
}
