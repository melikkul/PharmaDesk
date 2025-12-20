using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Gerçek para akışı ödeme geçmişi.
    /// Stripe/Iyzico entegrasyonu için hazırlandı.
    /// Mevcut Transaction entity'si (sanal bakiye) ile karıştırılmamalıdır.
    /// </summary>
    public class SubscriptionPaymentHistory
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Ödemenin ait olduğu abonelik
        /// </summary>
        public int SubscriptionId { get; set; }

        /// <summary>
        /// Ödeme yapan eczane
        /// </summary>
        public long PharmacyProfileId { get; set; }

        /// <summary>
        /// Ödeme gateway transaction ID (Stripe/Iyzico)
        /// Şu an için GUID simülasyonu
        /// </summary>
        [StringLength(100)]
        public string TransactionId { get; set; } = string.Empty;

        /// <summary>
        /// Ödeme tutarı (TL)
        /// </summary>
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        /// <summary>
        /// Ödeme tarihi
        /// </summary>
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Ödeme durumu
        /// </summary>
        [Required]
        public SubscriptionPaymentStatus Status { get; set; } = SubscriptionPaymentStatus.Pending;

        /// <summary>
        /// Ödeme yöntemi
        /// </summary>
        [Required]
        public SubscriptionPaymentMethod Method { get; set; } = SubscriptionPaymentMethod.CreditCard;

        /// <summary>
        /// Kart son 4 hanesi (maskeleme için)
        /// </summary>
        [StringLength(4)]
        public string? CardLast4 { get; set; }

        /// <summary>
        /// Kart markası (Visa, Mastercard, vb.)
        /// </summary>
        [StringLength(20)]
        public string? CardBrand { get; set; }

        /// <summary>
        /// Hata mesajı (başarısız ödemelerde)
        /// </summary>
        [StringLength(500)]
        public string? FailureReason { get; set; }

        /// <summary>
        /// Gateway yanıt kodu
        /// </summary>
        [StringLength(50)]
        public string? GatewayResponseCode { get; set; }

        /// <summary>
        /// Abonelik dönemi başlangıcı
        /// </summary>
        public DateTime PeriodStart { get; set; }

        /// <summary>
        /// Abonelik dönemi bitişi
        /// </summary>
        public DateTime PeriodEnd { get; set; }

        /// <summary>
        /// Notlar
        /// </summary>
        [StringLength(500)]
        public string? Notes { get; set; }

        // Audit fields
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ═══════════════════════════════════════════════════════════════
        // Navigation Properties
        // ═══════════════════════════════════════════════════════════════

        [ForeignKey(nameof(SubscriptionId))]
        public Subscription Subscription { get; set; } = null!;

        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;
    }

    /// <summary>
    /// Abonelik ödeme durumu
    /// </summary>
    public enum SubscriptionPaymentStatus
    {
        Pending,
        Completed,
        Failed,
        Refunded,
        Cancelled
    }

    /// <summary>
    /// Abonelik ödeme yöntemi
    /// </summary>
    public enum SubscriptionPaymentMethod
    {
        CreditCard,
        DebitCard,
        BankTransfer,
        // TODO: Iyzico Integration - Add more methods
    }
}
