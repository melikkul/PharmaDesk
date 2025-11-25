using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class WarehouseBarem
    {
        [Key]
        public int Id { get; set; }

        public int MedicationId { get; set; }

        [Required, StringLength(100)]
        public string WarehouseName { get; set; } = string.Empty;

        public int MinQuantity { get; set; } // Barem alt limiti

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        public int BonusRate { get; set; } = 0; // MF Oranı (%)

        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

        // Navigation Property
        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!;
    }
}
