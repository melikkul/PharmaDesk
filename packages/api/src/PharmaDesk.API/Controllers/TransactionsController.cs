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
    public class TransactionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TransactionsController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/transactions?groupId=123 - İşlem geçmişini getir
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TransactionDto>>> GetTransactions(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? type = null,
            [FromQuery] int? groupId = null)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var query = _context.Transactions
                .Include(t => t.CounterpartyPharmacy)
                .Where(t => t.PharmacyProfileId == pharmacyId.Value)
                .AsQueryable();

            // Filter by type if provided
            if (!string.IsNullOrEmpty(type) && Enum.TryParse<TransactionType>(type, true, out var transactionType))
            {
                query = query.Where(t => t.Type == transactionType);
            }

            // Filter by group if groupId is provided
            if (groupId.HasValue)
            {
                query = query.Where(t =>
                    t.CounterpartyPharmacyId == null || // Include non-pharmacy transactions (deposits, etc.)
                    _context.PharmacyGroups.Any(pg =>
                        pg.GroupId == groupId.Value &&
                        pg.IsActive &&
                        pg.PharmacyProfileId == t.CounterpartyPharmacyId));
            }

            var transactions = await query
                .OrderByDescending(t => t.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var response = transactions.Select(t => new TransactionDto
            {
                Id = FormatTransactionId(t),
                Date = t.Date.ToString("yyyy-MM-dd"),
                Type = TranslateTransactionType(t.Type),
                ProductName = t.Description.Contains("Bakiye") ? null : ExtractProductName(t.Description),
                Counterparty = FormatCounterparty(t),
                Amount = t.Amount,
                Status = TranslateTransactionStatus(t.Status)
            });

            return Ok(response);
        }

        // GET /api/transactions/balance - Bakiye ve son işlemler
        [HttpGet("balance")]
        public async Task<ActionResult> GetBalance()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var pharmacy = await _context.PharmacyProfiles.FindAsync(pharmacyId.Value);
            if (pharmacy == null)
                return NotFound(new { message = "Pharmacy not found" });

            var recentTransactions = await _context.Transactions
                .Where(t => t.PharmacyProfileId == pharmacyId.Value)
                .OrderByDescending(t => t.Date)
                .Take(10)
                .Select(t => new
                {
                    id = t.Id,
                    date = t.Date.ToString("dd/MM/yyyy"),
                    description = t.Description,
                    amount = t.Amount,
                    type = t.Amount >= 0 ? "positive" : "negative"
                })
                .ToListAsync();

            return Ok(new
            {
                balance = pharmacy.Balance,
                recentTransactions
            });
        }

        // POST /api/transactions - Yeni işlem oluştur (Manuel bakiye yükleme vb.)
        [HttpPost]
        public async Task<ActionResult<TransactionDto>> CreateTransaction([FromBody] CreateTransactionRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            if (!Enum.TryParse<TransactionType>(request.Type, true, out var transactionType))
                return BadRequest(new { message = "Invalid transaction type" });

            var transaction = new Transaction
            {
                PharmacyProfileId = pharmacyId.Value,
                Amount = request.Amount,
                Type = transactionType,
                Description = request.Description,
                Date = DateTime.UtcNow,
                RelatedReferenceId = request.RelatedReferenceId,
                Status = TransactionStatus.Completed,
                CounterpartyPharmacyId = request.CounterpartyPharmacyId
            };

            _context.Transactions.Add(transaction);

            // Update pharmacy balance
            var pharmacy = await _context.PharmacyProfiles.FindAsync(pharmacyId.Value);
            if (pharmacy != null)
            {
                pharmacy.Balance += request.Amount;
            }

            await _context.SaveChangesAsync();

            var response = new TransactionDto
            {
                Id = FormatTransactionId(transaction),
                Date = transaction.Date.ToString("yyyy-MM-dd"),
                Type = TranslateTransactionType(transaction.Type),
                ProductName = null,
                Counterparty = transaction.Description,
                Amount = transaction.Amount,
                Status = TranslateTransactionStatus(transaction.Status)
            };

            return CreatedAtAction(nameof(GetTransactions), new { id = transaction.Id }, response);
        }

        // Helper methods
        private string FormatTransactionId(Transaction t)
        {
            var prefix = t.Type switch
            {
                TransactionType.Sale => "S",
                TransactionType.Purchase => "A",
                TransactionType.Deposit => "BKY",
                TransactionType.Refund => "IADE",
                _ => "T"
            };
            return $"{prefix}-{t.Id:D5}";
        }

        private string TranslateTransactionType(TransactionType type)
        {
            return type switch
            {
                TransactionType.Sale => "Satış",
                TransactionType.Purchase => "Alış",
                TransactionType.Deposit => "Bakiye Yükleme",
                TransactionType.Withdraw => "Para Çekme",
                TransactionType.Refund => "İade",
                _ => type.ToString()
            };
        }

        private string TranslateTransactionStatus(TransactionStatus status)
        {
            return status switch
            {
                TransactionStatus.Completed => "Tamamlandı",
                TransactionStatus.Processing => "İşlemde",
                TransactionStatus.Cancelled => "İptal Edildi",
                _ => status.ToString()
            };
        }

        private string? ExtractProductName(string description)
        {
            // Simple extraction - can be improved
            if (description.Contains(":"))
            {
                var parts = description.Split(':');
                if (parts.Length > 1)
                    return parts[1].Trim();
            }
            return null;
        }

        private string? FormatCounterparty(Transaction t)
        {
            if (t.CounterpartyPharmacy != null)
            {
                var prefix = t.Type == TransactionType.Sale ? "Alıcı" : "Satıcı";
                return $"{prefix}: {t.CounterpartyPharmacy.PharmacyName}";
            }
            return t.Type == TransactionType.Deposit ? "Banka Transferi" : null;
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
