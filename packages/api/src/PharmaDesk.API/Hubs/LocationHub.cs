using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Security.Claims;

namespace PharmaDesk.API.Hubs;

/// <summary>
/// SignalR Hub for real-time carrier location updates
/// Admins can subscribe to see all carrier locations
/// </summary>
[Authorize]
public class LocationHub : Hub
{
    private readonly ILogger<LocationHub> _logger;
    
    // Track connected admins
    private static readonly ConcurrentDictionary<string, string> _connectedAdmins = new();
    
    // Track carrier locations: carrierId -> LocationInfo
    private static readonly ConcurrentDictionary<int, CarrierLocationInfo> _carrierLocations = new();

    public LocationHub(ILogger<LocationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value
                ?? Context.User?.FindFirst("role")?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            // If admin/user, add to admin group to receive all location updates
            if (role == "Admin" || role == "User")
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
                _connectedAdmins[userId] = Context.ConnectionId;
                _logger.LogInformation("Admin {UserId} connected to LocationHub", userId);
                
                // Send current carrier locations to newly connected admin
                await Clients.Caller.SendAsync("ReceiveAllLocations", _carrierLocations.Values.ToList());
            }
            // If carrier, add to carriers group
            else if (role == "Carrier")
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "Carriers");
                _logger.LogInformation("Carrier {UserId} connected to LocationHub", userId);
            }
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value
                ?? Context.User?.FindFirst("role")?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            if (role == "Admin" || role == "User")
            {
                _connectedAdmins.TryRemove(userId, out _);
                _logger.LogInformation("Admin {UserId} disconnected from LocationHub", userId);
            }
            else if (role == "Carrier" && int.TryParse(userId, out var carrierId))
            {
                // Mark carrier as offline
                if (_carrierLocations.TryGetValue(carrierId, out var location))
                {
                    location.IsOnline = false;
                    location.LastUpdate = DateTime.UtcNow;
                    
                    // Notify admins
                    await Clients.Group("Admins").SendAsync("ReceiveLocationUpdate", location);
                }
                _logger.LogInformation("Carrier {UserId} disconnected from LocationHub", userId);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Called by carriers to update their location
    /// </summary>
    public async Task UpdateLocation(double latitude, double longitude)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? Context.User?.FindFirst("id")?.Value;
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value
                ?? Context.User?.FindFirst("role")?.Value;

        if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var carrierId))
        {
            _logger.LogWarning("Invalid carrier ID in UpdateLocation");
            return;
        }

        // Get or create carrier location info
        var locationInfo = _carrierLocations.GetOrAdd(carrierId, id => new CarrierLocationInfo
        {
            CarrierId = id,
            CarrierName = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? $"Carrier {id}"
        });

        locationInfo.Latitude = latitude;
        locationInfo.Longitude = longitude;
        locationInfo.LastUpdate = DateTime.UtcNow;
        locationInfo.IsOnline = true;

        // Broadcast to all admins
        await Clients.Group("Admins").SendAsync("ReceiveLocationUpdate", locationInfo);
        
        _logger.LogDebug("Carrier {CarrierId} location updated: {Lat}, {Lng}", carrierId, latitude, longitude);
    }

    /// <summary>
    /// Called by carriers when they start a shift
    /// </summary>
    public async Task StartShift(string carrierName)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? Context.User?.FindFirst("id")?.Value;

        if (!int.TryParse(userId, out var carrierId)) return;

        var locationInfo = _carrierLocations.GetOrAdd(carrierId, id => new CarrierLocationInfo
        {
            CarrierId = id,
            CarrierName = carrierName
        });

        locationInfo.IsOnShift = true;
        locationInfo.IsOnline = true;
        locationInfo.ShiftStartTime = DateTime.UtcNow;
        locationInfo.CarrierName = carrierName;

        // Broadcast to all admins
        await Clients.Group("Admins").SendAsync("ReceiveLocationUpdate", locationInfo);
        
        _logger.LogInformation("Carrier {CarrierId} ({Name}) started shift", carrierId, carrierName);
    }

    /// <summary>
    /// Called by carriers when they end a shift
    /// </summary>
    public async Task EndShift()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? Context.User?.FindFirst("id")?.Value;

        if (!int.TryParse(userId, out var carrierId)) return;

        if (_carrierLocations.TryGetValue(carrierId, out var location))
        {
            location.IsOnShift = false;
            location.ShiftStartTime = null;

            // Broadcast to all admins
            await Clients.Group("Admins").SendAsync("ReceiveLocationUpdate", location);
        }
        
        _logger.LogInformation("Carrier {CarrierId} ended shift", carrierId);
    }

    /// <summary>
    /// Get all current carrier locations (called by admins)
    /// </summary>
    public Task<List<CarrierLocationInfo>> GetAllLocations()
    {
        return Task.FromResult(_carrierLocations.Values.ToList());
    }
}

/// <summary>
/// DTO for carrier location information
/// </summary>
public class CarrierLocationInfo
{
    public int CarrierId { get; set; }
    public string CarrierName { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public DateTime LastUpdate { get; set; } = DateTime.UtcNow;
    public bool IsOnline { get; set; }
    public bool IsOnShift { get; set; }
    public DateTime? ShiftStartTime { get; set; }
}
