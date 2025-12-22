using Microsoft.AspNetCore.SignalR;
using PharmaDesk.API.Hubs;

namespace PharmaDesk.API.Services;

/// <summary>
/// Background service that periodically cleans up stale online users
/// and broadcasts the updated list to all connected clients.
/// </summary>
public class OnlineUserCleanupService : BackgroundService
{
    private readonly ILogger<OnlineUserCleanupService> _logger;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly TimeSpan _cleanupInterval = TimeSpan.FromSeconds(10);

    public OnlineUserCleanupService(
        ILogger<OnlineUserCleanupService> logger,
        IHubContext<NotificationHub> hubContext)
    {
        _logger = logger;
        _hubContext = hubContext;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[OnlineUserCleanup] Service started. Cleanup interval: {Interval}s, Timeout: {Timeout}s",
            _cleanupInterval.TotalSeconds, NotificationHub.HeartbeatTimeoutSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_cleanupInterval, stoppingToken);

                // Clean up stale users and get active user list
                var activeUsers = NotificationHub.CleanupAndGetActiveUsers();

                // Broadcast updated online users to all connected clients
                await _hubContext.Clients.All.SendAsync("ReceiveOnlineUsers", activeUsers, stoppingToken);

                // Log only when there are changes (optional, for debugging)
                // _logger.LogDebug("[OnlineUserCleanup] Active users: {Count}", activeUsers.Count);
            }
            catch (OperationCanceledException)
            {
                // Normal shutdown
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[OnlineUserCleanup] Error during cleanup cycle");
                // Continue running despite errors
            }
        }

        _logger.LogInformation("[OnlineUserCleanup] Service stopped");
    }
}
