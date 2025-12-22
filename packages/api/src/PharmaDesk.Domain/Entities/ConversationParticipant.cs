using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Konuşma katılımcısı - Hangi kullanıcının hangi konuşmaya dahil olduğunu ve
    /// okunmamış mesaj sayısını takip eder
    /// </summary>
    public class ConversationParticipant
    {
        /// <summary>
        /// Bağlı konuşma Id'si
        /// </summary>
        public int ConversationId { get; set; }

        /// <summary>
        /// Navigation property - Konuşma
        /// </summary>
        public Conversation Conversation { get; set; } = null!;

        /// <summary>
        /// Katılımcı PharmacyProfile Id'si
        /// </summary>
        public long UserId { get; set; }

        /// <summary>
        /// Okunmamış mesaj sayısı
        /// </summary>
        public int UnreadCount { get; set; } = 0;

        /// <summary>
        /// Konuşmaya katılma tarihi
        /// </summary>
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Son okunma tarihi (mesajları "okundu" olarak işaretlemek için)
        /// </summary>
        public DateTime? LastReadAt { get; set; }
    }
}
