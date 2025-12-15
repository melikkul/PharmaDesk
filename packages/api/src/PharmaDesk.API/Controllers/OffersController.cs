using Backend.Dtos;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Controllers
{
    /// <summary>
    /// REFACTORED: Thin Controller - delegating all business logic to IOfferService
    /// Only handles HTTP request/response mapping
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "User,Admin")]
    public class OffersController : ControllerBase
    {
        private readonly IOfferService _offerService;

        public OffersController(IOfferService offerService)
        {
            _offerService = offerService;
        }

        // ═══════════════════════════════════════════════════════════════
        // GET Endpoints
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// GET /api/offers - Tüm aktif teklifleri listele (Pazaryeri)
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<OfferDto>>> GetAllOffers(
            [FromQuery] string? status = "active",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var offers = await _offerService.GetAllOffersAsync(status, page, pageSize);
            return Ok(offers);
        }

        /// <summary>
        /// GET /api/offers/my-offers - Kendi tekliflerimi getir
        /// </summary>
        [HttpGet("my-offers")]
        public async Task<ActionResult<IEnumerable<OfferDto>>> GetMyOffers()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
            {
                var allClaims = User.Claims.Select(c => $"{c.Type}={c.Value}").ToList();
                return BadRequest(new { message = $"PharmacyId bulunamadı. Claims: [{string.Join(", ", allClaims)}]" });
            }

            var offers = await _offerService.GetMyOffersAsync(pharmacyId.Value);
            return Ok(offers);
        }

        /// <summary>
        /// GET /api/offers/{id} - Teklif detayını getir
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<OfferDto>> GetOfferById(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            var offer = await _offerService.GetOfferByIdAsync(id, pharmacyId);

            if (offer == null)
                return NotFound(new { message = "Teklif bulunamadı veya erişim yetkiniz yok." });

            return Ok(offer);
        }

        /// <summary>
        /// GET /api/offers/medication/{medicationId} - İlacın tüm tekliflerini getir
        /// Finalized offers are only visible to participants
        /// </summary>
        [HttpGet("medication/{medicationId}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<OfferDto>>> GetOffersByMedicationId(int medicationId)
        {
            // Get pharmacy ID if user is authenticated (optional for this endpoint)
            var pharmacyId = GetPharmacyIdFromToken();
            
            var offers = await _offerService.GetOffersByMedicationIdAsync(medicationId, pharmacyId);
            return Ok(offers);
        }

        // ═══════════════════════════════════════════════════════════════
        // POST/PUT/PATCH/DELETE Endpoints
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// POST /api/offers - Yeni teklif oluştur
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<OfferDto>> CreateOffer([FromBody] CreateOfferRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var result = await _offerService.CreateOfferAsync(request, pharmacyId.Value);

            if (!result.Success)
            {
                if (result.HasSuggestion)
                {
                    return Conflict(new
                    {
                        hasSuggestion = true,
                        suggestedOfferId = result.SuggestedOfferId,
                        suggestedMedicationId = result.SuggestedMedicationId,
                        suggestedOfferType = result.SuggestedOfferType,
                        barem = result.Barem,
                        message = result.ErrorMessage,
                        remainingStock = result.RemainingStock,
                        pharmacyName = result.PharmacyName
                    });
                }

                return result.ErrorCode switch
                {
                    404 => NotFound(new { message = result.ErrorMessage }),
                    _ => BadRequest(new { message = result.ErrorMessage })
                };
            }

            return CreatedAtAction(nameof(GetOfferById), new { id = result.Offer!.Id }, result.Offer);
        }

        /// <summary>
        /// PUT /api/offers/{id} - Teklif güncelle
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<OfferDto>> UpdateOffer(int id, [FromBody] UpdateOfferRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var result = await _offerService.UpdateOfferAsync(id, request, pharmacyId.Value);

            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    404 => NotFound(new { message = result.ErrorMessage }),
                    _ => BadRequest(new { message = result.ErrorMessage })
                };
            }

            return Ok(result.Offer);
        }

        /// <summary>
        /// PATCH /api/offers/{id}/status - Teklif durumunu güncelle
        /// </summary>
        [HttpPatch("{id}/status")]
        public async Task<ActionResult> UpdateOfferStatus(int id, [FromBody] UpdateOfferStatusRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var success = await _offerService.UpdateOfferStatusAsync(id, request.Status, pharmacyId.Value);

            if (!success)
                return NotFound(new { message = "Teklif bulunamadı veya geçersiz durum değeri." });

            return Ok(new { message = "Teklif durumu başarıyla güncellendi." });
        }

        /// <summary>
        /// DELETE /api/offers/{id} - Teklifi sil
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteOffer(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var success = await _offerService.DeleteOfferAsync(id, pharmacyId.Value);

            if (!success)
                return NotFound(new { message = "Teklif bulunamadı." });

            return Ok(new { message = "Teklif başarıyla silindi." });
        }

        // ═══════════════════════════════════════════════════════════════
        // Depot Operations
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// POST /api/offers/{id}/claim-depot - Depo sorumluluğunu üstlen
        /// </summary>
        [HttpPost("{id}/claim-depot")]
        public async Task<ActionResult> ClaimDepot(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (!pharmacyId.HasValue)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var result = await _offerService.ClaimDepotAsync(id, pharmacyId.Value);

            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    404 => NotFound(new { message = result.ErrorMessage }),
                    409 => Conflict(new { message = result.ErrorMessage, claimerUserId = result.ClaimerUserId }),
                    _ => BadRequest(new { message = result.ErrorMessage })
                };
            }

            return Ok(new
            {
                message = "Depo sorumluluğu başarıyla üstlenildi.",
                claimerUserId = result.ClaimerUserId,
                claimedAt = result.ClaimedAt
            });
        }

        /// <summary>
        /// DELETE /api/offers/{id}/claim-depot - Depo sorumluluğundan çık
        /// </summary>
        [HttpDelete("{id}/claim-depot")]
        public async Task<ActionResult> UnclaimDepot(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (!pharmacyId.HasValue)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var success = await _offerService.UnclaimDepotAsync(id, pharmacyId.Value);

            if (!success)
                return Forbid();

            return Ok(new { message = "Depo sorumluluğundan ayrıldınız." });
        }

        // ═══════════════════════════════════════════════════════════════
        // Financial Operations (Provision/Capture Pattern)
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// POST /api/offers/{id}/process-balance - Provizyon tahsilatı (Capture)
        /// Teklif sahibi tarafından çağrılır, bloke edilen parayı satıcıya aktarır
        /// </summary>
        [HttpPost("{id}/process-balance")]
        public async Task<ActionResult> ProcessBalance(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (!pharmacyId.HasValue)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var result = await _offerService.ProcessBalanceAsync(id, pharmacyId.Value);

            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    403 => Forbid(),
                    404 => NotFound(new { message = result.ErrorMessage }),
                    409 => Conflict(new { message = result.ErrorMessage }),
                    _ => BadRequest(new { message = result.ErrorMessage })
                };
            }

            return Ok(new
            {
                message = "Ödeme başarıyla işlendi.",
                capturedAmount = result.CapturedAmount,
                transactionCount = result.TransactionCount
            });
        }

        /// <summary>
        /// POST /api/offers/{id}/finalize - Teklifi sonlandır
        /// Satıcı tarafından çağrılır, teklifi Passive durumuna geçirir
        /// </summary>
        [HttpPost("{id}/finalize")]
        public async Task<ActionResult> FinalizeOffer(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (!pharmacyId.HasValue)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var result = await _offerService.FinalizeOfferAsync(id, pharmacyId.Value);

            if (!result.Success)
            {
                return result.ErrorCode switch
                {
                    403 => Forbid(),
                    404 => NotFound(new { message = result.ErrorMessage }),
                    409 => Conflict(new { message = result.ErrorMessage }),
                    _ => BadRequest(new { message = result.ErrorMessage })
                };
            }

            return Ok(new
            {
                message = "Teklif başarıyla sonlandırıldı.",
                offer = result.Offer
            });
        }

        /// <summary>
        /// GET /api/offers/{id}/shipment-labels - Kargo etiketlerini getir (QR kod için)
        /// Satıcı tarafından çağrılır, ödeme işlendikten sonra kullanılır
        /// </summary>
        [HttpGet("{id}/shipment-labels")]
        public async Task<ActionResult<List<object>>> GetShipmentLabels(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (!pharmacyId.HasValue)
                return Unauthorized(new { message = "Eczane profili bulunamadı." });

            var labels = await _offerService.GetShipmentLabelsAsync(id, pharmacyId.Value);

            if (labels == null || !labels.Any())
                return NotFound(new { message = "Etiket bulunamadı. Önce siparişler olmalıdır." });

            return Ok(labels);
        }

        // ═══════════════════════════════════════════════════════════════
        // Private Helper
        // ═══════════════════════════════════════════════════════════════

        private long? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            return long.TryParse(pharmacyIdClaim, out var pharmacyId) ? pharmacyId : null;
        }
    }
}
