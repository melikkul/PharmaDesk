using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaDesk.Application.DTOs;
using System.Security.Claims;

namespace Backend.Controllers
{
    /// <summary>
    /// Controller for subscription management.
    /// Handles subscription plan info, payments, and status checks.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private readonly ILogger<SubscriptionController> _logger;

        public SubscriptionController(
            ISubscriptionService subscriptionService,
            ILogger<SubscriptionController> logger)
        {
            _subscriptionService = subscriptionService;
            _logger = logger;
        }

        /// <summary>
        /// Get current user's subscription plan and pricing.
        /// Returns calculated price based on group settings.
        /// </summary>
        [HttpGet("my-plan")]
        public async Task<ActionResult<SubscriptionPlanDto>> GetMyPlan()
        {
            var pharmacyId = GetPharmacyIdFromClaims();
            if (!pharmacyId.HasValue)
            {
                return Unauthorized(new { error = "Pharmacy not found" });
            }

            try
            {
                var plan = await _subscriptionService.GetMyPlanAsync(pharmacyId.Value);
                return Ok(plan);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription plan for pharmacy {PharmacyId}", pharmacyId);
                return StatusCode(500, new { error = "Abonelik bilgileri alınamadı" });
            }
        }

        /// <summary>
        /// Process a subscription payment.
        /// Returns new JWT token with updated subscription status.
        /// </summary>
        [HttpPost("pay")]
        public async Task<ActionResult<PaymentResultDto>> ProcessPayment([FromBody] PaymentRequestDto request)
        {
            var pharmacyId = GetPharmacyIdFromClaims();
            var userId = GetUserIdFromClaims();

            if (!pharmacyId.HasValue || !userId.HasValue)
            {
                return Unauthorized(new { error = "User or pharmacy not found" });
            }

            try
            {
                var result = await _subscriptionService.ProcessPaymentAsync(
                    pharmacyId.Value, 
                    userId.Value, 
                    request);

                if (result.Success)
                {
                    // Set new access token as cookie
                    if (!string.IsNullOrEmpty(result.NewAccessToken))
                    {
                        SetAccessTokenCookie(result.NewAccessToken);
                    }

                    return Ok(result);
                }

                return BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment for pharmacy {PharmacyId}", pharmacyId);
                return StatusCode(500, new { error = "Ödeme işlemi sırasında bir hata oluştu" });
            }
        }

        /// <summary>
        /// Check subscription status.
        /// Returns active/inactive status.
        /// </summary>
        [HttpGet("status")]
        public async Task<ActionResult> GetSubscriptionStatus()
        {
            var pharmacyId = GetPharmacyIdFromClaims();
            if (!pharmacyId.HasValue)
            {
                return Unauthorized(new { error = "Pharmacy not found" });
            }

            try
            {
                var isActive = await _subscriptionService.IsSubscriptionActiveAsync(pharmacyId.Value);
                return Ok(new 
                { 
                    isActive,
                    status = isActive ? "Active" : "Inactive"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking subscription status for pharmacy {PharmacyId}", pharmacyId);
                return StatusCode(500, new { error = "Abonelik durumu kontrol edilemedi" });
            }
        }

        /// <summary>
        /// Get subscription price for current user.
        /// Useful for displaying price before payment.
        /// </summary>
        [HttpGet("price")]
        public async Task<ActionResult> GetSubscriptionPrice()
        {
            var pharmacyId = GetPharmacyIdFromClaims();
            if (!pharmacyId.HasValue)
            {
                return Unauthorized(new { error = "Pharmacy not found" });
            }

            try
            {
                var price = await _subscriptionService.CalculateSubscriptionPriceAsync(pharmacyId.Value);
                return Ok(new { price });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating price for pharmacy {PharmacyId}", pharmacyId);
                return StatusCode(500, new { error = "Fiyat hesaplanamadı" });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // Private Helpers
        // ═══════════════════════════════════════════════════════════════

        private long? GetPharmacyIdFromClaims()
        {
            var claim = User.FindFirst("PharmacyId")?.Value;
            if (long.TryParse(claim, out var id))
            {
                return id;
            }
            return null;
        }

        private int? GetUserIdFromClaims()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(claim, out var id))
            {
                return id;
            }
            return null;
        }

        private void SetAccessTokenCookie(string token)
        {
            var isDev = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
            
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = !isDev,
                SameSite = SameSiteMode.Strict,
                Path = "/",
                Expires = DateTimeOffset.UtcNow.AddMinutes(60),
                IsEssential = true
            };

            Response.Cookies.Append("token", token, cookieOptions);
        }
    }
}
