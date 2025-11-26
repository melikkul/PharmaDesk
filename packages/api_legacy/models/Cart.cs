using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class Cart
    {
        [Key]
        public int Id { get; set; }

        public long PharmacyProfileId { get; set; } // Alıcı

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;

        public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    }
}
