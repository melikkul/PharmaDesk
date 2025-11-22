using System.ComponentModel.DataAnnotations;

namespace Backend.Dtos
{
    // ========== PHARMACY PROFILE DTOs ==========
    
    public class PharmacyProfileDto
    {
        public int Id { get; set; }
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
    }

    // ========== OFFER DTOs ==========
    
    public class OfferDto
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string Stock { get; set; } = string.Empty; // "quantity + bonus" format
        public decimal Price { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PharmacyName { get; set; } = string.Empty; // Seller pharmacy
        public string? PharmacyUsername { get; set; }
    }

    public class CreateOfferRequest
    {
        [Required]
        public int MedicationId { get; set; }
        
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")]
        public decimal Price { get; set; }
        
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Stock must be at least 1")]
        public int Stock { get; set; }
        
        public int BonusQuantity { get; set; } = 0;
    }

    public class UpdateOfferStatusRequest
    {
        [Required]
        public string Status { get; set; } = string.Empty; // "active", "paused", "expired", "out_of_stock"
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
        public string Sender { get; set; } = string.Empty; // Pharmacy name
        public string LastMessage { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public bool Read { get; set; }
        public string? IdFromProfile { get; set; } // Pharmacy username
    }

    public class SendMessageRequest
    {
        [Required]
        public int ReceiverPharmacyId { get; set; }
        
        [Required]
        [StringLength(2000, MinimumLength = 1)]
        public string Content { get; set; } = string.Empty;
    }
}
