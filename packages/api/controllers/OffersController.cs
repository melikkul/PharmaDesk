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
                    MedicationId = o.MedicationId,
                    ProductName = o.Medication.Name,
                    Barcode = o.Medication.Barcode,
                    Type = o.Type.ToString().ToLower(),
                    Stock = $"{o.Stock} + {o.BonusQuantity}",
                    Price = o.Price,
                    Status = o.Status.ToString().ToLower(),
                    PharmacyId = o.PharmacyProfile.Id.ToString(),
                    PharmacyName = o.PharmacyProfile.PharmacyName,
                    PharmacyUsername = o.PharmacyProfile.Username,
                    Description = o.Medication.Description,
                    Manufacturer = o.Medication.Manufacturer,
                    ImageUrl = null, // Placeholder or add to DB later
                    ExpirationDate = o.ExpirationDate.HasValue ? o.ExpirationDate.Value.ToString("MM/yyyy") : null,
                    CampaignEndDate = o.CampaignEndDate.HasValue ? o.CampaignEndDate.Value.ToString("yyyy-MM-dd") : null,
                    CampaignBonusMultiplier = o.Type == OfferType.Campaign ? o.CampaignBonusMultiplier : null,
                    MinimumOrderQuantity = o.Type == OfferType.Tender ? o.MinimumOrderQuantity : null,
                    BiddingDeadline = o.BiddingDeadline.HasValue ? o.BiddingDeadline.Value.ToString("yyyy-MM-dd") : null
                })
                .ToListAsync();

            return Ok(offers);
        }

        [HttpGet("my-offers")]
        public async Task<ActionResult<IEnumerable<OfferDto>>> GetMyOffers()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            
            // Throw detailed exception for debugging
            if (pharmacyId == null)
            {
                var allClaims = User.Claims.Select(c => $"{c.Type}={c.Value}").ToList();
                var claimsString = string.Join(", ", allClaims);
                throw new Exception($"GetPharmacyIdFromToken returned null. All claims: [{claimsString}]");
            }

            var offers = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .Where(o => o.PharmacyProfileId == pharmacyId.Value)
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new OfferDto
                {
                    Id = o.Id,
                    MedicationId = o.MedicationId,
                    ProductName = o.Medication.Name,
                    Barcode = o.Medication.Barcode,
                    Type = o.Type.ToString().ToLower(),
                    Stock = $"{o.Stock} + {o.BonusQuantity}",
                    Price = o.Price,
                    Status = o.Status.ToString().ToLower(),
                    PharmacyId = o.PharmacyProfile.Id.ToString(),
                    PharmacyName = o.PharmacyProfile.PharmacyName,
                    PharmacyUsername = o.PharmacyProfile.Username,
                    Description = o.Medication.Description,
                    Manufacturer = o.Medication.Manufacturer,
                    ImageUrl = null,
                    ExpirationDate = o.ExpirationDate.HasValue ? o.ExpirationDate.Value.ToString("MM/yyyy") : null,
                    CampaignEndDate = o.CampaignEndDate.HasValue ? o.CampaignEndDate.Value.ToString("yyyy-MM-dd") : null,
                    CampaignBonusMultiplier = o.Type == OfferType.Campaign ? o.CampaignBonusMultiplier : null,
                    MinimumOrderQuantity = o.Type == OfferType.Tender ? o.MinimumOrderQuantity : null,
                    BiddingDeadline = o.BiddingDeadline.HasValue ? o.BiddingDeadline.Value.ToString("yyyy-MM-dd") : null
                })
                .ToListAsync();

            return Ok(offers);
        }

        // GET /api/offers/{id} - Teklif detayını getir
        [HttpGet("{id}")]
        public async Task<ActionResult<OfferDto>> GetOfferById(int id)
        {
            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (offer == null)
                return NotFound(new { message = "Offer not found" });

            var response = new OfferDto
            {
                Id = offer.Id,
                MedicationId = offer.MedicationId,
                ProductName = offer.Medication.Name,
                Type = offer.Type.ToString().ToLower(),
                Stock = $"{offer.Stock} + {offer.BonusQuantity}",
                Price = offer.Price,
                Status = offer.Status.ToString().ToLower(),
                PharmacyId = offer.PharmacyProfile.Id.ToString(),
                PharmacyName = offer.PharmacyProfile.PharmacyName,
                PharmacyUsername = offer.PharmacyProfile.Username,
                Description = offer.Medication.Description,
                Manufacturer = offer.Medication.Manufacturer,
                ImageUrl = null,
                CampaignEndDate = offer.CampaignEndDate?.ToString("yyyy-MM-dd"),
                CampaignBonusMultiplier = offer.Type == OfferType.Campaign ? offer.CampaignBonusMultiplier : null,
                MinimumOrderQuantity = offer.Type == OfferType.Tender ? offer.MinimumOrderQuantity : null,
                BiddingDeadline = offer.BiddingDeadline?.ToString("yyyy-MM-dd")
            };

            return Ok(response);
        }

        // GET /api/offers/medication/{medicationId} - İlacın tüm tekliflerini getir
        [HttpGet("medication/{medicationId}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<OfferDto>>> GetOffersByMedicationId(int medicationId)
        {
            var offers = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .Where(o => o.MedicationId == medicationId && o.Status == OfferStatus.Active)
                .OrderBy(o => o.Price) // En ucuzdan pahalıya
                .ToListAsync();

            var dtos = offers.Select(o => new OfferDto
            {
                Id = o.Id,
                MedicationId = o.MedicationId,
                ProductName = o.Medication.Name,
                Barcode = o.Medication.Barcode,
                Type = o.Type.ToString().ToLower(),
                Stock = $"{o.Stock} + {o.BonusQuantity}",
                Price = o.Price,
                Status = o.Status.ToString().ToLower(),
                PharmacyId = o.PharmacyProfile.Id.ToString(),
                PharmacyName = o.PharmacyProfile.PharmacyName,
                PharmacyUsername = o.PharmacyProfile.Username,
                Description = o.Medication.Description,
                Manufacturer = o.Medication.Manufacturer,
                ImageUrl = null,
                ExpirationDate = o.ExpirationDate.HasValue ? o.ExpirationDate.Value.ToString("MM/yyyy") : null,
                CampaignEndDate = o.CampaignEndDate.HasValue ? o.CampaignEndDate.Value.ToString("yyyy-MM-dd") : null,
                CampaignBonusMultiplier = o.Type == OfferType.Campaign ? o.CampaignBonusMultiplier : null,
                MinimumOrderQuantity = o.Type == OfferType.Tender ? o.MinimumOrderQuantity : null,
                BiddingDeadline = o.BiddingDeadline.HasValue ? o.BiddingDeadline.Value.ToString("yyyy-MM-dd") : null
            }).ToList();

            return Ok(dtos);
        }

        // POST /api/offers - Yeni teklif oluştur
        [HttpPost]
        public async Task<ActionResult<OfferDto>> CreateOffer([FromBody] CreateOfferRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            // Parse offer type
            if (!Enum.TryParse<OfferType>(request.Type, true, out var offerType))
                return BadRequest(new { message = "Invalid offer type" });

            // Verify medication exists - support MedicationId, Barcode, or ProductName
            Medication? medication = null;

            if (request.MedicationId.HasValue)
            {
                medication = await _context.Medications.FindAsync(request.MedicationId.Value);
            }
            else if (!string.IsNullOrEmpty(request.Barcode))
            {
                medication = await _context.Medications
                    .FirstOrDefaultAsync(m => m.Barcode == request.Barcode);
            }
            else if (!string.IsNullOrEmpty(request.ProductName))
            {
                medication = await _context.Medications
                    .FirstOrDefaultAsync(m => m.Name == request.ProductName);
            }

            if (medication == null)
                return NotFound(new { message = "Medication not found" });


            // For standard offers, ensure inventory exists
            if (offerType == OfferType.Standard)
            {
                var inventory = await _context.InventoryItems
                    .Where(i => i.PharmacyProfileId == pharmacyId.Value && i.MedicationId == medication.Id)
                    .FirstOrDefaultAsync();

                if (inventory == null)
                {
                    // Auto-create inventory item from offer data
                    DateTime expiryDate;
                    
                    // Parse expiration date (expected format: "MM/YYYY" or "MM / YYYY")
                    if (!string.IsNullOrEmpty(request.ExpirationDate))
                    {
                        var parts = request.ExpirationDate.Replace(" ", "").Split('/');
                        if (parts.Length == 2 && int.TryParse(parts[0], out int month) && int.TryParse(parts[1], out int year))
                        {
                            // Set to last day of the month
                            expiryDate = new DateTime(year, month, DateTime.DaysInMonth(year, month));
                        }
                        else
                        {
                            // Default to 1 year from now if parsing fails
                            expiryDate = DateTime.UtcNow.AddYears(1);
                        }
                    }
                    else
                    {
                        expiryDate = DateTime.UtcNow.AddYears(1);
                    }

                    // Create new inventory item
                    inventory = new InventoryItem
                    {
                        PharmacyProfileId = pharmacyId.Value,
                        MedicationId = medication.Id,
                        Quantity = request.Stock,
                        BonusQuantity = request.BonusQuantity,
                        CostPrice = request.Price,
                        SalePrice = request.Price,
                        ExpiryDate = DateTime.SpecifyKind(expiryDate, DateTimeKind.Utc),
                        BatchNumber = $"AUTO-{DateTime.UtcNow:yyyyMMddHHmmss}",
                        IsAlarmSet = false,
                        MinStockLevel = 0
                    };

                    _context.InventoryItems.Add(inventory);
                    await _context.SaveChangesAsync();
                }
                else if (inventory.Quantity < request.Stock)
                {
                    // Update inventory quantity if needed
                    inventory.Quantity = request.Stock;
                    inventory.BonusQuantity = request.BonusQuantity;
                    await _context.SaveChangesAsync();
                }
            }

            // Type-specific validation
            if (offerType == OfferType.Campaign)
            {
                if (!request.CampaignEndDate.HasValue)
                    return BadRequest(new { message = "Campaign offers require an end date" });
            }
            else if (offerType == OfferType.Tender)
            {
                if (!request.BiddingDeadline.HasValue || !request.MinimumOrderQuantity.HasValue)
                    return BadRequest(new { message = "Tender offers require bidding deadline and minimum order quantity" });
            }

            // Parse expiration date
            DateTime? expirationDate = null;
            if (!string.IsNullOrEmpty(request.ExpirationDate))
            {
                var parts = request.ExpirationDate.Replace(" ", "").Split('/');
                if (parts.Length == 2 && int.TryParse(parts[0], out int month) && int.TryParse(parts[1], out int year))
                {
                    expirationDate = DateTime.SpecifyKind(new DateTime(year, month, DateTime.DaysInMonth(year, month)), DateTimeKind.Utc);
                }
            }

            var offer = new Offer
            {
                PharmacyProfileId = pharmacyId.Value,
                MedicationId = medication.Id,
                Type = offerType,
                Price = request.Price,
                Stock = request.Stock,
                BonusQuantity = request.BonusQuantity,
                Status = OfferStatus.Active,
                ExpirationDate = expirationDate,
                // Campaign-specific
                CampaignStartDate = request.CampaignStartDate,
                CampaignEndDate = request.CampaignEndDate,
                CampaignBonusMultiplier = request.CampaignBonusMultiplier,
                // Tender-specific
                MinimumOrderQuantity = request.MinimumOrderQuantity,
                BiddingDeadline = request.BiddingDeadline,
                AcceptingCounterOffers = request.AcceptingCounterOffers,
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
                MedicationId = offer.MedicationId,
                ProductName = offer.Medication.Name,
                Type = offer.Type.ToString().ToLower(),
                Stock = $"{offer.Stock} + {offer.BonusQuantity}",
                Price = offer.Price,
                Status = offer.Status.ToString().ToLower(),
                PharmacyId = offer.PharmacyProfile.Id.ToString(),
                PharmacyName = offer.PharmacyProfile.PharmacyName,
                PharmacyUsername = offer.PharmacyProfile.Username,
                Description = offer.Medication.Description,
                Manufacturer = offer.Medication.Manufacturer,
                ImageUrl = null,
                CampaignEndDate = offer.CampaignEndDate?.ToString("yyyy-MM-dd"),
                CampaignBonusMultiplier = offer.Type == OfferType.Campaign ? offer.CampaignBonusMultiplier : null,
                MinimumOrderQuantity = offer.Type == OfferType.Tender ? offer.MinimumOrderQuantity : null,
                BiddingDeadline = offer.BiddingDeadline?.ToString("yyyy-MM-dd")
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

        // PUT /api/offers/{id} - Teklif düzenle
        [HttpPut("{id}")]
        public async Task<ActionResult<OfferDto>> UpdateOffer(int id, [FromBody] UpdateOfferRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var offer = await _context.Offers
                .Include(o => o.Medication)
                .Include(o => o.PharmacyProfile)
                .FirstOrDefaultAsync(o => o.Id == id && o.PharmacyProfileId == pharmacyId.Value);

            if (offer == null)
                return NotFound(new { message = "Offer not found" });

            // Update common fields
            offer.Price = request.Price;
            offer.Stock = request.Stock;
            offer.BonusQuantity = request.BonusQuantity;
            offer.MinSaleQuantity = request.MinSaleQuantity;

            // Update type-specific fields based on offer type
            if (offer.Type == OfferType.Campaign)
            {
                if (request.CampaignEndDate.HasValue)
                    offer.CampaignEndDate = request.CampaignEndDate;
                if (request.CampaignStartDate.HasValue)
                    offer.CampaignStartDate = request.CampaignStartDate;
                if (request.CampaignBonusMultiplier.HasValue)
                    offer.CampaignBonusMultiplier = request.CampaignBonusMultiplier.Value;
            }
            else if (offer.Type == OfferType.Tender)
            {
                if (request.MinimumOrderQuantity.HasValue)
                    offer.MinimumOrderQuantity = request.MinimumOrderQuantity;
                if (request.BiddingDeadline.HasValue)
                    offer.BiddingDeadline = request.BiddingDeadline;
                if (request.AcceptingCounterOffers.HasValue)
                    offer.AcceptingCounterOffers = request.AcceptingCounterOffers.Value;
            }

            offer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var response = new OfferDto
            {
                Id = offer.Id,
                MedicationId = offer.MedicationId,
                ProductName = offer.Medication.Name,
                Type = offer.Type.ToString().ToLower(),
                Stock = $"{offer.Stock} + {offer.BonusQuantity}",
                Price = offer.Price,
                Status = offer.Status.ToString().ToLower(),
                PharmacyId = offer.PharmacyProfile.Id.ToString(),
                PharmacyName = offer.PharmacyProfile.PharmacyName,
                PharmacyUsername = offer.PharmacyProfile.Username,
                Description = offer.Medication.Description,
                Manufacturer = offer.Medication.Manufacturer,
                ImageUrl = null,
                CampaignEndDate = offer.CampaignEndDate?.ToString("yyyy-MM-dd"),
                CampaignBonusMultiplier = offer.Type == OfferType.Campaign ? offer.CampaignBonusMultiplier : null,
                MinimumOrderQuantity = offer.Type == OfferType.Tender ? offer.MinimumOrderQuantity : null,
                BiddingDeadline = offer.BiddingDeadline?.ToString("yyyy-MM-dd")
            };

            return Ok(response);
        }

        // DELETE /api/offers/{id} - Teklifi sil
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteOffer(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var offer = await _context.Offers
                .FirstOrDefaultAsync(o => o.Id == id && o.PharmacyProfileId == pharmacyId.Value);

            if (offer == null)
                return NotFound(new { message = "Offer not found" });

            _context.Offers.Remove(offer);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Offer deleted successfully" });
        }
        private long? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            Console.WriteLine($"[DEBUG] PharmacyId Claim Value: '{pharmacyIdClaim}'");
            
            if (long.TryParse(pharmacyIdClaim, out var pharmacyId))
            {
                Console.WriteLine($"[DEBUG] Parsed PharmacyId: {pharmacyId}");
                return pharmacyId;
            }
            
            Console.WriteLine($"[DEBUG] Failed to parse PharmacyId from claim: '{pharmacyIdClaim}'");
            return null;
        }
    }
}
