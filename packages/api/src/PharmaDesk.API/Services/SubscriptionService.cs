using Backend.Data;
using Backend.Models;
using Backend.Utils;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using PharmaDesk.Application.DTOs;

namespace Backend.Services
{
    /// <summary>
    /// Service for managing SaaS subscriptions and payments.
    /// Handles pricing calculation, payment processing, and token refresh.
    /// </summary>
    public class SubscriptionService : ISubscriptionService
    {
        private readonly AppDbContext _appDb;
        private readonly IdentityDbContext _identityDb;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SubscriptionService> _logger;

        // Pricing constants
        private const decimal DEFAULT_SUBSCRIPTION_PRICE = 400m; // Default 400 TL/month
        private const decimal CARGO_SERVICE_PRICE = 2450m; // 2450 TL/month for cargo
        private const int SUBSCRIPTION_PERIOD_DAYS = 30; // Monthly subscription
        private const int ACCESS_TOKEN_EXPIRY_MINUTES = 60;

        public SubscriptionService(
            AppDbContext appDb, 
            IdentityDbContext identityDb,
            IConfiguration configuration,
            ILogger<SubscriptionService> logger)
        {
            _appDb = appDb;
            _identityDb = identityDb;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Get the subscription plan and pricing info for a pharmacy.
        /// Uses group-based pricing override if available.
        /// </summary>
        public async Task<SubscriptionPlanDto> GetMyPlanAsync(long pharmacyId)
        {
            var profile = await _appDb.PharmacyProfiles
                .Include(p => p.PharmacyGroups)
                    .ThenInclude(pg => pg.Group)
                .Include(p => p.Subscriptions.OrderByDescending(s => s.EndDate).Take(1))
                .FirstOrDefaultAsync(p => p.Id == pharmacyId);

            if (profile == null)
            {
                throw new InvalidOperationException("Pharmacy not found");
            }

            // Calculate pricing
            var (basePrice, cargoPrice, hasCustomPrice, hasCargoService) = await CalculatePricingDetailsAsync(pharmacyId);
            var totalPrice = basePrice + cargoPrice;

            // Get current subscription
            var currentSubscription = profile.Subscriptions.FirstOrDefault();

            // Calculate days remaining
            int? daysRemaining = null;
            if (profile.SubscriptionExpireDate.HasValue && profile.SubscriptionExpireDate > DateTime.UtcNow)
            {
                daysRemaining = (int)(profile.SubscriptionExpireDate.Value - DateTime.UtcNow).TotalDays;
            }

            // Get group names
            var groupNames = profile.PharmacyGroups
                .Where(pg => pg.IsActive)
                .Select(pg => pg.Group.Name)
                .ToList();

            return new SubscriptionPlanDto
            {
                Status = profile.SubscriptionStatus.ToString(),
                PlanType = currentSubscription?.PlanType.ToString() ?? "Standard",
                PriceToPayMonthly = totalPrice,
                BasePrice = basePrice,
                CargoPrice = cargoPrice,
                HasCargoService = hasCargoService,
                HasCustomPrice = hasCustomPrice,
                ExpireDate = profile.SubscriptionExpireDate,
                DaysRemaining = daysRemaining,
                LastPaymentDate = currentSubscription?.LastPaymentDate,
                GroupNames = groupNames
            };
        }

        /// <summary>
        /// Process a subscription payment.
        /// Currently implements mock payment (Luhn validation only).
        /// TODO: Iyzico Integration
        /// </summary>
        public async Task<PaymentResultDto> ProcessPaymentAsync(
            long pharmacyId, 
            int userId,
            PaymentRequestDto request)
        {
            try
            {
                // 1. Validate card number with Luhn algorithm
                if (!ValidateLuhn(request.CardNumber))
                {
                    return new PaymentResultDto
                    {
                        Success = false,
                        Message = "Geçersiz kart numarası"
                    };
                }

                // 2. Basic validation
                if (!ValidateExpiryDate(request.ExpiryMonth, request.ExpiryYear))
                {
                    return new PaymentResultDto
                    {
                        Success = false,
                        Message = "Geçersiz son kullanma tarihi"
                    };
                }

                if (string.IsNullOrEmpty(request.Cvc) || request.Cvc.Length < 3)
                {
                    return new PaymentResultDto
                    {
                        Success = false,
                        Message = "Geçersiz CVC kodu"
                    };
                }

                // 3. Calculate amount to charge
                var amount = await CalculateSubscriptionPriceAsync(pharmacyId);

                // 4. Get pharmacy profile
                var profile = await _appDb.PharmacyProfiles.FindAsync(pharmacyId);
                if (profile == null)
                {
                    return new PaymentResultDto
                    {
                        Success = false,
                        Message = "Eczane bulunamadı"
                    };
                }

                // 5. Determine plan type based on group cargo service
                var hasCargoService = await CheckGroupCargoServiceAsync(pharmacyId);
                var planType = hasCargoService ? SubscriptionPlanType.CargoPlus : SubscriptionPlanType.Standard;

                // ═══════════════════════════════════════════════════════════════
                // TODO: Iyzico Integration
                // 
                // Replace this mock section with actual Iyzico API calls:
                // 
                // var paymentRequest = new CreatePaymentRequest
                // {
                //     Price = amount.ToString("F2"),
                //     PaidPrice = amount.ToString("F2"),
                //     Currency = Currency.TRY,
                //     PaymentCard = new PaymentCard
                //     {
                //         CardHolderName = request.CardHolderName,
                //         CardNumber = request.CardNumber,
                //         ExpireMonth = request.ExpiryMonth,
                //         ExpireYear = "20" + request.ExpiryYear,
                //         Cvc = request.Cvc
                //     }
                // };
                // 
                // var payment = Payment.Create(paymentRequest, options);
                // if (payment.Status != "success") return error;
                // ═══════════════════════════════════════════════════════════════

                // 6. Mock payment success - generate transaction ID
                var transactionId = $"MOCK_{Guid.NewGuid():N}";

                // 7. Create or update subscription
                var now = DateTime.UtcNow;
                var newEndDate = now.AddDays(SUBSCRIPTION_PERIOD_DAYS);

                var subscription = await _appDb.Subscriptions
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync(s => s.PharmacyProfileId == pharmacyId);

                if (subscription == null)
                {
                    subscription = new Subscription
                    {
                        PharmacyProfileId = pharmacyId,
                        StartDate = now,
                        EndDate = newEndDate,
                        Status = SubscriptionStatus.Active,
                        PlanType = planType,
                        PricePaid = amount,
                        LastPaymentDate = now,
                        NextPaymentDate = newEndDate,
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    _appDb.Subscriptions.Add(subscription);
                }
                else
                {
                    // Extend existing subscription
                    subscription.EndDate = subscription.EndDate > now 
                        ? subscription.EndDate.AddDays(SUBSCRIPTION_PERIOD_DAYS) 
                        : newEndDate;
                    subscription.Status = SubscriptionStatus.Active;
                    subscription.PlanType = planType;
                    subscription.PricePaid = amount;
                    subscription.LastPaymentDate = now;
                    subscription.NextPaymentDate = subscription.EndDate;
                    subscription.UpdatedAt = now;
                }

                await _appDb.SaveChangesAsync();

                // 8. Create payment history record
                var paymentHistory = new SubscriptionPaymentHistory
                {
                    SubscriptionId = subscription.Id,
                    PharmacyProfileId = pharmacyId,
                    TransactionId = transactionId,
                    Amount = amount,
                    PaymentDate = now,
                    Status = SubscriptionPaymentStatus.Completed,
                    Method = SubscriptionPaymentMethod.CreditCard,
                    CardLast4 = request.CardNumber.Length >= 4 
                        ? request.CardNumber.Substring(request.CardNumber.Length - 4) 
                        : null,
                    PeriodStart = subscription.StartDate,
                    PeriodEnd = subscription.EndDate,
                    CreatedAt = now
                };
                _appDb.SubscriptionPaymentHistories.Add(paymentHistory);

                // 9. Update pharmacy profile subscription status
                profile.SubscriptionStatus = SubscriptionStatus.Active;
                profile.SubscriptionExpireDate = subscription.EndDate;

                await _appDb.SaveChangesAsync();

                // 10. Generate new JWT token with updated subscription claims
                var user = await _identityDb.IdentityUsers.FirstOrDefaultAsync(u => u.PharmacyId == pharmacyId);
                if (user == null)
                {
                    return new PaymentResultDto
                    {
                        Success = true,
                        Message = "Ödeme başarılı, ancak token yenilenemedi",
                        TransactionId = transactionId,
                        NewExpireDate = subscription.EndDate,
                        AmountPaid = amount
                    };
                }

                var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key missing");
                var newAccessToken = JwtHelper.GenerateAccessToken(user, profile, jwtKey, ACCESS_TOKEN_EXPIRY_MINUTES);

                _logger.LogInformation(
                    "Payment processed successfully for pharmacy {PharmacyId}. Amount: {Amount}, TransactionId: {TransactionId}",
                    pharmacyId, amount, transactionId);

                return new PaymentResultDto
                {
                    Success = true,
                    Message = "Ödeme başarılı! Aboneliğiniz aktifleştirildi.",
                    TransactionId = transactionId,
                    NewExpireDate = subscription.EndDate,
                    AmountPaid = amount,
                    NewAccessToken = newAccessToken
                    // Note: Refresh token is not updated - user can use existing refresh token
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment for pharmacy {PharmacyId}", pharmacyId);
                return new PaymentResultDto
                {
                    Success = false,
                    Message = "Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin."
                };
            }
        }

        /// <summary>
        /// Check if a pharmacy has an active subscription
        /// </summary>
        public async Task<bool> IsSubscriptionActiveAsync(long pharmacyId)
        {
            var profile = await _appDb.PharmacyProfiles.FindAsync(pharmacyId);
            if (profile == null) return false;

            return profile.SubscriptionStatus == SubscriptionStatus.Active 
                   && profile.SubscriptionExpireDate.HasValue 
                   && profile.SubscriptionExpireDate > DateTime.UtcNow;
        }

        /// <summary>
        /// Calculate subscription price based on group settings.
        /// Priority:
        /// 1. Custom group price (if set)
        /// 2. Default 400 TL
        /// Plus cargo if group has cargo service enabled
        /// </summary>
        public async Task<decimal> CalculateSubscriptionPriceAsync(long pharmacyId)
        {
            var (basePrice, cargoPrice, _, _) = await CalculatePricingDetailsAsync(pharmacyId);
            return basePrice + cargoPrice;
        }

        // ═══════════════════════════════════════════════════════════════
        // Private Helper Methods
        // ═══════════════════════════════════════════════════════════════

        private async Task<(decimal basePrice, decimal cargoPrice, bool hasCustomPrice, bool hasCargoService)> 
            CalculatePricingDetailsAsync(long pharmacyId)
        {
            var groups = await _appDb.PharmacyGroups
                .Where(pg => pg.PharmacyProfileId == pharmacyId && pg.IsActive)
                .Include(pg => pg.Group)
                .Select(pg => pg.Group)
                .ToListAsync();

            // Find custom price from any group (first one found)
            var customPrice = groups
                .Where(g => g.CustomSubscriptionPrice.HasValue)
                .Select(g => g.CustomSubscriptionPrice)
                .FirstOrDefault();

            // Check if any group has cargo service
            var hasCargoService = groups.Any(g => g.HasCargoService);

            var basePrice = customPrice ?? DEFAULT_SUBSCRIPTION_PRICE;
            var cargoPrice = hasCargoService ? CARGO_SERVICE_PRICE : 0m;

            return (basePrice, cargoPrice, customPrice.HasValue, hasCargoService);
        }

        private async Task<bool> CheckGroupCargoServiceAsync(long pharmacyId)
        {
            return await _appDb.PharmacyGroups
                .Where(pg => pg.PharmacyProfileId == pharmacyId && pg.IsActive)
                .Include(pg => pg.Group)
                .AnyAsync(pg => pg.Group.HasCargoService);
        }

        /// <summary>
        /// Luhn algorithm for credit card validation
        /// </summary>
        private static bool ValidateLuhn(string cardNumber)
        {
            if (string.IsNullOrWhiteSpace(cardNumber))
                return false;

            // Remove spaces and dashes
            cardNumber = cardNumber.Replace(" ", "").Replace("-", "");

            if (cardNumber.Length < 13 || cardNumber.Length > 19)
                return false;

            if (!cardNumber.All(char.IsDigit))
                return false;

            int sum = 0;
            bool alternate = false;

            for (int i = cardNumber.Length - 1; i >= 0; i--)
            {
                int digit = cardNumber[i] - '0';

                if (alternate)
                {
                    digit *= 2;
                    if (digit > 9)
                        digit -= 9;
                }

                sum += digit;
                alternate = !alternate;
            }

            return sum % 10 == 0;
        }

        private static bool ValidateExpiryDate(string month, string year)
        {
            if (!int.TryParse(month, out int m) || !int.TryParse(year, out int y))
                return false;

            if (m < 1 || m > 12)
                return false;

            // Convert 2-digit year to 4-digit
            if (y < 100)
                y += 2000;

            var expiry = new DateTime(y, m, 1).AddMonths(1).AddDays(-1); // Last day of month
            return expiry >= DateTime.UtcNow.Date;
        }
    }
}
