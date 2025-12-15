using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Payment entity for tracking invoice payments
    /// Supports multiple payment methods and partial payments
    /// </summary>
    public class Payment
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Related invoice ID
        /// </summary>
        public int InvoiceId { get; set; }

        /// <summary>
        /// Pharmacy making the payment
        /// </summary>
        public long PayerPharmacyId { get; set; }

        /// <summary>
        /// Payment method used
        /// </summary>
        [Required]
        public PaymentMethod Method { get; set; }

        /// <summary>
        /// Payment status
        /// </summary>
        [Required]
        public TransactionPaymentStatus Status { get; set; } = TransactionPaymentStatus.Pending;

        // ═══════════════════════════════════════════════════════════════
        // Financial Details
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Payment amount
        /// </summary>
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        /// <summary>
        /// Currency code (default TRY)
        /// </summary>
        [Required, StringLength(3)]
        public string Currency { get; set; } = "TRY";

        // ═══════════════════════════════════════════════════════════════
        // Bank / Transfer Details
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Bank name (for transfer payments)
        /// </summary>
        [StringLength(100)]
        public string? BankName { get; set; }

        /// <summary>
        /// Bank account number / IBAN
        /// </summary>
        [StringLength(34)]
        public string? BankAccountNumber { get; set; }

        /// <summary>
        /// Transfer reference / receipt number
        /// </summary>
        [StringLength(100)]
        public string? TransferReference { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Credit Card Details (if applicable)
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Last 4 digits of card (masked)
        /// </summary>
        [StringLength(4)]
        public string? CardLast4 { get; set; }

        /// <summary>
        /// Payment gateway transaction ID
        /// </summary>
        [StringLength(100)]
        public string? GatewayTransactionId { get; set; }

        /// <summary>
        /// Payment gateway response code
        /// </summary>
        [StringLength(50)]
        public string? GatewayResponseCode { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // PharmaDesk Balance Payment
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// If paid from PharmaDesk balance, the related transaction ID
        /// </summary>
        public int? BalanceTransactionId { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Dates
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// When the payment was initiated
        /// </summary>
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the payment was confirmed/completed
        /// </summary>
        public DateTime? ConfirmedDate { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Additional Info
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Receipt/proof image path
        /// </summary>
        [StringLength(500)]
        public string? ReceiptImagePath { get; set; }

        /// <summary>
        /// Notes about the payment
        /// </summary>
        [StringLength(500)]
        public string? Notes { get; set; }

        /// <summary>
        /// Failure reason if payment failed
        /// </summary>
        [StringLength(500)]
        public string? FailureReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ═══════════════════════════════════════════════════════════════
        // Navigation Properties
        // ═══════════════════════════════════════════════════════════════

        [ForeignKey(nameof(InvoiceId))]
        public Invoice Invoice { get; set; } = null!;

        [ForeignKey(nameof(PayerPharmacyId))]
        public PharmacyProfile PayerPharmacy { get; set; } = null!;

        [ForeignKey(nameof(BalanceTransactionId))]
        public Transaction? BalanceTransaction { get; set; }
    }

    public enum PaymentMethod
    {
        BankTransfer,       // Havale/EFT
        CreditCard,         // Kredi Kartı
        DebitCard,          // Banka Kartı
        PharmaBalance,      // PharmaDesk Bakiye
        Cash,               // Nakit
        Check,              // Çek
        Promissory          // Senet
    }

    public enum TransactionPaymentStatus
    {
        Pending,            // Beklemede
        Processing,         // İşleniyor
        Completed,          // Tamamlandı
        Failed,             // Başarısız
        Cancelled,          // İptal Edildi
        Refunded            // İade Edildi
    }
}
