using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public enum TransactionType
    {
        Sale,       // Satış
        Purchase,   // Alış
        Deposit,    // Bakiye Yükleme
        Withdraw,   // Para Çekme
        Refund      // İade
    }

    public enum TransactionStatus
    {
        Completed,  // Tamamlandı
        Processing, // İşlemde
        Cancelled   // İptal Edildi
    }

    public class Transaction
    {
        [Key]
        public int Id { get; set; }

        public int PharmacyProfileId { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; } // Pozitif veya negatif tutar

        [Required]
        public TransactionType Type { get; set; }

        [Required, StringLength(500)]
        public string Description { get; set; } = string.Empty;

        public DateTime Date { get; set; } = DateTime.UtcNow;

        [StringLength(100)]
        public string? RelatedReferenceId { get; set; } // Sipariş No, İşlem Ref vb.

        [Required]
        public TransactionStatus Status { get; set; } = TransactionStatus.Completed;

        public int? CounterpartyPharmacyId { get; set; } // Karşı taraf eczane (alış/satışta)

        // Navigation Properties
        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;

        [ForeignKey(nameof(CounterpartyPharmacyId))]
        public PharmacyProfile? CounterpartyPharmacy { get; set; }
    }
}
