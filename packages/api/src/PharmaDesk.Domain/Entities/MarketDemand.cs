using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class MarketDemand
    {
        [Key]
        public int Id { get; set; }

        public int MedicationId { get; set; }

        public int SearchCount { get; set; } = 0;

        public DateTime LastSearchedDate { get; set; } = DateTime.UtcNow;

        [StringLength(100)]
        public string? City { get; set; } // Bölgesel analiz için

        // Navigation Property
        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!;
    }
}
