using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services
{
    /// <summary>
    /// Inventory business logic implementation
    /// Handles CRUD operations for pharmacy inventory items
    /// </summary>
    public class InventoryService : IInventoryService
    {
        private readonly AppDbContext _db;

        public InventoryService(AppDbContext db)
        {
            _db = db;
        }

        /// <inheritdoc />
        public async Task<IEnumerable<object>> GetMyInventoryAsync(int userId)
        {
            var inventory = await _db.InventoryItems
                .AsNoTracking()
                .Where(i => i.PharmacyProfileId == userId)
                .Include(i => i.Medication)
                .Select(i => new
                {
                    id = i.Id,
                    medicationId = i.MedicationId,
                    quantity = i.Quantity,
                    bonusQuantity = i.BonusQuantity,
                    costPrice = i.CostPrice,
                    salePrice = i.SalePrice,
                    expiryDate = i.ExpiryDate.ToString("yyyy-MM-dd"),
                    batchNumber = i.BatchNumber,
                    shelfLocation = i.ShelfLocation,
                    isAlarmSet = i.IsAlarmSet,
                    minStockLevel = i.MinStockLevel,
                    medication = new
                    {
                        id = i.Medication.Id,
                        name = i.Medication.Name,
                        barcode = i.Medication.Barcode,
                        atcCode = i.Medication.ATC,
                        basePrice = i.Medication.BasePrice
                    }
                })
                .ToListAsync();

            return inventory;
        }

        /// <inheritdoc />
        public async Task<InventoryResult> AddInventoryItemAsync(AddInventoryRequest request, int userId)
        {
            var medicationExists = await _db.Medications.AnyAsync(m => m.Id == request.MedicationId);
            if (!medicationExists)
                return InventoryResult.NotFound("Belirtilen ilaç bulunamadı.");

            var newItem = new InventoryItem
            {
                PharmacyProfileId = userId,
                MedicationId = request.MedicationId,
                Quantity = request.Quantity,
                BatchNumber = request.BatchNumber,
                ExpiryDate = request.ExpiryDate.ToUniversalTime()
            };

            _db.InventoryItems.Add(newItem);
            await _db.SaveChangesAsync();

            return InventoryResult.Ok(newItem);
        }

        /// <inheritdoc />
        public async Task<InventoryResult> UpdateInventoryItemAsync(int id, UpdateInventoryRequest request, int userId)
        {
            var item = await _db.InventoryItems
                .Where(i => i.Id == id && i.PharmacyProfileId == userId)
                .SingleOrDefaultAsync();

            if (item == null)
                return InventoryResult.NotFound("Envanter öğesi bulunamadı veya yetkiniz yok.");

            if (request.Quantity.HasValue) item.Quantity = request.Quantity.Value;
            if (request.BatchNumber != null) item.BatchNumber = request.BatchNumber;
            if (request.ExpiryDate.HasValue) item.ExpiryDate = request.ExpiryDate.Value.ToUniversalTime();

            await _db.SaveChangesAsync();
            return InventoryResult.Ok();
        }

        /// <inheritdoc />
        public async Task<InventoryResult> DeleteInventoryItemAsync(int id, int userId)
        {
            var item = await _db.InventoryItems
                .Where(i => i.Id == id && i.PharmacyProfileId == userId)
                .SingleOrDefaultAsync();

            if (item == null)
                return InventoryResult.NotFound();

            _db.InventoryItems.Remove(item);
            await _db.SaveChangesAsync();
            return InventoryResult.Ok();
        }
    }
}
