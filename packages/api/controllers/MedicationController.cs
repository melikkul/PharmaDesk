using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Dtos;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous] // ilac listesini herkese acik yaptim?
    public class MedicationsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public MedicationsController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MedicationResponse>>> GetMedications()
        {
            var medications = await _db.Medications
                .AsNoTracking()
                .Select(m => new MedicationResponse
                {
                    Id = m.Id,
                    ATC = m.ATC,
                    Name = m.Name,
                    Manufacturer = m.Manufacturer,
                    Price = m.BasePrice
                })
                .ToListAsync();

            return Ok(medications);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MedicationResponse>> GetMedication(int id)
        {
            var medication = await _db.Medications
                .AsNoTracking()
                .Where(m => m.Id == id)
                .Select(m => new MedicationResponse
                {
                    Id = m.Id,
                    ATC = m.ATC,
                    Name = m.Name,
                    Manufacturer = m.Manufacturer,
                    Price = m.BasePrice
                })
                .SingleOrDefaultAsync();

            if (medication == null) return NotFound();

            return Ok(medication);
        }

        /// <summary>
        /// Search medications by name or barcode (fuzzy search)
        /// </summary>
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<object>>> SearchMedications(
            [FromQuery] string? q,
            [FromQuery] int limit = 10)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return Ok(new List<object>());
            }

            var searchTerm = q.ToLower().Trim();

            var results = await _db.Medications
                .AsNoTracking()
                .Where(m => 
                    m.Name.ToLower().Contains(searchTerm) || 
                    (m.Barcode != null && m.Barcode.Contains(searchTerm)))
                .OrderBy(m => m.Name)
                .Take(limit)
                .Select(m => new
                {
                    id = m.Id,
                    name = m.Name,
                    barcode = m.Barcode,
                    manufacturer = m.Manufacturer,
                    packageType = m.PackageType
                })
                .ToListAsync();

            return Ok(results);
        }
    }
}