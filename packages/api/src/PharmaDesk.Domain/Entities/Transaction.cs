using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public enum TransactionType
    {
        Deposit,        // Para yatırma
        Withdrawal,     // Para çekme
        Purchase,       // Alış
        Sale,           // Satış
        Refund,         // İade
        SystemFee,      // Sistem komisyonu
        GroupBonus,     // Grup bonusu
        OfferCreated,   // Teklif oluşturuldu
        OfferUpdated,   // Teklif güncellendi
        OfferDeleted,   // Teklif silindi
        OrderCreated,   // Sipariş oluşturuldu
        OrderCompleted  // Sipariş tamamlandı
    }

    public enum TransactionStatus
    {
        Pending,
        Completed,
        Failed,
        Cancelled,
        /// <summary>
        /// Para bloke edildi, havuzda bekliyor (Alıcıdan düşüldü, satıcıya henüz aktarılmadı)
        /// </summary>
        Provision,
        /// <summary>
        /// Tahsilat yapıldı, satıcıya aktarıldı
        /// </summary>
        Captured,
        /// <summary>
        /// Provizyon iptal edildi, para alıcıya iade edildi
        /// </summary>
        Voided
    }

    /// <summary>
    /// Refactored Transaction entity with:
    /// - Nullable OrderId and OfferId FK (replaces RelatedReferenceId string)
    /// - PostgreSQL xmin concurrency token
    /// - ISoftDelete & IAuditable implementation
    /// - Proper data integrity via foreign keys
    /// </summary>
    public class Transaction : BaseEntity
    {
        // Foreign Keys
        public long PharmacyProfileId { get; set; }
        public long? CounterpartyPharmacyId { get; set; }

        // 🆕 Polymorphic FK replacement: Nullable FKs instead of RelatedReferenceId string
        public int? OrderId { get; set; }
        public int? OfferId { get; set; }

        // ⚠️ DEPRECATED: Use OrderId/OfferId instead
        // Kept for backwards compatibility during migration
        [Obsolete("Use OrderId or OfferId instead for data integrity")]
        [StringLength(100)]
        public string? RelatedReferenceId { get; set; }

        // Core Fields
        [Required]
        public TransactionType Type { get; set; }

        [Required]
        public TransactionStatus Status { get; set; } = TransactionStatus.Completed;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required, StringLength(500)]
        public string Description { get; set; } = string.Empty;

        public DateTime Date { get; set; } = DateTime.UtcNow;

        // ═══════════════════════════════════════════════════════════════
        // Navigation Properties
        // ═══════════════════════════════════════════════════════════════

        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;

        [ForeignKey(nameof(CounterpartyPharmacyId))]
        public PharmacyProfile? CounterpartyPharmacy { get; set; }

        [ForeignKey(nameof(OrderId))]
        public Order? Order { get; set; }

        [ForeignKey(nameof(OfferId))]
        public Offer? Offer { get; set; }
    }
}
