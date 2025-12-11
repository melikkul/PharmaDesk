using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TransactionsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IdentityDbContext _identityContext;
        private readonly ILogger<TransactionsController> _logger;

        public TransactionsController(AppDbContext context, IdentityDbContext identityContext, ILogger<TransactionsController> logger)
        {
            _context = context;
            _identityContext = identityContext;
            _logger = logger;
        }

        /// <summary>
        /// Kullanıcının işlem geçmişini getirir
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetTransactions()
        {
            var pharmacyId = await GetPharmacyIdFromToken();
            if (pharmacyId == null)
            {
                return Unauthorized(new { message = "Eczane profili bulunamadı" });
            }

            var transactions = await _context.Transactions
                .Include(t => t.CounterpartyPharmacy)
                .Where(t => t.PharmacyProfileId == pharmacyId)
                .OrderByDescending(t => t.Date)
                .Select(t => new TransactionDto
                {
                    Id = t.Id,
                    Date = t.Date.ToString("dd.MM.yyyy HH:mm"),
                    Type = MapTransactionType(t.Type),
                    ProductName = t.Description,
                    Counterparty = t.CounterpartyPharmacy != null ? t.CounterpartyPharmacy.PharmacyName : null,
                    Amount = t.Amount,
                    Status = MapTransactionStatus(t.Status)
                })
                .ToListAsync();

            return Ok(transactions);
        }

        /// <summary>
        /// Kullanıcının bakiyesini getirir
        /// </summary>
        [HttpGet("balance")]
        public async Task<IActionResult> GetBalance()
        {
            var pharmacyId = await GetPharmacyIdFromToken();
            if (pharmacyId == null)
            {
                return Unauthorized(new { message = "Eczane profili bulunamadı" });
            }

            var pharmacy = await _context.PharmacyProfiles
                .Where(p => p.Id == pharmacyId)
                .Select(p => new { p.Balance })
                .FirstOrDefaultAsync();

            if (pharmacy == null)
            {
                return NotFound(new { message = "Eczane bulunamadı" });
            }

            return Ok(new { balance = pharmacy.Balance });
        }

        private async Task<long?> GetPharmacyIdFromToken()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return null;

            var pharmacyId = await _identityContext.IdentityUsers
                .Where(u => u.Id == userId)
                .Select(u => u.PharmacyId)
                .FirstOrDefaultAsync();

            return pharmacyId;
        }

        private static string MapTransactionType(TransactionType type)
        {
            return type switch
            {
                TransactionType.Sale => "Satış",
                TransactionType.Purchase => "Alış",
                TransactionType.Deposit => "Bakiye Yükleme",
                TransactionType.Withdraw => "Para Çekme",
                TransactionType.Refund => "İade",
                TransactionType.OfferCreated => "Teklif Oluşturuldu",
                TransactionType.OfferUpdated => "Teklif Güncellendi",
                TransactionType.OfferDeleted => "Teklif Silindi",
                _ => "Diğer"
            };
        }

        private static string MapTransactionStatus(TransactionStatus status)
        {
            return status switch
            {
                TransactionStatus.Completed => "Tamamlandı",
                TransactionStatus.Processing => "İşlemde",
                TransactionStatus.Cancelled => "İptal",
                _ => "Bilinmiyor"
            };
        }
    }

    public class TransactionDto
    {
        public int Id { get; set; }
        public string Date { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? ProductName { get; set; }
        public string? Counterparty { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
