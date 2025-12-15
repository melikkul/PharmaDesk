using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Invoice (Fatura) entity for B2B financial tracking
    /// Stores invoice details for orders between pharmacies
    /// </summary>
    public class Invoice
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Unique invoice number (e.g., "FTR-2024-000001")
        /// </summary>
        [Required, StringLength(50)]
        public string InvoiceNumber { get; set; } = string.Empty;

        /// <summary>
        /// Related order ID
        /// </summary>
        public int OrderId { get; set; }

        /// <summary>
        /// Seller pharmacy (invoice issuer)
        /// </summary>
        public long SellerPharmacyId { get; set; }

        /// <summary>
        /// Buyer pharmacy (invoice recipient)
        /// </summary>
        public long BuyerPharmacyId { get; set; }

        /// <summary>
        /// Invoice status
        /// </summary>
        [Required]
        public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;

        // ═══════════════════════════════════════════════════════════════
        // Financial Amounts
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Subtotal before VAT
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal SubTotal { get; set; }

        /// <summary>
        /// VAT rate (e.g., 8, 18)
        /// </summary>
        [Column(TypeName = "decimal(5,2)")]
        public decimal VATRate { get; set; } = 8m; // Default 8% for pharmaceuticals

        /// <summary>
        /// VAT amount
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal VATAmount { get; set; }

        /// <summary>
        /// Total amount including VAT
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // E-Invoice / GİB Integration
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// GİB (Gelir İdaresi Başkanlığı) E-Invoice UUID
        /// </summary>
        [StringLength(36)]
        public string? GIBInvoiceId { get; set; }

        /// <summary>
        /// E-Invoice ETTN (Evrensel Tekil Tanımlama Numarası)
        /// </summary>
        [StringLength(36)]
        public string? ETTN { get; set; }

        /// <summary>
        /// E-Invoice XML path (stored file reference)
        /// </summary>
        [StringLength(500)]
        public string? EInvoiceXmlPath { get; set; }

        /// <summary>
        /// E-Invoice PDF path
        /// </summary>
        [StringLength(500)]
        public string? EInvoicePdfPath { get; set; }

        /// <summary>
        /// E-Invoice sent to GİB?
        /// </summary>
        public bool IsEInvoiceSent { get; set; } = false;

        /// <summary>
        /// E-Invoice send date
        /// </summary>
        public DateTime? EInvoiceSentDate { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Dates
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Invoice issue date
        /// </summary>
        public DateTime IssueDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Payment due date
        /// </summary>
        public DateTime DueDate { get; set; }

        /// <summary>
        /// Actual payment date (when paid)
        /// </summary>
        public DateTime? PaidDate { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Additional Info
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Notes on the invoice
        /// </summary>
        [StringLength(1000)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ═══════════════════════════════════════════════════════════════
        // Navigation Properties
        // ═══════════════════════════════════════════════════════════════

        [ForeignKey(nameof(OrderId))]
        public Order Order { get; set; } = null!;

        [ForeignKey(nameof(SellerPharmacyId))]
        public PharmacyProfile SellerPharmacy { get; set; } = null!;

        [ForeignKey(nameof(BuyerPharmacyId))]
        public PharmacyProfile BuyerPharmacy { get; set; } = null!;

        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }

    public enum InvoiceStatus
    {
        Draft,          // Taslak
        Issued,         // Kesildi
        Sent,           // Gönderildi
        Paid,           // Ödendi
        PartiallyPaid,  // Kısmi Ödendi
        Overdue,        // Vadesi Geçti
        Cancelled,      // İptal Edildi
        Refunded        // İade Edildi
    }
}
