using Backend.Models;

namespace Backend.Services
{
    /// <summary>
    /// Interface for subscription management service
    /// </summary>
    public interface ISubscriptionService
    {
        /// <summary>
        /// Get the subscription plan and pricing info for a pharmacy
        /// </summary>
        Task<PharmaDesk.Application.DTOs.SubscriptionPlanDto> GetMyPlanAsync(long pharmacyId);

        /// <summary>
        /// Process a subscription payment
        /// Returns a new JWT token with updated subscription claims
        /// </summary>
        Task<PharmaDesk.Application.DTOs.PaymentResultDto> ProcessPaymentAsync(
            long pharmacyId, 
            int userId,
            PharmaDesk.Application.DTOs.PaymentRequestDto request);

        /// <summary>
        /// Check if a pharmacy has an active subscription
        /// </summary>
        Task<bool> IsSubscriptionActiveAsync(long pharmacyId);

        /// <summary>
        /// Calculate the subscription price for a pharmacy based on group settings
        /// </summary>
        Task<decimal> CalculateSubscriptionPriceAsync(long pharmacyId);
    }
}
