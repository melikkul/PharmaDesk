using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace PharmaDesk.API.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;
    private readonly AppDbContext _context;
    
    // Track online users: userId -> connectionId
    private static readonly ConcurrentDictionary<string, string> _onlineUsers = new();

    public NotificationHub(ILogger<NotificationHub> logger, AppDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            // Add user to their personal group
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            
            // Track online user
            _onlineUsers[userId] = Context.ConnectionId;
            
            _logger.LogInformation($"Kullanıcı bağlandı: {userId}");
            
            // Notify all clients about updated online users
            await Clients.All.SendAsync("ReceiveOnlineUsers", _onlineUsers.Keys.ToList());
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            // Remove from online users
            _onlineUsers.TryRemove(userId, out _);
            
            _logger.LogInformation($"Kullanıcı ayrıldı: {userId}");
            
            // Notify all clients about updated online users
            await Clients.All.SendAsync("ReceiveOnlineUsers", _onlineUsers.Keys.ToList());
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string receiverId, string content)
    {
        var senderId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(senderId) || string.IsNullOrEmpty(content)) return;

        var message = new Message
        {
            SenderId = senderId,
            ReceiverId = receiverId, 
            Content = content,
            SentAt = DateTime.UtcNow,
            IsRead = false
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        var messageDto = new 
        {
            id = message.Id,
            content = message.Content,
            senderId = message.SenderId,
            sentAt = message.SentAt,
            isRead = message.IsRead
        };

        // Send to receiver's group
        await Clients.Group(receiverId).SendAsync("ReceiveMessage", messageDto);
        // Send to caller (sender) as confirmation
        await Clients.Caller.SendAsync("ReceiveMessage", messageDto);
    }

    public Task<List<string>> GetOnlineUsers()
    {
        return Task.FromResult(_onlineUsers.Keys.ToList());
    }
}