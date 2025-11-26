using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class ShipmentEvent
    {
        [Key]
        public int Id { get; set; }

        public int ShipmentId { get; set; }

        [Required, StringLength(100)]
        public string Status { get; set; } = string.Empty; // İşlem türü

        [StringLength(200)]
        public string? Location { get; set; } // Konum

        public DateTime EventDate { get; set; } = DateTime.UtcNow;

        // Navigation Property
        [ForeignKey(nameof(ShipmentId))]
        public Shipment Shipment { get; set; } = null!;
    }
}
