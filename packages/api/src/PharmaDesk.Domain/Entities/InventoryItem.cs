using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Refactored InventoryItem entity with:
    /// - PostgreSQL xmin concurrency token for stock operations
    /// - ISoftDelete & IAuditable implementation
    /// Critical for preventing "Lost Update" during concurrent stock deductions
    /// </summary>
    public class InventoryItem : BaseEntity
    {
        // Foreign Keys
        public long PharmacyProfileId { get; set; }
        public int MedicationId { get; set; }

        // Stock Fields
        public int Quantity { get; set; }
        public int BonusQuantity { get; set; }
        public int MinStockLevel { get; set; }

        // Pricing
        [Column(TypeName = "decimal(18,2)")]
        public decimal CostPrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? SalePrice { get; set; }

        // Product Info
        [Required, StringLength(50)]
        public string BatchNumber { get; set; } = string.Empty;

        [StringLength(20)]
        public string? ShelfLocation { get; set; }

        public DateTime ExpiryDate { get; set; }
        public bool IsAlarmSet { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // İTS (İlaç Takip Sistemi) Karekod Takibi
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// İTS Karekod - Her ilaç kutusuna özel benzersiz kod
        /// Data Matrix formatında 2D barkod içeriği
        /// </summary>
        [StringLength(100)]
        public string? QRCode { get; set; }

        /// <summary>
        /// İTS'de aktive edilmiş mi? (Satış bildirimi yapıldı mı?)
        /// </summary>
        public bool IsITSActivated { get; set; } = false;

        /// <summary>
        /// İTS aktivasyon tarihi
        /// </summary>
        public DateTime? ITSActivationDate { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Navigation Properties
        // ═══════════════════════════════════════════════════════════════

        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;

        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!;

        public ICollection<Offer> Offers { get; set; } = new List<Offer>();
    }
}
