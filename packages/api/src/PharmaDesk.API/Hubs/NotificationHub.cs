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
    
    // Track online users: pharmacyId -> lastHeartbeat timestamp
    private static readonly ConcurrentDictionary<string, DateTime> _onlineUsers = new();
    
    // Timeout threshold in seconds (users without heartbeat for this long are considered offline)
    public static readonly int HeartbeatTimeoutSeconds = 30;

    public NotificationHub(ILogger<NotificationHub> logger, AppDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var pharmacyIdClaim = Context.User?.FindFirst("PharmacyId")?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            // Add user to their personal group
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            
            // Add user to pharmacy group for subscription notifications
            if (!string.IsNullOrEmpty(pharmacyIdClaim))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"pharmacy_{pharmacyIdClaim}");
                _logger.LogInformation($"User {userId} added to pharmacy group: pharmacy_{pharmacyIdClaim}");
                
                // Track online user by PharmacyId with current timestamp as heartbeat
                _onlineUsers[pharmacyIdClaim] = DateTime.UtcNow;
            }
            
            _logger.LogInformation($"Kullanıcı bağlandı: userId={userId}, pharmacyId={pharmacyIdClaim}");
            
            // Notify all clients about updated online users (list of PharmacyIds)
            await BroadcastOnlineUsers();
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var pharmacyIdClaim = Context.User?.FindFirst("PharmacyId")?.Value;

        if (!string.IsNullOrEmpty(pharmacyIdClaim))
        {
            // Remove from online users by PharmacyId
            _onlineUsers.TryRemove(pharmacyIdClaim, out _);
            
            _logger.LogInformation($"Kullanıcı ayrıldı: userId={userId}, pharmacyId={pharmacyIdClaim}");
            
            // Notify all clients about updated online users
            await BroadcastOnlineUsers();
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Client calls this periodically to indicate they are still active.
    /// This is essential for detecting tab closes without proper logout.
    /// </summary>
    public async Task Heartbeat()
    {
        var pharmacyIdClaim = Context.User?.FindFirst("PharmacyId")?.Value;
        
        if (!string.IsNullOrEmpty(pharmacyIdClaim))
        {
            _onlineUsers[pharmacyIdClaim] = DateTime.UtcNow;
            // Don't broadcast on every heartbeat - the cleanup service handles periodic broadcasts
        }
    }

    /// <summary>
    /// Broadcast current online users to all connected clients
    /// </summary>
    private async Task BroadcastOnlineUsers()
    {
        var activeUsers = GetActiveUserIds();
        await Clients.All.SendAsync("ReceiveOnlineUsers", activeUsers);
    }

    /// <summary>
    /// Get list of active user IDs (those with recent heartbeats)
    /// </summary>
    private static List<string> GetActiveUserIds()
    {
        var threshold = DateTime.UtcNow.AddSeconds(-HeartbeatTimeoutSeconds);
        return _onlineUsers
            .Where(kv => kv.Value > threshold)
            .Select(kv => kv.Key)
            .ToList();
    }

    /// <summary>
    /// Static method for background service to get and clean online users
    /// </summary>
    public static List<string> CleanupAndGetActiveUsers()
    {
        var threshold = DateTime.UtcNow.AddSeconds(-HeartbeatTimeoutSeconds);
        var staleUsers = _onlineUsers
            .Where(kv => kv.Value <= threshold)
            .Select(kv => kv.Key)
            .ToList();

        foreach (var userId in staleUsers)
        {
            _onlineUsers.TryRemove(userId, out _);
        }

        return _onlineUsers.Keys.ToList();
    }

    public Task<List<string>> GetOnlineUsers()
    {
        return Task.FromResult(GetActiveUserIds());
    }

    public async Task SendMessage(string receiverId, string content)
    {
        var senderId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(senderId) || string.IsNullOrEmpty(content)) return;

        // Get sender's pharmacy name for display
        var senderPharmacy = await _context.PharmacyProfiles
            .Where(p => p.Id == long.Parse(senderId))
            .Select(p => p.PharmacyName)
            .FirstOrDefaultAsync();

        // Find or create Direct conversation
        var conversation = await _context.Conversations
            .Include(c => c.Participants)
            .Where(c => c.Type == ConversationType.Direct)
            .Where(c => c.Participants.Any(p => p.UserId == long.Parse(senderId)) &&
                       c.Participants.Any(p => p.UserId == long.Parse(receiverId)))
            .FirstOrDefaultAsync();

        if (conversation == null)
        {
            // Create new conversation
            conversation = new Conversation
            {
                Type = ConversationType.Direct,
                LastMessageAt = DateTime.UtcNow,
                LastMessagePreview = content.Length > 100 ? content.Substring(0, 100) + "..." : content,
                CreatedAt = DateTime.UtcNow,
                Participants = new List<ConversationParticipant>
                {
                    new ConversationParticipant { UserId = long.Parse(senderId), JoinedAt = DateTime.UtcNow },
                    new ConversationParticipant { UserId = long.Parse(receiverId), JoinedAt = DateTime.UtcNow, UnreadCount = 1 }
                }
            };
            _context.Conversations.Add(conversation);
            await _context.SaveChangesAsync();
        }
        else
        {
            // Update existing conversation
            conversation.LastMessageAt = DateTime.UtcNow;
            conversation.LastMessagePreview = content.Length > 100 ? content.Substring(0, 100) + "..." : content;
            
            // Increment unread count for receiver
            var receiverParticipant = conversation.Participants.FirstOrDefault(p => p.UserId == long.Parse(receiverId));
            if (receiverParticipant != null)
            {
                receiverParticipant.UnreadCount++;
            }
        }

        var message = new Message
        {
            ConversationId = conversation.Id,
            SenderId = senderId,
            SenderName = senderPharmacy,
            Content = content,
            SentAt = DateTime.UtcNow,
            IsRead = false
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        var messageDto = new 
        {
            id = message.Id,
            conversationId = message.ConversationId,
            content = message.Content,
            senderId = message.SenderId,
            senderName = message.SenderName,
            sentAt = message.SentAt,
            isRead = message.IsRead
        };

        // Send to receiver's group
        await Clients.Group(receiverId).SendAsync("ReceiveMessage", messageDto);
        // Send to caller (sender) as confirmation
        await Clients.Caller.SendAsync("ReceiveMessage", messageDto);
    }
}