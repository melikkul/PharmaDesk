using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/reports - List saved reports
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Report>>> GetReports()
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var reports = await _context.Reports
                .Where(r => r.PharmacyProfileId == pharmacyId.Value)
                .OrderByDescending(r => r.GeneratedDate)
                .ToListAsync();

            return Ok(reports);
        }

        // GET /api/reports/{id} - Get report details
        [HttpGet("{id}")]
        public async Task<ActionResult<Report>> GetReport(int id)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            var report = await _context.Reports
                .FirstOrDefaultAsync(r => r.Id == id && r.PharmacyProfileId == pharmacyId.Value);

            if (report == null)
                return NotFound(new { message = "Report not found" });

            return Ok(report);
        }

        // POST /api/reports - Generate and save report
        [HttpPost]
        public async Task<ActionResult<Report>> GenerateReport([FromBody] GenerateReportRequest request)
        {
            var pharmacyId = GetPharmacyIdFromToken();
            if (pharmacyId == null)
                return Unauthorized(new { message = "Pharmacy not found" });

            object? reportData = null;

            // Generate report based on type
            switch (request.ReportType)
            {
                case ReportType.Inventory:
                    reportData = await GenerateInventoryReport(pharmacyId.Value);
                    break;
                case ReportType.Expiration:
                    reportData = await GenerateExpirationReport(pharmacyId.Value);
                    break;
                case ReportType.Sales:
                    reportData = await GenerateSalesReport(pharmacyId.Value);
                    break;
                case ReportType.Demand:
                    reportData = await GenerateDemandReport();
                    break;
                default:
                    return BadRequest(new { message = "Invalid report type" });
            }

            var report = new Report
            {
                PharmacyProfileId = pharmacyId.Value,
                ReportType = request.ReportType,
                GeneratedDate = DateTime.UtcNow,
                DataJson = JsonSerializer.Serialize(reportData)
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            return Ok(report);
        }

        private async Task<object> GenerateInventoryReport(int pharmacyId)
        {
            var inventory = await _context.InventoryItems
                .Include(i => i.Medication)
                .Where(i => i.PharmacyProfileId == pharmacyId)
                .Select(i => new
                {
                    i.Id,
                    MedicationName = i.Medication.Name,
                    i.Quantity,
                    i.BonusQuantity,
                    i.CostPrice,
                    i.SalePrice,
                    i.ExpiryDate,
                    i.BatchNumber,
                    i.ShelfLocation,
                    TotalCostValue = i.Quantity * i.CostPrice,
                    TotalSalesValue = i.Quantity * (i.SalePrice ?? 0)
                })
                .ToListAsync();

            return new { items = inventory, generatedAt = DateTime.UtcNow };
        }

        private async Task<object> GenerateExpirationReport(int pharmacyId)
        {
            var expiringItems = await _context.InventoryItems
                .Include(i => i.Medication)
                .Where(i => i.PharmacyProfileId == pharmacyId && i.ExpiryDate <= DateTime.UtcNow.AddMonths(6))
                .OrderBy(i => i.ExpiryDate)
                .Select(i => new
                {
                    i.Id,
                    MedicationName = i.Medication.Name,
                    i.Quantity,
                    i.ExpiryDate,
                    DaysRemaining = (i.ExpiryDate - DateTime.UtcNow).Days,
                    TotalValue = i.Quantity * (i.SalePrice ?? i.CostPrice)
                })
                .ToListAsync();

            return new { items = expiringItems, generatedAt = DateTime.UtcNow };
        }

        private async Task<object> GenerateSalesReport(int pharmacyId)
        {
            var sales = await _context.OrderItems
                .Include(oi => oi.Order)
                .Include(oi => oi.Medication)
                .Where(oi => oi.Order.SellerPharmacyId == pharmacyId && oi.Order.Status == OrderStatus.Completed)
                .GroupBy(oi => new { oi.MedicationId, MedicationName = oi.Medication.Name })
                .Select(g => new
                {
                    g.Key.MedicationId,
                    g.Key.MedicationName,
                    TotalQuantitySold = g.Sum(oi => oi.Quantity),
                    TotalRevenue = g.Sum(oi => oi.Quantity * oi.UnitPrice)
                })
                .OrderByDescending(s => s.TotalRevenue)
                .ToListAsync();

            return new { items = sales, generatedAt = DateTime.UtcNow };
        }

        private async Task<object> GenerateDemandReport()
        {
            var demands = await _context.MarketDemands
                .Include(md => md.Medication)
                .OrderByDescending(md => md.SearchCount)
                .Take(50)
                .Select(md => new
                {
                    md.Id,
                    MedicationName = md.Medication.Name,
                    md.SearchCount,
                    md.LastSearchedDate,
                    md.City
                })
                .ToListAsync();

            return new { items = demands, generatedAt = DateTime.UtcNow };
        }

        private int? GetPharmacyIdFromToken()
        {
            var pharmacyIdClaim = User.FindFirst("PharmacyId")?.Value;
            if (int.TryParse(pharmacyIdClaim, out var pharmacyId))
                return pharmacyId;
            return null;
        }
    }

    public class GenerateReportRequest
    {
        public ReportType ReportType { get; set; }
    }
}
