using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class InventoryItem
    {
        [Key]
        public int Id { get; set; }

        public int PharmacyProfileId { get; set; }
        public int MedicationId { get; set; }

        [Required]
        public int Quantity { get; set; }

        [StringLength(50)]
        public string BatchNumber { get; set; } = string.Empty; // parti no

        public DateTime ExpiryDate { get; set; } // miadi
        
        // --- YENİ ALANLAR: Maliyet ve Satış Fiyatı Takibi ---
        [Column(TypeName = "decimal(18,2)")]
        public decimal CostPrice { get; set; } = 0; // İlacın eczaneye maliyeti (birim fiyat)
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal? SalePrice { get; set; } // Eczanenin satış fiyatı (opsiyonel, teklif için baz)
        
        public int BonusQuantity { get; set; } = 0; // Mal fazlası (MF) stok

        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!; // hangi eczanenin 

        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!; // hangi ilaca ait
    }
}