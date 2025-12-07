using Backend.DTOs;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Backend.Services;

/// <summary>
/// Interface for external drug data service.
/// </summary>
public interface IExternalDrugService
{
    Task<DrugDetailWithBaremDto> GetDrugDetailWithBaremAsync(int externalApiId);
}

/// <summary>
/// Service for fetching external drug data from Alliance Healthcare.
/// Uses caching to reduce load on external service.
/// </summary>
public class ExternalDrugService : IExternalDrugService
{
    private readonly AllianceHealthcareClient _allianceClient;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ExternalDrugService> _logger;
    
    // Cache settings
    private const int CACHE_DURATION_MINUTES = 15;
    private const string CACHE_KEY_PREFIX = "barem_";

    public ExternalDrugService(
        AllianceHealthcareClient allianceClient,
        IMemoryCache cache,
        ILogger<ExternalDrugService> logger)
    {
        _allianceClient = allianceClient;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Get drug details with barem/discount information.
    /// Uses cache to avoid repeated calls to external service.
    /// </summary>
    public async Task<DrugDetailWithBaremDto> GetDrugDetailWithBaremAsync(int externalApiId)
    {
        var cacheKey = $"{CACHE_KEY_PREFIX}{externalApiId}";
        
        // Try to get from cache first
        if (_cache.TryGetValue(cacheKey, out DrugDetailWithBaremDto? cachedResult) && cachedResult != null)
        {
            _logger.LogInformation("📦 Cache HIT for item ID: {Id}", externalApiId);
            return cachedResult;
        }
        
        _logger.LogInformation("🔍 Cache MISS - Fetching drug detail for ExternalApiId: {Id}", externalApiId);
        
        try
        {
            // Fetch from scrapper service
            var pythonResult = await _allianceClient.FetchItemDetailAsync(externalApiId);

            // Convert to DTO
            var result = new DrugDetailWithBaremDto
            {
                ExternalApiId = externalApiId,
                Name = pythonResult.Name,
                Barcode = pythonResult.Barcode,
                BaremFetchedAt = DateTime.UtcNow,
                BaremError = pythonResult.Error
            };

            // Map barems from result
            if (pythonResult.Barems != null && pythonResult.Barems.Any())
            {
                foreach (var barem in pythonResult.Barems)
                {
                    var baremDto = new BaremInfoDto
                    {
                        WarehouseName = barem.Warehouse,
                        Vade = barem.Vade,
                        MinimumAdet = barem.MinimumAdet,
                        MalFazlasi = barem.MalFazlasi,
                        IskontoKurum = (decimal)barem.IskontoKurum,
                        IskontoTicari = (decimal)barem.IskontoTicari,
                        BirimFiyat = (decimal)barem.BirimFiyat,
                        DiscountPercentage = (decimal)barem.Discount,
                        MinQuantity = barem.MinimumAdet
                    };
                    
                    // Parse MalFazlasi to get bonus quantity if in "10+1" format
                    ParseMalFazlasi(baremDto);
                    
                    result.Barems.Add(baremDto);
                }
                
                _logger.LogInformation("✅ Found {Count} barems for ExternalApiId: {Id}", 
                    result.Barems.Count, externalApiId);
                
                // Cache successful results
                if (pythonResult.Success)
                {
                    var cacheOptions = new MemoryCacheEntryOptions()
                        .SetAbsoluteExpiration(TimeSpan.FromMinutes(CACHE_DURATION_MINUTES))
                        .SetSlidingExpiration(TimeSpan.FromMinutes(5));
                    
                    _cache.Set(cacheKey, result, cacheOptions);
                    _logger.LogInformation("💾 Cached barem data for {Minutes} minutes", CACHE_DURATION_MINUTES);
                }
            }
            else if (!pythonResult.Success && string.IsNullOrEmpty(pythonResult.Error))
            {
                result.BaremError = "Barem bilgisi bulunamadı";
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error fetching drug detail for ExternalApiId: {Id}", externalApiId);
            return new DrugDetailWithBaremDto
            {
                ExternalApiId = externalApiId,
                BaremFetchedAt = DateTime.UtcNow,
                BaremError = $"Error fetching barem data: {ex.Message}"
            };
        }
    }

    /// <summary>
    /// Parse MalFazlasi format like "10+1" to extract min and bonus quantities.
    /// </summary>
    private void ParseMalFazlasi(BaremInfoDto barem)
    {
        if (string.IsNullOrWhiteSpace(barem.MalFazlasi))
            return;

        // Try to parse "10+1" format
        var parts = barem.MalFazlasi.Split('+');
        if (parts.Length == 2)
        {
            if (int.TryParse(parts[0].Trim(), out int minQty))
            {
                barem.MinQuantity = minQty;
            }
            if (int.TryParse(parts[1].Trim(), out int bonusQty))
            {
                barem.BonusQuantity = bonusQty;
            }
        }
        else if (int.TryParse(barem.MalFazlasi.Trim(), out int mf))
        {
            // Just a number - bonus quantity
            barem.BonusQuantity = mf;
        }
    }
}
