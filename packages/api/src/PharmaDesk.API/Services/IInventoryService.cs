using Backend.Dtos;

namespace Backend.Services
{
    /// <summary>
    /// Inventory business logic operations interface
    /// Separates business logic from controller for better testability and maintainability
    /// </summary>
    public interface IInventoryService
    {
        /// <summary>
        /// Get all inventory items for a pharmacy
        /// </summary>
        Task<IEnumerable<object>> GetMyInventoryAsync(int userId);
        
        /// <summary>
        /// Add a new inventory item
        /// </summary>
        Task<InventoryResult> AddInventoryItemAsync(AddInventoryRequest request, int userId);
        
        /// <summary>
        /// Update an existing inventory item
        /// </summary>
        Task<InventoryResult> UpdateInventoryItemAsync(int id, UpdateInventoryRequest request, int userId);
        
        /// <summary>
        /// Delete an inventory item
        /// </summary>
        Task<InventoryResult> DeleteInventoryItemAsync(int id, int userId);
    }

    /// <summary>
    /// Result type for inventory operations
    /// </summary>
    public class InventoryResult
    {
        public bool Success { get; set; }
        public object? Data { get; set; }
        public string? ErrorMessage { get; set; }
        public int? ErrorCode { get; set; }

        public static InventoryResult Ok(object? data = null) => new() { Success = true, Data = data };
        public static InventoryResult NotFound(string message = "Kayıt bulunamadı.") => new() { Success = false, ErrorMessage = message, ErrorCode = 404 };
        public static InventoryResult BadRequest(string message) => new() { Success = false, ErrorMessage = message, ErrorCode = 400 };
        public static InventoryResult Unauthorized() => new() { Success = false, ErrorMessage = "Yetkisiz erişim.", ErrorCode = 401 };
    }
}
