using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Eczane abonelik bilgilerini tutan entity.
    /// Gerçek para akışı (SaaS gelir modeli) için kullanılır.
    /// Mevcut Balance (Sanal Bakiye/Takas Puanı) sisteminden ayrıdır.
    /// </summary>
    public class Subscription
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Abonelik sahibi eczane
        /// </summary>
        public long PharmacyProfileId { get; set; }

        /// <summary>
        /// Abonelik başlangıç tarihi
        /// </summary>
        public DateTime StartDate { get; set; }

        /// <summary>
        /// Abonelik bitiş tarihi
        /// </summary>
        public DateTime EndDate { get; set; }

        /// <summary>
        /// Abonelik durumu (Active, PastDue, Cancelled, Trial)
        /// Bu değer JWT claims içinde de saklanır
        /// </summary>
        [Required]
        public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Trial;

        /// <summary>
        /// Abonelik plan tipi (Standard, CargoPlus)
        /// </summary>
        [Required]
        public SubscriptionPlanType PlanType { get; set; } = SubscriptionPlanType.Standard;

        /// <summary>
        /// Bu dönemde ödenen tutar (TL)
        /// Grup özel fiyatı veya kargo dahil fiyat olabilir
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal PricePaid { get; set; }

        /// <summary>
        /// Otomatik yenileme aktif mi?
        /// </summary>
        public bool AutoRenew { get; set; } = false;

        /// <summary>
        /// Son ödeme tarihi
        /// </summary>
        public DateTime? LastPaymentDate { get; set; }

        /// <summary>
        /// Sonraki ödeme tarihi
        /// </summary>
        public DateTime? NextPaymentDate { get; set; }

        // Audit fields
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ═══════════════════════════════════════════════════════════════
        // Navigation Properties
        // ═══════════════════════════════════════════════════════════════

        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;

        /// <summary>
        /// Bu aboneliğe ait ödeme geçmişi
        /// </summary>
        public ICollection<SubscriptionPaymentHistory> PaymentHistories { get; set; } = new List<SubscriptionPaymentHistory>();
    }
}
