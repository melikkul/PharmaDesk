using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class Message
    {
        [Key]
        public int Id { get; set; }

        public int SenderPharmacyId { get; set; }
        public int ReceiverPharmacyId { get; set; }

        [Required, StringLength(2000)]
        public string Content { get; set; } = string.Empty;

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        [ForeignKey(nameof(SenderPharmacyId))]
        public PharmacyProfile SenderPharmacy { get; set; } = null!;

        [ForeignKey(nameof(ReceiverPharmacyId))]
        public PharmacyProfile ReceiverPharmacy { get; set; } = null!;
    }
}
