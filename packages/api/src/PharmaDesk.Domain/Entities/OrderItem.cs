using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class OrderItem
    {
        [Key]
        public int Id { get; set; }

        public int OrderId { get; set; }
        public int MedicationId { get; set; }
        public int? OfferId { get; set; } // 🆕 Hangi teklif için sipariş verildi

        [Required]
        public int Quantity { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; } // O anki satış fiyatı

        public int BonusQuantity { get; set; } = 0; // Kazanılan MF

        [Column(TypeName = "decimal(18,2)")]
        public decimal ProfitAmount { get; set; } = 0; // Kar miktarı (Barem bonus'undan hesaplanan)

        // Navigation Properties
        [ForeignKey(nameof(OrderId))]
        public Order Order { get; set; } = null!;

        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!;
        
        [ForeignKey(nameof(OfferId))]
        public Offer? Offer { get; set; }
    }
}
