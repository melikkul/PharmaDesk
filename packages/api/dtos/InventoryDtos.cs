using System.ComponentModel.DataAnnotations;
using System;

namespace Backend.Dtos
{
    public class MedicationResponse
    {
        public int Id { get; set; }
        public string ATC { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Manufacturer { get; set; }
        public decimal Price { get; set; }
    }
        public class InventoryItemResponse
    {
        public int Id { get; set; }
        public int MedicationId { get; set; }
        public string MedicationName { get; set; } = string.Empty;
        public string ATC { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string BatchNumber { get; set; } = string.Empty;
        public DateTime ExpiryDate { get; set; }
    }

    public class AddInventoryRequest
    {
        [Required]
        public int MedicationId { get; set; }
        [Required]
        public int Quantity { get; set; }
        [Required]
        public string BatchNumber { get; set; } = string.Empty;
        [Required]
        public DateTime ExpiryDate { get; set; }
    }

    public class UpdateInventoryRequest
    {
        public int? Quantity { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }
    }
}