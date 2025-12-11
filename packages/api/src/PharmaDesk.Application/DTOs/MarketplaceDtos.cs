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
        public string? TargetPharmacyIds { get; set; }
        public int? WarehouseBaremId { get; set; }
        public decimal MaxPriceLimit { get; set; }
        public int SoldQuantity { get; set; } // Satılan/Sipariş geçilen adet
        public int RemainingStock { get; set; } // Kalan stok (Stock - SoldQuantity)

        // 🆕 Depo Sorumlusu için
        public long? DepotClaimerUserId { get; set; }
        public DateTime? DepotClaimedAt { get; set; }
        
        // 🆕 Sipariş veren alıcılar (JointOrder, PurchaseRequest için)
        public List<BuyerInfo>? Buyers { get; set; }
    }

    // 🆕 Sipariş veren alıcı bilgisi
    public class BuyerInfo
    {
        public long PharmacyId { get; set; }
        public string PharmacyName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string? OrderDate { get; set; }
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
        public string? TargetPharmacyIds { get; set; } // Comma-separated IDs for multiple pharmacies
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
    }

    public class UpdateOfferStatusRequest
    {
        [Required]
        public string Status { get; set; } = string.Empty; // "active", "paused", "expired", "out_of_stock", "stopped"
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
    }

    public class CreateTransactionRequest
    {
        [Required]
        public string Type { get; set; } = string.Empty; // "Sale", "Purchase", "Deposit", "Withdraw", "Refund"
        
        [Required]
        public decimal Amount { get; set; }
        
        [Required]
        public string Description { get; set; } = string.Empty;
        
        public string? RelatedReferenceId { get; set; }
        public int? CounterpartyPharmacyId { get; set; }
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
