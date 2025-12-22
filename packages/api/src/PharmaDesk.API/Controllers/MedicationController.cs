using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Dtos;
using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous] // ilac listesini herkese acik yaptim?
    public class MedicationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IExternalDrugService? _externalDrugService;
        private readonly IMemoryCache _cache;

        private const string MedicationsCacheKey = "medications_list";
        private static readonly TimeSpan MedicationsCacheDuration = TimeSpan.FromHours(1);

        public MedicationsController(
            AppDbContext db,
            IMemoryCache cache,
            IExternalDrugService? externalDrugService = null)
        {
            _db = db;
            _cache = cache;
            _externalDrugService = externalDrugService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MedicationResponse>>> GetMedications()
        {
            // Try to get from cache first
            if (_cache.TryGetValue(MedicationsCacheKey, out List<MedicationResponse>? cachedMedications) 
                && cachedMedications != null)
            {
                return Ok(cachedMedications);
            }

            // Cache miss - fetch from database
            var medications = await _db.Medications
                .AsNoTracking()
                .Select(m => new MedicationResponse
                {
                    Id = m.Id,
                    ATC = m.ATC,
                    Name = m.Name,
                    Manufacturer = m.Manufacturer,
                    Price = m.BasePrice,
                    Alternatives = m.Alternatives ?? new List<string>()
                })
                .ToListAsync();

            // Store in cache for 1 hour
            _cache.Set(MedicationsCacheKey, medications, MedicationsCacheDuration);

            return Ok(medications);
        }

        /// <summary>
        /// Get paginated medications list for Admin panel
        /// </summary>
        [HttpGet("paged")]
        public async Task<IActionResult> GetMedicationsPaged(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? search = null)
        {
            var query = _db.Medications.AsNoTracking();

            // Apply search filter
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLowerInvariant();
                query = query.Where(m => 
                    m.Name.ToLower().Contains(searchLower) || 
                    (m.Barcode != null && m.Barcode.Contains(search)) ||
                    (m.Manufacturer != null && m.Manufacturer.ToLower().Contains(searchLower)));
            }

            var totalCount = await query.CountAsync();

            var medications = await query
                .OrderBy(m => m.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new
                {
                    id = m.Id,
                    name = m.Name,
                    barcode = m.Barcode,
                    manufacturer = m.Manufacturer,
                    basePrice = m.BasePrice,
                    packageType = m.PackageType,
                    atc = m.ATC
                })
                .ToListAsync();

            return Ok(new
            {
                data = medications,
                totalCount = totalCount,
                page = page,
                pageSize = pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
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
                    Price = m.BasePrice,
                    Alternatives = m.Alternatives ?? new List<string>()
                })
                .SingleOrDefaultAsync();

            if (medication == null) return NotFound();

            return Ok(medication);
        }

        /// <summary>
        /// Get medication with real-time barem information from Alliance Healthcare
        /// Barem data is NOT stored in database (transient data)
        /// </summary>
        [HttpGet("{id}/barem")]
        public async Task<ActionResult<DrugDetailWithBaremDto>> GetMedicationWithBarem(int id)
        {
            // 1. Get medication from database
            var medication = await _db.Medications
                .AsNoTracking()
                .Where(m => m.Id == id)
                .FirstOrDefaultAsync();

            if (medication == null) 
                return NotFound(new { message = "İlaç bulunamadı" });

            // 2. Build base response from DB
            var response = new DrugDetailWithBaremDto
            {
                Id = medication.Id,
                ExternalApiId = medication.ExternalApiId,
                Name = medication.Name,
                Barcode = medication.Barcode,
                Manufacturer = medication.Manufacturer,
                BasePrice = medication.BasePrice,
                PackageType = medication.PackageType,
                Alternatives = medication.Alternatives // 🆕 Already List<string> from JSONB
            };

            // 3. If ExternalApiId exists and service is available, fetch real-time barem
            if (medication.ExternalApiId.HasValue && _externalDrugService != null)
            {
                try
                {
                    var externalData = await _externalDrugService.GetDrugDetailWithBaremAsync(
                        medication.ExternalApiId.Value);
                    
                    if (externalData != null)
                    {
                        response.Barems = externalData.Barems;
                        response.BaremFetchedAt = externalData.BaremFetchedAt;
                        response.BaremError = externalData.BaremError;
                    }
                }
                catch (Exception ex)
                {
                    response.BaremError = $"Barem bilgisi alınamadı: {ex.Message}";
                    response.BaremFetchedAt = DateTime.UtcNow;
                }
            }
            else if (!medication.ExternalApiId.HasValue)
            {
                response.BaremError = "Bu ilaç için ExternalApiId tanımlı değil";
            }
            else
            {
                response.BaremError = "Dış servis bağlantısı yapılandırılmamış";
            }

            return Ok(response);
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
                    packageType = m.PackageType,
                    externalApiId = m.ExternalApiId
                })
                .ToListAsync();

            return Ok(results);
        }

        // ParseAlternatives method removed - Alternatives is now List<string> directly from JSONB column
    }
}