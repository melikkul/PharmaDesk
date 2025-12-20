using System.ComponentModel.DataAnnotations;

namespace Backend.Dtos
{
    // ========== PHARMACY PROFILE DTOs ==========
    
    public class PharmacyProfileDto
    {
        public long Id { get; set; }
        public string PharmacyName { get; set; } = string.Empty;
        public string PharmacistInCharge { get; set; } = string.Empty; // From IdentityUser
        public decimal Balance { get; set; }
        public string? LogoUrl { get; set; }
        public string? CoverImageUrl { get; set; }
        public string? About { get; set; }
        public string Location { get; set; } = string.Empty; // Computed from Address, City, District
        public string RegistrationDate { get; set; } = string.Empty; // Formatted date
        public string GLN { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Username { get; set; }
        public string? Group { get; set; } // Group name
        public string? City { get; set; }
        public string? District { get; set; }
        
        // Computed statistics
        public decimal GrupYuku { get; set; }
        public int AlimSayisi { get; set; }
        public decimal AlimTutari { get; set; }
        public decimal SistemKazanci { get; set; }
        public int TeklifSayisi { get; set; }
        public int GonderiAdet { get; set; }
        public decimal GonderiTutari { get; set; }
        public decimal GrubaKazandirdigi { get; set; }
        public string KayitTarihi { get; set; } = string.Empty;
        
        /// <summary>
        /// Admin tarafından tanımlanan kargo hizmeti durumu.
        /// </summary>
        public bool HasShippingService { get; set; } = false;
    }

    // ========== OFFER DTOs ==========
    
    public class OfferDto
    {
        public int Id { get; set; }
        public int MedicationId { get; set; } // Added for linking back to medication
        public string ProductName { get; set; } = string.Empty;
        public string? Barcode { get; set; } // Medication barcode  
        public string Type { get; set; } = string.Empty; // "stockSale", "jointOrder", "purchaseRequest"
        public string Stock { get; set; } = string.Empty; // "quantity + bonus" format
        public decimal Price { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PharmacyId { get; set; } = string.Empty; // Pharmacy profile ID for linking
        public string PharmacyName { get; set; } = string.Empty; // Seller pharmacy
        public string? PharmacyUsername { get; set; }
        
        // New fields for Detail Page
        public string? Description { get; set; }
        public string? Manufacturer { get; set; }
        public string? ImageUrl { get; set; }
        public int ImageCount { get; set; } = 1;
        public List<string>? ImageUrls { get; set; } // All image paths for carousel
        
        // Campaign-specific fields
        public string? CampaignEndDate { get; set; }
        public decimal? CampaignBonusMultiplier { get; set; }
        
        // Tender-specific fields
        public string? BiddingDeadline { get; set; }
        public string? ExpirationDate { get; set; } // SKT

        // New fields
        public decimal DepotPrice { get; set; }
        public string? MalFazlasi { get; set; }
        public decimal DiscountPercentage { get; set; }
        public decimal NetPrice { get; set; }
        public int? MaxSaleQuantity { get; set; }
        public string? OfferDescription { get; set; }
        
        // Private offer fields
        public bool IsPrivate { get; set; }
        
        // 🆕 Refactored: List<long> instead of comma-separated string
        public List<long>? TargetPharmacyIds { get; set; }
        
        public int? WarehouseBaremId { get; set; }
        public decimal MaxPriceLimit { get; set; }
        public int SoldQuantity { get; set; } // Satılan/Sipariş geçilen adet
        public int RemainingStock { get; set; } // Kalan stok (Stock - SoldQuantity)
        public int LockedQuantity { get; set; } // 🆕 Diğer kullanıcılar tarafından sepetlerde kilitli stok
        public int AvailableStock { get; set; } // 🆕 Gerçek satın alınabilir stok (RemainingStock - LockedQuantity)

        // 🆕 Depo Sorumlusu için
        public long? DepotClaimerUserId { get; set; }
        public DateTime? DepotClaimedAt { get; set; }
        
        // 🆕 Sipariş veren alıcılar (JointOrder, PurchaseRequest için)
        public List<BuyerInfo>? Buyers { get; set; }
        
        // 🆕 Finalization Tracking (for Provision/Capture Pattern)
        /// <summary>Teklif sonlandırılmış mı?</summary>
        public bool IsFinalized { get; set; }
        
        /// <summary>Ödeme işlendi mi?</summary>
        public bool IsPaymentProcessed { get; set; }
        
        /// <summary>Teklif oluşturma tarihi</summary>
        public string? CreatedAt { get; set; }
        
        // 🆕 Joint Order Conversion için
        /// <summary>Ortak Sipariş katılımcı detayları (Talep Eden + Üstlenen)</summary>
        public List<JointOrderParticipantDto>? Participants { get; set; }
        
        /// <summary>Toplam talep edilen adet (tüm katılımcıların toplamı)</summary>
        public int TotalRequestedQuantity { get; set; }
        
        /// <summary>Kurucu miktarı (JointOrder/PurchaseRequest için)</summary>
        public int CreatorQuantity { get; set; }
    }

    // 🆕 Sipariş veren alıcı bilgisi
    public class BuyerInfo
    {
        public long PharmacyId { get; set; }
        public string PharmacyName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string? OrderDate { get; set; }
    }

    // 🆕 Ortak Sipariş katılımcı bilgisi
    public class JointOrderParticipantDto
    {
        public long PharmacyId { get; set; }
        public string PharmacyName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public bool IsSupplier { get; set; }
        public string? AddedAt { get; set; }
    }

    // 🆕 Shipment Label DTO for QR code printing
    public class ShipmentLabelDto
    {
        public int ShipmentId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public string BuyerPharmacyName { get; set; } = string.Empty;
        public long BuyerPharmacyId { get; set; }
        public int Quantity { get; set; }
        /// <summary>AES-256 encrypted token for QR code</summary>
        public string QRToken { get; set; } = string.Empty;
    }

    public class CreateOfferRequest
    {
        public int? MedicationId { get; set; }
        public string? Barcode { get; set; }
        public string? ProductName { get; set; }
        
        [Required]
        public string Type { get; set; } = "stockSale"; // "stockSale", "jointOrder", "purchaseRequest"
        
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")]
        public decimal Price { get; set; }
        
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Stock must be at least 1")]
        public int Stock { get; set; }
        
        /// <summary>Kurucunun kendi miktarı (JointOrder/PurchaseRequest için)</summary>
        public int CreatorQuantity { get; set; } = 0;
        
        public int BonusQuantity { get; set; } = 0;
        public int MinSaleQuantity { get; set; } = 1;
        
        public string? ExpirationDate { get; set; } // Format: "MM/YYYY" or "MM / YYYY"
        
        // Campaign-specific fields
        public DateTime? CampaignStartDate { get; set; }
        public DateTime? CampaignEndDate { get; set; }
        public decimal CampaignBonusMultiplier { get; set; } = 1.0m;
        
        // Tender-specific fields
        public int? MinimumOrderQuantity { get; set; }
        public DateTime? BiddingDeadline { get; set; }
        public bool AcceptingCounterOffers { get; set; } = false;
        public string? TargetPharmacyId { get; set; } // For Pharmacy Specific Offers (legacy single)

        // New fields
        public decimal DepotPrice { get; set; }
        public string? MalFazlasi { get; set; }
        public decimal DiscountPercentage { get; set; }
        public int? MaxSaleQuantity { get; set; }
        public string? Description { get; set; }
        
        // Private offer fields
        public bool IsPrivate { get; set; } = false;
        
        // 🆕 Refactored: List<long> instead of comma-separated string
        public List<long>? TargetPharmacyIds { get; set; }
        
        public int? WarehouseBaremId { get; set; }
        public decimal MaxPriceLimit { get; set; } = 0; // Barem price limit for validation
    }

    public class UpdateOfferRequest
    {
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")]
        public decimal Price { get; set; }
        
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Stock must be at least 1")]
        public int Stock { get; set; }
        
        public int BonusQuantity { get; set; } = 0;
        public int MinSaleQuantity { get; set; } = 1;
        
        // Campaign-specific fields (optional updates)
        public DateTime? CampaignStartDate { get; set; }
        public DateTime? CampaignEndDate { get; set; }
        public decimal? CampaignBonusMultiplier { get; set; }
        
        // Tender-specific fields (optional updates)
        public int? MinimumOrderQuantity { get; set; }
        public DateTime? BiddingDeadline { get; set; }
        public bool? AcceptingCounterOffers { get; set; }
        public string? TargetPharmacyId { get; set; } // For Pharmacy Specific Offers
        
        // New fields
        public decimal? DepotPrice { get; set; }
        public string? MalFazlasi { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public int? MaxSaleQuantity { get; set; }
        public string? Description { get; set; }
        
        // Barem fields for edit
        public int? WarehouseBaremId { get; set; }
        public decimal? MaxPriceLimit { get; set; }
        
        // 🆕 Refactored: List<long> for target pharmacies
        public List<long>? TargetPharmacyIds { get; set; }
    }

    public class UpdateOfferStatusRequest
    {
        [Required]
        public string Status { get; set; } = string.Empty; // "active", "paused", "expired", "out_of_stock", "stopped"
    }

    /// <summary>
    /// Alım Talebini Ortak Siparişe dönüştürme isteği
    /// </summary>
    public class ConvertToJointOrderDto
    {
        /// <summary>Siparişi üstlenen kişinin eklemek istediği kendi adeti</summary>
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Adet en az 1 olmalıdır")]
        public int SupplierQuantity { get; set; }
    }

    // ========== TRANSACTION DTOs ==========
    
    public class TransactionDto
    {
        public string Id { get; set; } = string.Empty; // Formatted ID (e.g., "S-10589")
        public string Date { get; set; } = string.Empty; // YYYY-MM-DD format
        public string Type { get; set; } = string.Empty; // "Alış", "Satış", "Bakiye Yükleme", "İade"
        public string? ProductName { get; set; }
        public string? Counterparty { get; set; } // "Alıcı: ..." or "Satıcı: ..."
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty; // "Tamamlandı", "İşlemde", "İptal Edildi"
        
        // 🆕 FK references for data integrity
        public int? OrderId { get; set; }
        public int? OfferId { get; set; }
    }

    public class CreateTransactionRequest
    {
        [Required]
        public string Type { get; set; } = string.Empty; // "Sale", "Purchase", "Deposit", "Withdraw", "Refund"
        
        [Required]
        public decimal Amount { get; set; }
        
        [Required]
        public string Description { get; set; } = string.Empty;
        
        // 🆕 Refactored: Nullable FKs instead of RelatedReferenceId string
        public int? OrderId { get; set; }
        public int? OfferId { get; set; }
        
        [Obsolete("Use OrderId or OfferId instead")]
        public string? RelatedReferenceId { get; set; }
        
        public long? CounterpartyPharmacyId { get; set; }
    }

    // ========== SHIPMENT DTOs ==========
    
    public class ShipmentDto
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string TrackingNumber { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty; // YYYY-MM-DD format
        public string TransferType { get; set; } = string.Empty; // "inbound" or "outbound"
        public string Counterparty { get; set; } = string.Empty; // Sender or Receiver pharmacy name
        public string ShippingProvider { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // "pending", "shipped", "in_transit", "delivered", "cancelled"
        public List<TrackingEventDto>? TrackingHistory { get; set; }
    }

    public class TrackingEventDto
    {
        public string Date { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
    }

    public class CreateShipmentRequest
    {
        [Required]
        public string OrderNumber { get; set; } = string.Empty;
        
        [Required]
        public int ReceiverPharmacyId { get; set; }
        
        [Required]
        public int MedicationId { get; set; }
        
        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
        
        [Required]
        public string TrackingNumber { get; set; } = string.Empty;
        
        [Required]
        public string Carrier { get; set; } = string.Empty;
    }

    // ========== NOTIFICATION DTOs ==========
    
    public class NotificationDto
    {
        public int Id { get; set; }
        public bool Read { get; set; }
        public string Type { get; set; } = string.Empty; // "offer", "shipment", "balance", "message"
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }

    // ========== MESSAGE DTOs ==========
    
    public class MessageDto
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public string SenderPharmacyId { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SendMessageRequest
    {
        [Required]
        public long ReceiverPharmacyId { get; set; }
        
        [Required]
        [StringLength(2000, MinimumLength = 1)]
        public string Content { get; set; } = string.Empty;
    }

    public class CreateConversationRequest
    {
        [Required]
        public long ReceiverPharmacyId { get; set; }
    }
}
