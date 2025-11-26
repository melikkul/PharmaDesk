using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public enum OrderStatus
    {
        Pending,
        Approved,
        Shipped,
        Delivered,
        Cancelled,
        Completed
    }

    public enum PaymentStatus
    {
        Pending,
        Paid
    }

    public class Order
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(50)]
        public string OrderNumber { get; set; } = string.Empty; // Örn: 2025-XQ92

        public long BuyerPharmacyId { get; set; }
        public long SellerPharmacyId { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        [Required]
        public OrderStatus Status { get; set; } = OrderStatus.Pending;

        [Required]
        public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        [ForeignKey(nameof(BuyerPharmacyId))]
        public PharmacyProfile BuyerPharmacy { get; set; } = null!;

        [ForeignKey(nameof(SellerPharmacyId))]
        public PharmacyProfile SellerPharmacy { get; set; } = null!;

        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }
}
