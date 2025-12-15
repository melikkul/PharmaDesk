using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Return Request (İade Talebi) entity for handling product returns
    /// Tracks return workflow from request to resolution
    /// </summary>
    public class ReturnRequest
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Unique return request number (e.g., "RET-2024-000001")
        /// </summary>
        [Required, StringLength(50)]
        public string ReturnNumber { get; set; } = string.Empty;

        /// <summary>
        /// Related order ID
        /// </summary>
        public int OrderId { get; set; }

        /// <summary>
        /// Related order item ID (specific product in order)
        /// </summary>
        public int? OrderItemId { get; set; }

        /// <summary>
        /// Pharmacy requesting the return (buyer)
        /// </summary>
        public long RequesterPharmacyId { get; set; }

        /// <summary>
        /// Pharmacy receiving the return (seller)
        /// </summary>
        public long SellerPharmacyId { get; set; }

        /// <summary>
        /// Medication being returned
        /// </summary>
        public int MedicationId { get; set; }

        /// <summary>
        /// Return request status
        /// </summary>
        [Required]
        public ReturnStatus Status { get; set; } = ReturnStatus.Pending;

        // ═══════════════════════════════════════════════════════════════
        // Return Details
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Reason for return
        /// </summary>
        [Required]
        public ReturnReason Reason { get; set; }

        /// <summary>
        /// Detailed description of the issue
        /// </summary>
        [Required, StringLength(2000)]
        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// Quantity being returned
        /// </summary>
        [Required]
        public int Quantity { get; set; }

        /// <summary>
        /// Unit price of the product
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }

        /// <summary>
        /// Total refund amount requested
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal RefundAmount { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Evidence / Documentation
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Photo evidence paths (JSONB array)
        /// </summary>
        [Column(TypeName = "jsonb")]
        public List<string>? EvidencePhotoPaths { get; set; }

        /// <summary>
        /// Batch/lot number of returned product
        /// </summary>
        [StringLength(50)]
        public string? BatchNumber { get; set; }

        /// <summary>
        /// Expiry date of returned product
        /// </summary>
        public DateTime? ProductExpiryDate { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Review / Approval Workflow
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// User who reviewed/approved the request
        /// </summary>
        public long? ReviewedByUserId { get; set; }

        /// <summary>
        /// Review notes from seller
        /// </summary>
        [StringLength(1000)]
        public string? ReviewNotes { get; set; }

        /// <summary>
        /// Date when reviewed
        /// </summary>
        public DateTime? ReviewedDate { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Resolution
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Resolution type
        /// </summary>
        public ReturnResolution? Resolution { get; set; }

        /// <summary>
        /// Actual refund amount (may differ from requested)
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? ActualRefundAmount { get; set; }

        /// <summary>
        /// Credit note ID if credit was issued
        /// </summary>
        public int? CreditNoteId { get; set; }

        /// <summary>
        /// Replacement order ID if replacement was sent
        /// </summary>
        public int? ReplacementOrderId { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Return Shipment (if physical return needed)
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Is physical return of product required?
        /// </summary>
        public bool RequiresPhysicalReturn { get; set; } = true;

        /// <summary>
        /// Return shipment ID
        /// </summary>
        public int? ReturnShipmentId { get; set; }

        /// <summary>
        /// Return tracking number
        /// </summary>
        [StringLength(100)]
        public string? ReturnTrackingNumber { get; set; }

        /// <summary>
        /// Date when product was received back
        /// </summary>
        public DateTime? ProductReceivedDate { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Timestamps
        // ═══════════════════════════════════════════════════════════════

        public DateTime RequestDate { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ═══════════════════════════════════════════════════════════════
        // Navigation Properties
        // ═══════════════════════════════════════════════════════════════

        [ForeignKey(nameof(OrderId))]
        public Order Order { get; set; } = null!;

        [ForeignKey(nameof(OrderItemId))]
        public OrderItem? OrderItem { get; set; }

        [ForeignKey(nameof(RequesterPharmacyId))]
        public PharmacyProfile RequesterPharmacy { get; set; } = null!;

        [ForeignKey(nameof(SellerPharmacyId))]
        public PharmacyProfile SellerPharmacy { get; set; } = null!;

        [ForeignKey(nameof(MedicationId))]
        public Medication Medication { get; set; } = null!;

        [ForeignKey(nameof(ReturnShipmentId))]
        public Shipment? ReturnShipment { get; set; }
    }

    public enum ReturnStatus
    {
        Pending,            // Beklemede (satıcı incelemesi bekleniyor)
        UnderReview,        // İnceleniyor
        Approved,           // Onaylandı
        Rejected,           // Reddedildi
        AwaitingShipment,   // Kargo Bekleniyor
        InTransit,          // Yolda (ürün geri gönderiliyor)
        Received,           // Ürün Alındı
        Resolved,           // Çözümlendi (para iadesi/değişim yapıldı)
        Cancelled           // İptal Edildi
    }

    public enum ReturnReason
    {
        Damaged,            // Hasarlı Ürün
        Expired,            // Son Kullanma Tarihi Geçmiş
        WrongProduct,       // Yanlış Ürün Gönderildi
        WrongQuantity,      // Yanlış Miktar
        QualityIssue,       // Kalite Sorunu
        NotAsDescribed,     // Tanımlandığı Gibi Değil
        ColdChainBroken,    // Soğuk Zincir Kırıldı
        PackagingIssue,     // Ambalaj Sorunu
        CustomerRequest,    // Müşteri Talebi
        RecallNotice,       // Geri Çağırma Bildirimi
        Other               // Diğer
    }

    public enum ReturnResolution
    {
        FullRefund,         // Tam Para İadesi
        PartialRefund,      // Kısmi Para İadesi
        Replacement,        // Ürün Değişimi
        Credit,             // Alacak Kaydı (sonraki siparişten düşülecek)
        RejectedNoAction,   // Red - İşlem Yapılmadı
        Destroyed           // Ürün İmha Edildi (expired/damaged)
    }
}
