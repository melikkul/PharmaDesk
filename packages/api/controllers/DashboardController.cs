using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            // Real data from Inventory
            var totalInventory = await _context.InventoryItems.CountAsync();
            var totalMedications = await _context.Medications.CountAsync();

            // Placeholder lists for UI Cards (Tables do not exist yet)
            // In a real scenario, we would fetch: await _context.Offers.OrderByDescending(o => o.Date).Take(5).ToListAsync();
            var recentOffers = new List<object>(); 
            var balanceHistory = new List<object>();
            var transfers = new List<object>();
            var shipments = new List<object>();

            return Ok(new
            {
                Stats = new 
                {
                    TotalInventory = totalInventory,
                    TotalMedications = totalMedications,
                    ActiveOrders = 0,
                    ActiveOffers = 0,
                    TotalSales = 0
                },
                RecentOffers = recentOffers,
                BalanceHistory = balanceHistory,
                Transfers = transfers,
                Shipments = shipments
            });
        }
    }
}
