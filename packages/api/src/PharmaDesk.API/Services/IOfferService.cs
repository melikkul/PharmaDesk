using Backend.Dtos;
using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// Offer business logic operations interface
    /// Separates business logic from controller for better testability and maintainability
    /// </summary>
    public interface IOfferService
    {
        // ═══════════════════════════════════════════════════════════════
        // Query Operations
        // ═══════════════════════════════════════════════════════════════
        
        /// <summary>
        /// Get all active offers for marketplace with pagination
        /// </summary>
        Task<IEnumerable<OfferDto>> GetAllOffersAsync(string? status, int page, int pageSize);
        
        /// <summary>
        /// Get offers for a specific pharmacy
        /// </summary>
        Task<IEnumerable<OfferDto>> GetMyOffersAsync(long pharmacyId);
        
        /// <summary>
        /// Get offer by ID with authorization check
        /// </summary>
        Task<OfferDto?> GetOfferByIdAsync(int offerId, long? requestingPharmacyId);
        
        /// <summary>
        /// Get all active offers for a specific medication
        /// Finalized offers are only visible to participants (owner + buyers)
        /// </summary>
        Task<IEnumerable<OfferDto>> GetOffersByMedicationIdAsync(int medicationId, long? requestingPharmacyId = null);

        // ═══════════════════════════════════════════════════════════════
        // Command Operations
        // ═══════════════════════════════════════════════════════════════
        
        /// <summary>
        /// Create a new offer with smart matching and inventory management
        /// </summary>
        Task<OfferResult> CreateOfferAsync(CreateOfferRequest request, long pharmacyId);
        
        /// <summary>
        /// Update an existing offer
        /// </summary>
        Task<OfferResult> UpdateOfferAsync(int offerId, UpdateOfferRequest request, long pharmacyId);
        
        /// <summary>
        /// Update offer status (Active, Passive, Expired, Sold)
        /// </summary>
        Task<bool> UpdateOfferStatusAsync(int offerId, string status, long pharmacyId);
        
        /// <summary>
        /// Delete an offer
        /// </summary>
        Task<bool> DeleteOfferAsync(int offerId, long pharmacyId);

        // ═══════════════════════════════════════════════════════════════
        // Depot Operations
        // ═══════════════════════════════════════════════════════════════
        
        /// <summary>
        /// Claim depot responsibility for a joint order
        /// </summary>
        Task<DepotClaimResult> ClaimDepotAsync(int offerId, long pharmacyId);
        
        /// <summary>
        /// Release depot responsibility
        /// </summary>
        Task<bool> UnclaimDepotAsync(int offerId, long pharmacyId);
        
        /// <summary>
        /// Convert PurchaseRequest to JointOrder
        /// </summary>
        Task<OfferResult> ConvertToJointOrderAsync(int offerId, ConvertToJointOrderDto request, long pharmacyId);

        // ═══════════════════════════════════════════════════════════════
        // Financial Operations (Provision/Capture Pattern)
        // ═══════════════════════════════════════════════════════════════
        
        /// <summary>
        /// Process balance capture for an offer (convert Provision → Captured, credit seller)
        /// </summary>
        Task<BalanceProcessResult> ProcessBalanceAsync(int offerId, long pharmacyId);
        
        /// <summary>
        /// Finalize an offer (set Status = Passive, IsFinalized = true)
        /// Remaining quantity is added to owner's account
        /// </summary>
        Task<OfferResult> FinalizeOfferAsync(int offerId, long pharmacyId);
        
        /// <summary>
        /// Withdraw (revert) a finalized offer (set Status = Active, IsFinalized = false)
        /// Only possible if payment hasn't been processed yet
        /// </summary>
        Task<OfferResult> WithdrawOfferAsync(int offerId, long pharmacyId);
        
        /// <summary>
        /// Get shipment labels with encrypted QR tokens for printing
        /// </summary>
        Task<List<ShipmentLabelDto>> GetShipmentLabelsAsync(int offerId, long pharmacyId);
    }

    // ═══════════════════════════════════════════════════════════════
    // Result Types
    // ═══════════════════════════════════════════════════════════════

    public class OfferResult
    {
        public bool Success { get; set; }
        public OfferDto? Offer { get; set; }
        public string? ErrorMessage { get; set; }
        public int? ErrorCode { get; set; } // HTTP status code
        
        // Smart Matching suggestion
        public bool HasSuggestion { get; set; }
        public int? SuggestedOfferId { get; set; }
        public int? SuggestedMedicationId { get; set; }
        public string? SuggestedOfferType { get; set; }
        public string? Barem { get; set; }
        public int? RemainingStock { get; set; }
        public string? PharmacyName { get; set; }

        public static OfferResult Ok(OfferDto offer) => new() { Success = true, Offer = offer };
        public static OfferResult Error(string message, int code = 400) => new() { Success = false, ErrorMessage = message, ErrorCode = code };
        public static OfferResult Conflict(string message, int suggestedOfferId, int suggestedMedicationId, string offerType, string? barem, int remainingStock, string? pharmacyName) =>
            new() 
            { 
                Success = false, 
                ErrorCode = 409,
                HasSuggestion = true,
                SuggestedOfferId = suggestedOfferId,
                SuggestedMedicationId = suggestedMedicationId,
                SuggestedOfferType = offerType,
                Barem = barem,
                RemainingStock = remainingStock,
                PharmacyName = pharmacyName,
                ErrorMessage = message
            };
    }

    public class DepotClaimResult
    {
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public int? ErrorCode { get; set; }
        public long? ClaimerUserId { get; set; }
        public DateTime? ClaimedAt { get; set; }

        public static DepotClaimResult Ok(long userId, DateTime claimedAt) => new() { Success = true, ClaimerUserId = userId, ClaimedAt = claimedAt };
        public static DepotClaimResult Error(string message, int code, long? existingClaimerId = null) => 
            new() { Success = false, ErrorMessage = message, ErrorCode = code, ClaimerUserId = existingClaimerId };
    }

    /// <summary>
    /// Result type for ProcessBalance (Capture) operation
    /// </summary>
    public class BalanceProcessResult
    {
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public int? ErrorCode { get; set; }
        
        /// <summary>
        /// Total amount captured and transferred to seller
        /// </summary>
        public decimal CapturedAmount { get; set; }
        
        /// <summary>
        /// Number of transactions converted from Provision to Captured
        /// </summary>
        public int TransactionCount { get; set; }

        public static BalanceProcessResult Ok(decimal amount, int txCount) => 
            new() { Success = true, CapturedAmount = amount, TransactionCount = txCount };
        
        public static BalanceProcessResult Error(string message, int code = 400) => 
            new() { Success = false, ErrorMessage = message, ErrorCode = code };
    }
}
