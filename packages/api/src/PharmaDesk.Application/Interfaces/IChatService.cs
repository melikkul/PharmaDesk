using Backend.Models;

namespace PharmaDesk.Application.Interfaces
{
    /// <summary>
    /// Chat service for managing conversations and messages
    /// </summary>
    public interface IChatService
    {
        /// <summary>
        /// Gets all conversations for the current user (group + direct)
        /// </summary>
        Task<List<ConversationDto>> GetMyConversationsAsync(long userId);

        /// <summary>
        /// Gets or creates the group conversation for a pharmacy group
        /// </summary>
        Task<ConversationDto> GetOrCreateGroupConversationAsync(long userId, int groupId);

        /// <summary>
        /// Starts or gets existing direct chat with another user
        /// </summary>
        Task<ConversationDto> StartDirectChatAsync(long userId, long targetUserId);

        /// <summary>
        /// Sends a message to a conversation
        /// </summary>
        Task<MessageDto> SendMessageAsync(int conversationId, long senderId, string content);

        /// <summary>
        /// Gets messages for a conversation
        /// </summary>
        Task<List<MessageDto>> GetMessagesAsync(int conversationId, long userId, bool isAdmin = false);

        /// <summary>
        /// Marks all messages in a conversation as read for a user.
        /// Returns the last read message ID for SignalR notification.
        /// </summary>
        Task<int?> MarkAsReadAsync(int conversationId, long userId);

        /// <summary>
        /// Gets all conversations (Admin only)
        /// </summary>
        Task<List<ConversationDto>> GetAllConversationsAsync(int? groupId = null);

        /// <summary>
        /// Gets total unread count for a user
        /// </summary>
        Task<int> GetTotalUnreadCountAsync(long userId);
    }

    public class ConversationDto
    {
        public int Id { get; set; }
        public ConversationType Type { get; set; }
        public int? GroupId { get; set; }
        public string? GroupName { get; set; }
        public DateTime LastMessageAt { get; set; }
        public string? LastMessagePreview { get; set; }
        public int UnreadCount { get; set; }
        public List<ParticipantDto> Participants { get; set; } = new();
    }

    public class ParticipantDto
    {
        /// <summary>
        /// UserId serialized as string to prevent JavaScript BigInt precision loss
        /// </summary>
        [System.Text.Json.Serialization.JsonConverter(typeof(PharmaDesk.Application.DTOs.LongToStringConverter))]
        public long UserId { get; set; }
        public string? UserName { get; set; }
        public string? PharmacyName { get; set; }
        public bool IsOnline { get; set; }
    }

    public class MessageDto
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public string SenderId { get; set; } = string.Empty;
        public string? SenderName { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public bool IsRead { get; set; }
    }
}
