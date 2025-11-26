using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class CartItem
    {
        [Key]
        public int Id { get; set; }

        public int CartId { get; set; }
        public int OfferId { get; set; }

        [Required]
        public int Quantity { get; set; }

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        [ForeignKey(nameof(CartId))]
        public Cart Cart { get; set; } = null!;

        [ForeignKey(nameof(OfferId))]
        public Offer Offer { get; set; } = null!;
    }
}
