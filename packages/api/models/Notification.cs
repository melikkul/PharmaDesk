using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public enum NotificationType
    {
        Offer,      // Teklif bildirimi
        Shipment,   // Sevkiyat bildirimi
        Balance,    // Bakiye bildirimi
        Message,    // Mesaj bildirimi
        Order,      // Sipariş bildirimi
        System      // Sistem bildirimi
    }

    public class Notification
    {
        [Key]
        public int Id { get; set; }

        public long PharmacyProfileId { get; set; }

        [Required]
        public NotificationType Type { get; set; }

        [Required, StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required, StringLength(1000)]
        public string Message { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? LinkUrl { get; set; } // Tıklayınca gideceği yer

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Property
        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;
    }
}
