using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class Medication
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(15)]
        public string ATC { get; set; } = string.Empty;

        [Required, StringLength(255)]
        public string Name { get; set; } = string.Empty;

        [StringLength(200)]
        public string? Manufacturer { get; set; }
        
        [StringLength(100)]
        public string? Barcode { get; set; }
        
        [StringLength(1000)]
        public string? Description { get; set; }
        
        [StringLength(100)]
        public string? PackageType { get; set; } // Tablet, Şurup, vb.

        [Column(TypeName = "decimal(18,2)")]
        public decimal BasePrice { get; set; } // İlaç Fiyat Kararnamesi fiyatı

        /// <summary>
        /// Alliance Healthcare API'deki ItemID - Barem sorgusu için kullanılır
        /// </summary>
        public int? ExternalApiId { get; set; }

        /// <summary>
        /// Muadil ilaç barkodları (JSON array formatında)
        /// </summary>
        [StringLength(2000)]
        public string? Alternatives { get; set; }

        public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
    }
}