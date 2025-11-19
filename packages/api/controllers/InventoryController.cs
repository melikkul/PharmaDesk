using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // tum endpointler icin yetkilendirme zorunlu
    public class InventoryController : ControllerBase
    {
        private readonly AppDbContext _db;

        public InventoryController(AppDbContext db)
        {
            _db = db;
        }

        private int GetUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(idClaim) || !int.TryParse(idClaim, out var uid))
                throw new UnauthorizedAccessException("User ID is missing or invalid.");
            return uid;
        }

        [HttpGet("me")]
        public async Task<ActionResult<IEnumerable<InventoryItemResponse>>> GetMyInventory()
        {
            try
            {
                var userId = GetUserId();

                var inventory = await _db.InventoryItems
                    .AsNoTracking()
                    .Where(i => i.PharmacyProfileId == userId)
                    .Include(i => i.Medication) 
                    .Select(i => new InventoryItemResponse
                    {
                        Id = i.Id,
                        MedicationId = i.MedicationId,
                        MedicationName = i.Medication.Name,
                        ATC = i.Medication.ATC,
                        Quantity = i.Quantity,
                        BatchNumber = i.BatchNumber,
                        ExpiryDate = i.ExpiryDate
                    })
                    .ToListAsync();

                return Ok(inventory);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
        }

        [HttpPost]
        public async Task<IActionResult> AddItemToInventory([FromBody] AddInventoryRequest req)
        {
            try
            {
                var userId = GetUserId();
                
                var medicationExists = await _db.Medications.AnyAsync(m => m.Id == req.MedicationId);
                if (!medicationExists) return NotFound(new { error = "Belirtilen ilaç bulunamadı." });

                var newItem = new InventoryItem
                {
                    PharmacyProfileId = userId,
                    MedicationId = req.MedicationId,
                    Quantity = req.Quantity,
                    BatchNumber = req.BatchNumber,
                    ExpiryDate = req.ExpiryDate.ToUniversalTime() 
                };

                _db.InventoryItems.Add(newItem);
                await _db.SaveChangesAsync();

                return CreatedAtAction(nameof(GetMyInventory), new { id = newItem.Id }, newItem);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateInventoryItem(int id, [FromBody] UpdateInventoryRequest req)
        {
            try
            {
                var userId = GetUserId();

                var item = await _db.InventoryItems
                    .Where(i => i.Id == id && i.PharmacyProfileId == userId)
                    .SingleOrDefaultAsync();

                if (item == null) return NotFound(new { error = "Envanter öğesi bulunamadı veya yetkiniz yok." });

                if (req.Quantity.HasValue) item.Quantity = req.Quantity.Value;
                if (req.BatchNumber != null) item.BatchNumber = req.BatchNumber;
                if (req.ExpiryDate.HasValue) item.ExpiryDate = req.ExpiryDate.Value.ToUniversalTime();

                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInventoryItem(int id)
        {
            try
            {
                var userId = GetUserId();

                var item = await _db.InventoryItems
                    .Where(i => i.Id == id && i.PharmacyProfileId == userId)
                    .SingleOrDefaultAsync();

                if (item == null) return NotFound();

                _db.InventoryItems.Remove(item);
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
        }
    }
}