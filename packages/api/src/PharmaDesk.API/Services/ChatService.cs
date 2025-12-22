using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using PharmaDesk.Application.Interfaces;

namespace Backend.Services
{
    /// <summary>
    /// Chat service implementation for managing conversations and messages
    /// </summary>
    public class ChatService : IChatService
    {
        private readonly AppDbContext _context;

        public ChatService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<ConversationDto>> GetMyConversationsAsync(long userId)
        {
            // userId is now PharmacyProfile.Id (passed from controller's GetPharmacyIdFromToken())
            var pharmacyId = userId;

            // Get user's group IDs using PharmacyProfile.Id
            var userGroupIds = await _context.PharmacyGroups
                .Where(pg => pg.PharmacyProfileId == pharmacyId && pg.IsActive)
                .Select(pg => pg.GroupId)
                .ToListAsync();

            // Get all conversations where user is a participant
            var conversations = await _context.Conversations
                .Include(c => c.Group)
                .Include(c => c.Participants)
                .Where(c => c.Participants.Any(p => p.UserId == pharmacyId))
                .OrderByDescending(c => c.LastMessageAt)
                .ToListAsync();

            // Auto-create group conversations if they don't exist
            foreach (var groupId in userGroupIds)
            {
                var existingGroupConv = conversations.FirstOrDefault(c => c.Type == ConversationType.Group && c.GroupId == groupId);
                if (existingGroupConv == null)
                {
                    var newGroupConv = await CreateGroupConversationAsync(groupId, pharmacyId);
                    conversations.Insert(0, newGroupConv);
                }
            }

            // Get pharmacy names for all participants
            var participantUserIds = conversations
                .SelectMany(c => c.Participants)
                .Select(p => p.UserId)
                .Distinct()
                .ToList();

            var pharmacyNames = await _context.PharmacyProfiles
                .Where(p => participantUserIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.PharmacyName);

            // Map to DTOs
            var result = conversations.Select(c => new ConversationDto
            {
                Id = c.Id,
                Type = c.Type,
                GroupId = c.GroupId,
                GroupName = c.Group?.Name,
                LastMessageAt = c.LastMessageAt,
                LastMessagePreview = c.LastMessagePreview,
                UnreadCount = c.Participants.FirstOrDefault(p => p.UserId == pharmacyId)?.UnreadCount ?? 0,
                Participants = c.Participants.Select(p => new ParticipantDto
                {
                    UserId = p.UserId,
                    PharmacyName = pharmacyNames.GetValueOrDefault(p.UserId, "Unknown")
                }).ToList()
            }).ToList();

            // Sort: Group conversations first, then by last message
            return result
                .OrderByDescending(c => c.Type == ConversationType.Group)
                .ThenByDescending(c => c.LastMessageAt)
                .ToList();
        }

        public async Task<ConversationDto> GetOrCreateGroupConversationAsync(long userId, int groupId)
        {
            // Check if user is member of the group
            var isMember = await _context.PharmacyGroups
                .AnyAsync(pg => pg.PharmacyProfileId == userId && pg.GroupId == groupId && pg.IsActive);

            if (!isMember)
                throw new UnauthorizedAccessException("User is not a member of this group");

            // Find existing group conversation
            var conversation = await _context.Conversations
                .Include(c => c.Group)
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Type == ConversationType.Group && c.GroupId == groupId);

            if (conversation == null)
            {
                conversation = await CreateGroupConversationAsync(groupId, userId);
            }
            else
            {
                // Ensure user is a participant
                if (!conversation.Participants.Any(p => p.UserId == userId))
                {
                    conversation.Participants.Add(new ConversationParticipant
                    {
                        UserId = userId,
                        JoinedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();
                }
            }

            return await MapToConversationDtoAsync(conversation, userId);
        }

        public async Task<ConversationDto> StartDirectChatAsync(long userId, long targetUserId)
        {
            if (userId == targetUserId)
                throw new ArgumentException("Cannot start chat with yourself");

            // Find existing direct conversation
            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                .Where(c => c.Type == ConversationType.Direct)
                .Where(c => c.Participants.Any(p => p.UserId == userId) &&
                           c.Participants.Any(p => p.UserId == targetUserId))
                .FirstOrDefaultAsync();

            if (conversation == null)
            {
                // Create new direct conversation
                conversation = new Conversation
                {
                    Type = ConversationType.Direct,
                    CreatedAt = DateTime.UtcNow,
                    LastMessageAt = DateTime.UtcNow,
                    Participants = new List<ConversationParticipant>
                    {
                        new ConversationParticipant { UserId = userId, JoinedAt = DateTime.UtcNow },
                        new ConversationParticipant { UserId = targetUserId, JoinedAt = DateTime.UtcNow }
                    }
                };

                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync();
            }

            return await MapToConversationDtoAsync(conversation, userId);
        }

        public async Task<MessageDto> SendMessageAsync(int conversationId, long senderId, string content)
        {
            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
                throw new ArgumentException("Conversation not found");

            // Check if sender is a participant
            if (!conversation.Participants.Any(p => p.UserId == senderId))
                throw new UnauthorizedAccessException("User is not a participant of this conversation");

            // Get sender's pharmacy name
            var senderName = await _context.PharmacyProfiles
                .Where(p => p.Id == senderId)
                .Select(p => p.PharmacyName)
                .FirstOrDefaultAsync();

            var message = new Message
            {
                ConversationId = conversationId,
                SenderId = senderId.ToString(),
                SenderName = senderName,
                Content = content,
                SentAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.Messages.Add(message);

            // Update conversation
            conversation.LastMessageAt = message.SentAt;
            conversation.LastMessagePreview = content.Length > 100 ? content.Substring(0, 100) + "..." : content;

            // Increment unread count for other participants
            foreach (var participant in conversation.Participants.Where(p => p.UserId != senderId))
            {
                participant.UnreadCount++;
            }

            await _context.SaveChangesAsync();

            return new MessageDto
            {
                Id = message.Id,
                ConversationId = message.ConversationId,
                SenderId = message.SenderId,
                SenderName = message.SenderName,
                Content = message.Content,
                SentAt = message.SentAt,
                IsRead = message.IsRead
            };
        }

        public async Task<List<MessageDto>> GetMessagesAsync(int conversationId, long userId, bool isAdmin = false)
        {
            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
                throw new ArgumentException("Conversation not found");

            // Check access (unless admin)
            if (!isAdmin && !conversation.Participants.Any(p => p.UserId == userId))
                throw new UnauthorizedAccessException("User is not a participant of this conversation");

            var messages = await _context.Messages
                .Where(m => m.ConversationId == conversationId)
                .OrderBy(m => m.SentAt)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    ConversationId = m.ConversationId,
                    SenderId = m.SenderId,
                    SenderName = m.SenderName,
                    Content = m.Content,
                    SentAt = m.SentAt,
                    IsRead = m.IsRead
                })
                .ToListAsync();

            return messages;
        }

        public async Task<int?> MarkAsReadAsync(int conversationId, long userId)
        {
            // 1. Update participant's unread count
            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

            if (participant != null)
            {
                participant.UnreadCount = 0;
                participant.LastReadAt = DateTime.UtcNow;
            }

            // 2. Find the last unread message sent by others (for SignalR notification)
            var lastUnreadMessage = await _context.Messages
                .Where(m => m.ConversationId == conversationId 
                         && m.SenderId != userId.ToString() 
                         && !m.IsRead)
                .OrderByDescending(m => m.Id)
                .FirstOrDefaultAsync();

            if (lastUnreadMessage == null)
            {
                // No unread messages, just save participant changes
                await _context.SaveChangesAsync();
                return null;
            }

            // 3. Batch update: Mark ALL unread messages from others as read
            await _context.Messages
                .Where(m => m.ConversationId == conversationId 
                         && m.SenderId != userId.ToString() 
                         && !m.IsRead)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(m => m.IsRead, true));

            await _context.SaveChangesAsync();

            // Return the last message ID for SignalR event
            return lastUnreadMessage.Id;
        }

        public async Task<List<ConversationDto>> GetAllConversationsAsync(int? groupId = null)
        {
            var query = _context.Conversations
                .Include(c => c.Group)
                .Include(c => c.Participants)
                .AsQueryable();

            if (groupId.HasValue)
            {
                query = query.Where(c => c.GroupId == groupId);
            }

            var conversations = await query
                .OrderByDescending(c => c.LastMessageAt)
                .ToListAsync();

            var participantUserIds = conversations
                .SelectMany(c => c.Participants)
                .Select(p => p.UserId)
                .Distinct()
                .ToList();

            var pharmacyNames = await _context.PharmacyProfiles
                .Where(p => participantUserIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.PharmacyName);

            return conversations.Select(c => new ConversationDto
            {
                Id = c.Id,
                Type = c.Type,
                GroupId = c.GroupId,
                GroupName = c.Group?.Name,
                LastMessageAt = c.LastMessageAt,
                LastMessagePreview = c.LastMessagePreview,
                Participants = c.Participants.Select(p => new ParticipantDto
                {
                    UserId = p.UserId,
                    PharmacyName = pharmacyNames.GetValueOrDefault(p.UserId, "Unknown")
                }).ToList()
            }).ToList();
        }

        public async Task<int> GetTotalUnreadCountAsync(long userId)
        {
            return await _context.ConversationParticipants
                .Where(cp => cp.UserId == userId)
                .SumAsync(cp => cp.UnreadCount);
        }

        // ═══════════════════════════════════════════════════════════════
        // Private Helper Methods
        // ═══════════════════════════════════════════════════════════════

        private async Task<Conversation> CreateGroupConversationAsync(int groupId, long userId)
        {
            var group = await _context.Groups
                .Include(g => g.PharmacyGroups)
                .ThenInclude(pg => pg.PharmacyProfile)
                .FirstOrDefaultAsync(g => g.Id == groupId);

            if (group == null)
                throw new ArgumentException("Group not found");

            // Get all active group members
            var memberIds = group.PharmacyGroups
                .Where(pg => pg.IsActive)
                .Select(pg => pg.PharmacyProfileId)
                .ToList();

            var conversation = new Conversation
            {
                Type = ConversationType.Group,
                GroupId = groupId,
                CreatedAt = DateTime.UtcNow,
                LastMessageAt = DateTime.UtcNow,
                Participants = memberIds.Select(id => new ConversationParticipant
                {
                    UserId = id,
                    JoinedAt = DateTime.UtcNow
                }).ToList()
            };

            _context.Conversations.Add(conversation);
            await _context.SaveChangesAsync();

            // Reload to get navigation properties
            await _context.Entry(conversation).Reference(c => c.Group).LoadAsync();

            return conversation;
        }

        private async Task<ConversationDto> MapToConversationDtoAsync(Conversation conversation, long userId)
        {
            var participantUserIds = conversation.Participants
                .Select(p => p.UserId)
                .ToList();

            var pharmacyNames = await _context.PharmacyProfiles
                .Where(p => participantUserIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.PharmacyName);

            return new ConversationDto
            {
                Id = conversation.Id,
                Type = conversation.Type,
                GroupId = conversation.GroupId,
                GroupName = conversation.Group?.Name,
                LastMessageAt = conversation.LastMessageAt,
                LastMessagePreview = conversation.LastMessagePreview,
                UnreadCount = conversation.Participants.FirstOrDefault(p => p.UserId == userId)?.UnreadCount ?? 0,
                Participants = conversation.Participants.Select(p => new ParticipantDto
                {
                    UserId = p.UserId,
                    PharmacyName = pharmacyNames.GetValueOrDefault(p.UserId, "Unknown")
                }).ToList()
            };
        }
    }
}
