using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Backend.Services;

/// <summary>
/// HTTP Client for communicating with the Python scrapper microservice.
/// Uses HttpClient instead of subprocess for better performance.
/// </summary>
public class AllianceHealthcareClient : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AllianceHealthcareClient> _logger;
    private readonly string _baseUrl;

    public AllianceHealthcareClient(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<AllianceHealthcareClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        
        // Get scrapper service URL from environment or config
        _baseUrl = Environment.GetEnvironmentVariable("SCRAPPER_SERVICE_URL") 
            ?? configuration.GetValue<string>("ScrapperService:BaseUrl")
            ?? "http://scrapper-service:8000";
        
        _httpClient.BaseAddress = new Uri(_baseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(60);
        
        _logger.LogInformation("🔗 AllianceHealthcareClient initialized with URL: {Url}", _baseUrl);
    }

    /// <summary>
    /// Fetch barem/discount data for an item from the scrapper service.
    /// </summary>
    public async Task<BaremFetchResult> FetchItemDetailAsync(int externalApiId)
    {
        var result = new BaremFetchResult
        {
            ItemId = externalApiId,
            Barems = new List<BaremInfo>()
        };

        try
        {
            _logger.LogInformation("📡 Calling scrapper service for item ID: {Id}", externalApiId);
            
            var response = await _httpClient.GetAsync($"/get-barem/{externalApiId}");
            
            if (response.IsSuccessStatusCode)
            {
                // Read raw JSON for debugging
                var rawJson = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("📥 Raw scrapper response: {Json}", rawJson.Substring(0, Math.Min(500, rawJson.Length)));
                
                var baremResponse = JsonSerializer.Deserialize<ScrapperBaremResponse>(
                    rawJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );
                
                if (baremResponse != null)
                {
                    result.Success = baremResponse.Success;
                    result.Name = baremResponse.Name;
                    result.Barcode = baremResponse.Barcode;
                    result.Error = baremResponse.Error;
                    
                    _logger.LogInformation("📦 Parsed response: Success={Success}, Barems count={Count}", 
                        baremResponse.Success, baremResponse.Barems?.Count ?? 0);
                    
                    if (baremResponse.Barems != null && baremResponse.Barems.Count > 0)
                    {
                        result.Barems = baremResponse.Barems.Select(b => new BaremInfo
                        {
                            Warehouse = b.Warehouse ?? "Alliance",
                            Vade = b.Vade,
                            MinimumAdet = b.MinimumAdet,
                            MalFazlasi = b.MalFazlasi ?? "",
                            IskontoKurum = b.IskontoKurum,
                            IskontoTicari = b.IskontoTicari,
                            BirimFiyat = b.BirimFiyat,
                            Discount = b.Discount
                        }).ToList();
                        
                        _logger.LogInformation("✅ Mapped {Count} barems. First barem: Vade={Vade}, Price={Price}", 
                            result.Barems.Count, 
                            result.Barems.FirstOrDefault()?.Vade, 
                            result.Barems.FirstOrDefault()?.BirimFiyat);
                    }
                    
                    _logger.LogInformation("✅ Scrapper returned: Success={Success}, Barems={Count}", 
                        result.Success, result.Barems?.Count ?? 0);
                }
            }
            else if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
            {
                result.Error = "Scrapper service not ready (browser not initialized)";
                _logger.LogWarning("⚠️ Scrapper service not ready");
            }
            else
            {
                result.Error = $"Scrapper service error: {response.StatusCode}";
                _logger.LogError("❌ Scrapper service returned: {Status}", response.StatusCode);
            }
        }
        catch (HttpRequestException ex)
        {
            result.Error = $"Cannot connect to scrapper service: {ex.Message}";
            _logger.LogError(ex, "❌ Cannot connect to scrapper service at {Url}", _baseUrl);
        }
        catch (TaskCanceledException)
        {
            result.Error = "Scrapper service request timed out";
            _logger.LogWarning("⚠️ Scrapper service request timed out");
        }
        catch (Exception ex)
        {
            result.Error = $"Unexpected error: {ex.Message}";
            _logger.LogError(ex, "❌ Unexpected error calling scrapper service");
        }

        return result;
    }

    /// <summary>
    /// Check if scrapper service is healthy.
    /// </summary>
    public async Task<bool> IsHealthyAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync("/health");
            if (response.IsSuccessStatusCode)
            {
                var health = await response.Content.ReadFromJsonAsync<ScrapperHealthResponse>();
                return health?.BrowserReady == true;
            }
        }
        catch
        {
            // Service unreachable
        }
        return false;
    }

    public void Dispose()
    {
        // HttpClient is managed by DI, don't dispose
    }
}

/// <summary>
/// Result from scrapper service barem fetch.
/// </summary>
public class BaremFetchResult
{
    public bool Success { get; set; }
    public int ItemId { get; set; }
    public string? Name { get; set; }
    public string? Barcode { get; set; }
    public List<BaremInfo>? Barems { get; set; } = new();
    public string? Error { get; set; }
}

public class BaremInfo
{
    public string Warehouse { get; set; } = "";
    public int Vade { get; set; }
    public int MinimumAdet { get; set; } = 1;
    public string MalFazlasi { get; set; } = "";
    public double IskontoKurum { get; set; }
    public double IskontoTicari { get; set; }
    public double BirimFiyat { get; set; }
    public double Discount { get; set; }
}

// Response models for scrapper service API
internal class ScrapperBaremResponse
{
    public bool Success { get; set; }
    public int ItemId { get; set; }
    public string? Name { get; set; }
    public string? Barcode { get; set; }
    public List<ScrapperBaremInfo>? Barems { get; set; }
    public string? Error { get; set; }
    public string? FetchedAt { get; set; }
}

internal class ScrapperBaremInfo
{
    public int Vade { get; set; }
    public int MinimumAdet { get; set; }
    public string? MalFazlasi { get; set; }
    public double IskontoKurum { get; set; }
    public double IskontoTicari { get; set; }
    public double BirimFiyat { get; set; }
    public string? Warehouse { get; set; }
    public double Discount { get; set; }
}

internal class ScrapperHealthResponse
{
    public string? Status { get; set; }
    public bool BrowserReady { get; set; }
    public bool LoggedIn { get; set; }
    public string? LastLoginAt { get; set; }
}
