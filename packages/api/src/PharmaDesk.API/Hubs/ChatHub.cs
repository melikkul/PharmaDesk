using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using PharmaDesk.Application.Interfaces;

namespace PharmaDesk.API.Hubs;

/// <summary>
/// SignalR Hub for real-time chat messaging
/// </summary>
[Authorize]
public class ChatHub : Hub
{
    private readonly ILogger<ChatHub> _logger;
    private readonly AppDbContext _context;
    private readonly IChatService _chatService;
    
    // Track online users: userId -> Set of connectionIds (user can have multiple tabs)
    private static readonly ConcurrentDictionary<string, HashSet<string>> _userConnections = new();

    public ChatHub(ILogger<ChatHub> logger, AppDbContext context, IChatService chatService)
    {
        _logger = logger;
        _context = context;
        _chatService = chatService;
    }

    public override async Task OnConnectedAsync()
    {
        // Use PharmacyId for consistent online tracking (matches frontend comparisons)
        var pharmacyIdStr = Context.User?.FindFirst("PharmacyId")?.Value;
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(pharmacyIdStr) && long.TryParse(pharmacyIdStr, out long pharmacyId))
        {
            // Add connection to user's connection set (using PharmacyId as key)
            _userConnections.AddOrUpdate(
                pharmacyIdStr,
                _ => new HashSet<string> { Context.ConnectionId },
                (_, connections) => { connections.Add(Context.ConnectionId); return connections; }
            );

            // Add user to personal SignalR group (using PharmacyId)
            var userGroup = $"user_{pharmacyIdStr}";
            await Groups.AddToGroupAsync(Context.ConnectionId, userGroup);
            _logger.LogInformation($"[ChatHub] User {pharmacyIdStr} added to personal group: {userGroup}");

            // Auto-join user to their pharmacy group's chat room
            var userGroupIds = await _context.PharmacyGroups
                .Where(pg => pg.PharmacyProfileId == pharmacyId && pg.IsActive)
                .Select(pg => pg.GroupId)
                .ToListAsync();

            foreach (var groupId in userGroupIds)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"group_{groupId}");
                _logger.LogInformation($"User {pharmacyIdStr} joined group chat: group_{groupId}");
            }

            _logger.LogInformation($"[ChatHub] User PharmacyId:{pharmacyIdStr} connected with ConnectionId: {Context.ConnectionId}");

            // Notify all clients about online users update (list of PharmacyIds)
            await Clients.All.SendAsync("ReceiveOnlineUsers", _userConnections.Keys.ToList());
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Use PharmacyId for consistent online tracking
        var pharmacyIdStr = Context.User?.FindFirst("PharmacyId")?.Value;

        if (!string.IsNullOrEmpty(pharmacyIdStr))
        {
            // Remove this connection from user's set
            if (_userConnections.TryGetValue(pharmacyIdStr, out var connections))
            {
                connections.Remove(Context.ConnectionId);
                if (connections.Count == 0)
                {
                    _userConnections.TryRemove(pharmacyIdStr, out _);
                }
            }

            _logger.LogInformation($"[ChatHub] User PharmacyId:{pharmacyIdStr} disconnected");

            // Notify all clients about online users update
            await Clients.All.SendAsync("ReceiveOnlineUsers", _userConnections.Keys.ToList());
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Send a message to a conversation
    /// </summary>
    public async Task SendMessage(int conversationId, string content)
    {
        // Use PharmacyId claim to match ChatController behavior
        var pharmacyIdStr = Context.User?.FindFirst("PharmacyId")?.Value;
        
        if (string.IsNullOrEmpty(pharmacyIdStr) || !long.TryParse(pharmacyIdStr, out long senderId) || string.IsNullOrEmpty(content))
        {
            _logger.LogWarning($"[ChatHub] Invalid request - PharmacyId: {pharmacyIdStr}, content empty: {string.IsNullOrEmpty(content)}");
            await Clients.Caller.SendAsync("MessageError", "Invalid request");
            return;
        }

        try
        {
            // Use ChatService to save message
            var messageDto = await _chatService.SendMessageAsync(conversationId, senderId, content);

            // Get conversation to determine routing
            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
            {
                await Clients.Caller.SendAsync("MessageError", "Conversation not found");
                return;
            }

            var messageEvent = new
            {
                id = messageDto.Id,
                conversationId = messageDto.ConversationId,
                content = messageDto.Content,
                senderId = messageDto.SenderId,
                senderName = messageDto.SenderName,
                sentAt = messageDto.SentAt,
                isRead = messageDto.IsRead,
                conversationType = conversation.Type.ToString()
            };

            // Route message based on conversation type
            if (conversation.Type == ConversationType.Group && conversation.GroupId.HasValue)
            {
                // Send to all members of the group via SignalR group
                await Clients.Group($"group_{conversation.GroupId}").SendAsync("ReceiveMessage", messageEvent);
            }
            else
            {
                // Direct message: send to all participants
                foreach (var participant in conversation.Participants)
                {
                    await Clients.Group($"user_{participant.UserId}").SendAsync("ReceiveMessage", messageEvent);
                }
            }

            _logger.LogInformation($"[ChatHub] Message sent by {senderId} to conversation {conversationId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"[ChatHub] Error sending message");
            await Clients.Caller.SendAsync("MessageError", "Failed to send message");
        }
    }

    /// <summary>
    /// Join a specific conversation's SignalR group (for 1:1 chats)
    /// </summary>
    public async Task JoinConversation(int conversationId)
    {
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !long.TryParse(userIdStr, out long userId))
            return;

        // Verify user is a participant
        var isParticipant = await _context.ConversationParticipants
            .AnyAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

        if (isParticipant)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation_{conversationId}");
            _logger.LogInformation($"[ChatHub] User {userId} joined conversation_{conversationId}");

            // Mark messages as read
            await _chatService.MarkAsReadAsync(conversationId, userId);
        }
    }

    /// <summary>
    /// Leave a conversation's SignalR group
    /// </summary>
    public async Task LeaveConversation(int conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conversation_{conversationId}");
    }

    /// <summary>
    /// Get list of online users
    /// </summary>
    public Task<List<string>> GetOnlineUsers()
    {
        return Task.FromResult(_userConnections.Keys.ToList());
    }

    /// <summary>
    /// Typing indicator - broadcast to conversation participants
    /// </summary>
    public async Task SendTypingIndicator(int conversationId, bool isTyping)
    {
        // Use PharmacyId claim to match other methods
        var pharmacyIdStr = Context.User?.FindFirst("PharmacyId")?.Value;
        if (string.IsNullOrEmpty(pharmacyIdStr) || !long.TryParse(pharmacyIdStr, out long pharmacyId)) 
            return;

        var senderName = await _context.PharmacyProfiles
            .Where(p => p.Id == pharmacyId)
            .Select(p => p.PharmacyName)
            .FirstOrDefaultAsync();

        // Broadcast to all participants in the conversation except sender
        var conversation = await _context.Conversations
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == conversationId);

        if (conversation != null)
        {
            foreach (var participant in conversation.Participants.Where(p => p.UserId != pharmacyId))
            {
                await Clients.Group($"user_{participant.UserId}").SendAsync("TypingIndicator", new
                {
                    conversationId,
                    userId = pharmacyIdStr,
                    senderName,
                    isTyping
                });
            }
        }
    }

    /// <summary>
    /// Mark messages as read and broadcast read receipt to sender
    /// Uses batch update and returns lastReadMessageId for efficient UI update
    /// </summary>
    public async Task MarkMessagesAsRead(int conversationId)
    {
        var pharmacyIdStr = Context.User?.FindFirst("PharmacyId")?.Value;
        if (string.IsNullOrEmpty(pharmacyIdStr) || !long.TryParse(pharmacyIdStr, out long pharmacyId))
            return;

        try
        {
            // Mark messages as read and get last read message ID for notification
            var lastReadMessageId = await _chatService.MarkAsReadAsync(conversationId, pharmacyId);

            // Only send notification if there were unread messages
            if (!lastReadMessageId.HasValue)
            {
                _logger.LogDebug($"[ChatHub] No unread messages in conversation {conversationId} for user {pharmacyId}");
                return;
            }

            // Get the conversation to find other participants (message senders)
            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation != null)
            {
                var readAt = DateTime.UtcNow;
                
                // Broadcast read receipt to all other participants
                foreach (var participant in conversation.Participants.Where(p => p.UserId != pharmacyId))
                {
                    var targetGroup = $"user_{participant.UserId}";
                    
                    // Send enhanced ReceiveReadReceipt event with lastReadMessageId
                    await Clients.Group(targetGroup).SendAsync("ReceiveReadReceipt", new
                    {
                        conversationId,
                        lastReadMessageId = lastReadMessageId.Value,
                        readByUserId = pharmacyIdStr,
                        readAt
                    });
                }
                
                _logger.LogInformation($"[ChatHub] Read receipt sent for conversation {conversationId}, lastReadMessageId: {lastReadMessageId}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"[ChatHub] Error marking messages as read");
        }
    }
}
