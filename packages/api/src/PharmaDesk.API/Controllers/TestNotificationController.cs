using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using PharmaDesk.API.Hubs;

namespace PharmaDesk.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestNotificationController : ControllerBase
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<TestNotificationController> _logger;

    public TestNotificationController(
        IHubContext<NotificationHub> hubContext,
        ILogger<TestNotificationController> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Test endpoint to send a notification to all connected clients
    /// </summary>
    [HttpPost("send")]
    public async Task<IActionResult> SendTestNotification([FromBody] TestNotificationRequest request)
    {
        _logger.LogInformation("Sending test notification: {Message}, Type: {Type}", request.Message, request.Type);

        var notification = new
        {
            message = request.Message ?? "Test bildirimi",
            type = request.Type ?? "info",
            timestamp = DateTime.UtcNow,
            senderId = "system"
        };

        await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);

        return Ok(new { success = true, notification });
    }

    /// <summary>
    /// Send success notification
    /// </summary>
    [HttpPost("success")]
    public async Task<IActionResult> SendSuccessNotification()
    {
        var notification = new
        {
            message = "İşlem başarıyla tamamlandı! ✅",
            type = "success",
            timestamp = DateTime.UtcNow
        };

        await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Send entity updated notification to trigger query invalidation
    /// </summary>
    [HttpPost("entity-updated")]
    public async Task<IActionResult> SendEntityUpdatedNotification()
    {
        var notification = new
        {
            message = "Envanter güncellendi - Veriler yenileniyor...",
            type = "entityUpdated",
            timestamp = DateTime.UtcNow
        };

        await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Send error notification
    /// </summary>
    [HttpPost("error")]
    public async Task<IActionResult> SendErrorNotification()
    {
        var notification = new
        {
            message = "Bir hata oluştu! ❌",
            type = "error",
            timestamp = DateTime.UtcNow
        };

        await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);
        return Ok(new { success = true });
    }

    /// <summary>
    /// Send warning notification
    /// </summary>
    [HttpPost("warning")]
    public async Task<IActionResult> SendWarningNotification()
    {
        var notification = new
        {
            message = "Dikkat! Stok seviyesi düşük ⚠️",
            type = "warning",
            timestamp = DateTime.UtcNow
        };

        await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);
        return Ok(new { success = true });
    }
}

public class TestNotificationRequest
{
    public string? Message { get; set; }
    public string? Type { get; set; }
}
