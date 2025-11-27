using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace PharmaDesk.API.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var pharmacyId = Context.User?.FindFirst("PharmacyId")?.Value;
        
        _logger.LogInformation(
            "SignalR Client Connected - ConnectionId: {ConnectionId}, UserId: {UserId}, PharmacyId: {PharmacyId}", 
            Context.ConnectionId, 
            userId, 
            pharmacyId
        );

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        if (exception != null)
        {
            _logger.LogWarning(
                exception,
                "SignalR Client Disconnected with error - ConnectionId: {ConnectionId}, UserId: {UserId}",
                Context.ConnectionId,
                userId
            );
        }
        else
        {
            _logger.LogInformation(
                "SignalR Client Disconnected - ConnectionId: {ConnectionId}, UserId: {UserId}",
                Context.ConnectionId,
                userId
            );
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Sends a notification to a specific user or all connected clients
    /// </summary>
    /// <param name="userId">Target user ID (if null, broadcasts to all)</param>
    /// <param name="message">Notification message</param>
    /// <param name="type">Notification type (info, success, warning, error, entityUpdated)</param>
    public async Task SendNotification(string? userId, string message, string type = "info")
    {
        var senderId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        _logger.LogInformation(
            "SendNotification called - From: {SenderId}, To: {UserId}, Type: {Type}, Message: {Message}",
            senderId,
            userId ?? "ALL",
            type,
            message
        );

        var notification = new
        {
            message,
            type,
            timestamp = DateTime.UtcNow,
            senderId
        };

        if (!string.IsNullOrEmpty(userId))
        {
            // Send to specific user (future: track user connections)
            await Clients.All.SendAsync("ReceiveNotification", notification);
        }
        else
        {
            // Broadcast to all connected clients
            await Clients.All.SendAsync("ReceiveNotification", notification);
        }
    }
}
