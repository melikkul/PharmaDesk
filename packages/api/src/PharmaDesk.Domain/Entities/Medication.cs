using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Refactored Medication entity with:
    /// - JSONB columns for Alternatives and AllImagePaths (PostgreSQL native)
    /// - PostgreSQL xmin concurrency token
    /// - ISoftDelete & IAuditable implementation
    /// </summary>
    public class Medication : BaseEntity
    {
        [Required, StringLength(255)]
        public string Name { get; set; } = string.Empty;

        [Required, StringLength(15)]
        public string ATC { get; set; } = string.Empty; // ATC code

        [StringLength(100)]
        public string? Barcode { get; set; }

        [StringLength(200)]
        public string? Manufacturer { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        [StringLength(100)]
        public string? PackageType { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal BasePrice { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Image Fields
        // ═══════════════════════════════════════════════════════════════

        [StringLength(500)]
        public string? ImagePath { get; set; } // Primary image path

        public int ImageCount { get; set; } = 1;

        // 🆕 JSONB: All image paths as native PostgreSQL jsonb array
        // Configured in DbContext: .HasColumnType("jsonb")
        [Column(TypeName = "jsonb")]
        public List<string>? AllImagePaths { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Alternative Medications (JSONB)
        // ═══════════════════════════════════════════════════════════════

        // 🆕 JSONB: Alternative medication barcodes/ATCs as native PostgreSQL jsonb array
        // Configured in DbContext: .HasColumnType("jsonb")
        [Column(TypeName = "jsonb")]
        public List<string>? Alternatives { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // External Integration
        // ═══════════════════════════════════════════════════════════════

        public int? ExternalApiId { get; set; } // Alliance Healthcare API ID

        // ═══════════════════════════════════════════════════════════════
        // İTS (İlaç Takip Sistemi) ve Medula Entegrasyonu
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Global Trade Item Number - GTIN (14 haneli barkod)
        /// İTS kaydı için zorunlu
        /// </summary>
        [StringLength(14)]
        public string? GTIN { get; set; }

        /// <summary>
        /// Medula ilaç kodu - SGK entegrasyonu için
        /// </summary>
        [StringLength(20)]
        public string? MedulaCode { get; set; }

        /// <summary>
        /// İlaç İTS bildirimine tabi mi?
        /// </summary>
        public bool RequiresITS { get; set; } = false;

        // ═══════════════════════════════════════════════════════════════
        // Navigation Properties
        // ═══════════════════════════════════════════════════════════════

        public ICollection<Offer> Offers { get; set; } = new List<Offer>();
        public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
        public ICollection<MarketDemand> MarketDemands { get; set; } = new List<MarketDemand>();
        public ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();
    }
}
