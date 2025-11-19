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

        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!; // hangi eczanenin 

        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!; // hangi ilaca ait
    }
}