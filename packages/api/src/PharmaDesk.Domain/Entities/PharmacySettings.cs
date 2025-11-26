using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class PharmacySettings
    {
        [Key]
        public int Id { get; set; }

        public long PharmacyProfileId { get; set; }

        public bool EmailNotifications { get; set; } = true;
        public bool SmsNotifications { get; set; } = true;
        public bool AutoAcceptOrders { get; set; } = false;
        public bool ShowStockToGroupOnly { get; set; } = false;

        [StringLength(10)]
        public string Language { get; set; } = "tr";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Property
        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;
    }
}
