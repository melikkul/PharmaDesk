using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public enum ReportType
    {
        Inventory,
        Expiration,
        Sales,
        Demand
    }

    public class Report
    {
        [Key]
        public int Id { get; set; }

        public long PharmacyProfileId { get; set; }

        [Required]
        public ReportType ReportType { get; set; }

        public DateTime GeneratedDate { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "jsonb")]
        public string? DataJson { get; set; } // Rapor verisi (arşiv için)

        // Navigation Property
        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;
    }
}
