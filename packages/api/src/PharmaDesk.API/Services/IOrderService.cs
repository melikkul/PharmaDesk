using Backend.Dtos;

namespace Backend.Services
{
    /// <summary>
    /// Order business logic operations interface
    /// Separates business logic from controller for better testability and maintainability
    /// </summary>
    public interface IOrderService
    {
        // ═══════════════════════════════════════════════════════════════
        // Query Operations
        // ═══════════════════════════════════════════════════════════════
        
        /// <summary>
        /// Get order by ID with authorization check
        /// </summary>
        Task<OrderDto?> GetOrderByIdAsync(int orderId, long requestingPharmacyId);
        
        /// <summary>
        /// Get orders for a specific pharmacy (as buyer or seller)
        /// </summary>
        Task<IEnumerable<OrderDto>> GetOrdersByPharmacyAsync(long pharmacyId, string? role = null);
        
        /// <summary>
        /// Get all orders with pagination (admin only)
        /// </summary>
        Task<IEnumerable<OrderDto>> GetAllOrdersAsync(int page, int pageSize, string? status = null);

        // ═══════════════════════════════════════════════════════════════
        // Command Operations
        // ═══════════════════════════════════════════════════════════════
        
        /// <summary>
        /// Create order from cart items
        /// Handles: Stock deduction, Balance check, Transaction creation
        /// </summary>
        Task<OrderResult> CreateOrderFromCartAsync(long buyerPharmacyId);
        
        /// <summary>
        /// Create a single order for specific offer
        /// </summary>
        Task<OrderResult> CreateOrderAsync(CreateOrderRequest request, long buyerPharmacyId);
        
        /// <summary>
        /// Update order status (Approved, Shipped, Delivered, etc.)
        /// </summary>
        Task<bool> UpdateOrderStatusAsync(int orderId, string status, long pharmacyId);
        
        /// <summary>
        /// Cancel an order (with stock restoration)
        /// </summary>
        Task<bool> CancelOrderAsync(int orderId, long pharmacyId, string? reason);
    }

    // ═══════════════════════════════════════════════════════════════
    // Result Types
    // ═══════════════════════════════════════════════════════════════

    public class OrderResult
    {
        public bool Success { get; set; }
        public OrderDto? Order { get; set; }
        public string? ErrorMessage { get; set; }
        public int? ErrorCode { get; set; } // HTTP status code
        
        // For multiple orders (from cart)
        public List<OrderDto>? Orders { get; set; }
        public decimal TotalAmount { get; set; }
        public int OrderCount { get; set; }

        public static OrderResult Ok(OrderDto order) => new() { Success = true, Order = order };
        public static OrderResult OkMultiple(List<OrderDto> orders, decimal totalAmount) => 
            new() { Success = true, Orders = orders, TotalAmount = totalAmount, OrderCount = orders.Count };
        public static OrderResult Error(string message, int code = 400) => 
            new() { Success = false, ErrorMessage = message, ErrorCode = code };
    }

    // ═══════════════════════════════════════════════════════════════
    // DTOs
    // ═══════════════════════════════════════════════════════════════

    public class CreateOrderRequest
    {
        public int OfferId { get; set; }
        public int Quantity { get; set; }
        public string? Notes { get; set; }
    }

    public class OrderDto
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        
        // Buyer info
        public long BuyerPharmacyId { get; set; }
        public string? BuyerPharmacyName { get; set; }
        
        // Seller info
        public long SellerPharmacyId { get; set; }
        public string? SellerPharmacyName { get; set; }
        
        // Order details
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        
        // Order items
        public List<OrderItemDto> Items { get; set; } = new();
    }

    public class OrderItemDto
    {
        public int Id { get; set; }
        public int MedicationId { get; set; }
        public string? MedicationName { get; set; }
        public string? MedicationBarcode { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public int? OfferId { get; set; }
    }
}
