using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OffersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OffersController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/offers - Tüm aktif teklifleri listele (Pazaryeri)
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<OfferDto>>> GetAllOffers(
            [FromQuery] string? status = "active",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var query = _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .AsQueryable();

            // Filter by status
            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<OfferStatus>(status, true, out var offerStatus))
                {
                    query = query.Where(o => o.Status == offerStatus);
                }
            }

            var offers = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new OfferDto
                {
                    Id = o.Id,
                    ProductName = o.Medication.Name,
                    Stock = $"{o.Stock} + {o.BonusQuantity}",
                    Price = o.Price,
                    Status = o.Status.ToString().ToLower(),
                    PharmacyName = o.PharmacyProfile.PharmacyName,
                    PharmacyUsername = o.PharmacyProfile.Username
                })
                .ToListAsync();

            return Ok(offers);
        }

        // GET /api/offers/my-offers - Giriş yapan kullanıcının teklifleri
        [HttpGet("my-offers")]
        public async Task<ActionResult<IEnumerable<OfferDto>>> GetMyOffers()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var offers = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .Where(o => o.PharmacyProfileId == pharmacyId.Value)
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new OfferDto
                {
                    Id = o.Id,
                    ProductName = o.Medication.Name,
                    Stock = $"{o.Stock} + {o.BonusQuantity}",
                    Price = o.Price,
                    Status = o.Status.ToString().ToLower(),
                    PharmacyName = o.PharmacyProfile.PharmacyName,
                    PharmacyUsername = o.PharmacyProfile.Username
                })
                .ToListAsync();

            return Ok(offers);
        }

        // POST /api/offers - Yeni teklif oluştur
        [HttpPost]
        public async Task<ActionResult<OfferDto>> CreateOffer([FromBody] CreateOfferRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            // Verify medication exists
            var medication = await _context.Medications.FindAsync(request.MedicationId);
            if (medication == null)
                return NotFound(new { message = "Medication not found" });

            // Check if pharmacy has enough inventory
            var inventory = await _context.InventoryItems
                .Where(i => i.PharmacyProfileId == pharmacyId.Value && i.MedicationId == request.MedicationId)
                .FirstOrDefaultAsync();

            if (inventory == null || inventory.Quantity < request.Stock)
                return BadRequest(new { message = "Insufficient inventory" });

            var offer = new Offer
            {
                PharmacyProfileId = pharmacyId.Value,
                MedicationId = request.MedicationId,
                Price = request.Price,
                Stock = request.Stock,
                BonusQuantity = request.BonusQuantity,
                Status = OfferStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Offers.Add(offer);
            await _context.SaveChangesAsync();

            // Load navigation properties for response
            await _context.Entry(offer).Reference(o => o.Medication).LoadAsync();
            await _context.Entry(offer).Reference(o => o.PharmacyProfile).LoadAsync();

            var response = new OfferDto
            {
                Id = offer.Id,
                ProductName = offer.Medication.Name,
                Stock = $"{offer.Stock} + {offer.BonusQuantity}",
                Price = offer.Price,
                Status = offer.Status.ToString().ToLower(),
                PharmacyName = offer.PharmacyProfile.PharmacyName,
                PharmacyUsername = offer.PharmacyProfile.Username
            };

            return CreatedAtAction(nameof(GetAllOffers), new { id = offer.Id }, response);
        }

        // PATCH /api/offers/{id}/status - Teklif durumunu güncelle
        [HttpPatch("{id}/status")]
        public async Task<ActionResult> UpdateOfferStatus(int id, [FromBody] UpdateOfferStatusRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var offer = await _context.Offers
                .FirstOrDefaultAsync(o => o.Id == id && o.PharmacyProfileId == pharmacyId.Value);

            if (offer == null)
                return NotFound(new { message = "Offer not found" });

            if (Enum.TryParse<OfferStatus>(request.Status, true, out var newStatus))
            {
                offer.Status = newStatus;
                offer.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Offer status updated successfully" });
            }

            return BadRequest(new { message = "Invalid status value" });
        }

        private int? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            if (int.TryParse(pharmacyIdClaim, out var pharmacyId))
                return pharmacyId;
            return null;
        }
    }
}
