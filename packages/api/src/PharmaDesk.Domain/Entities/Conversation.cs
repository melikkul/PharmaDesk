using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Sohbet konuşması - Grup veya 1:1 mesajlaşma için konteyner
    /// </summary>
    public class Conversation
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Konuşma türü: Direct (1:1) veya Group
        /// </summary>
        public ConversationType Type { get; set; }

        /// <summary>
        /// Sadece Group tipi için: Bağlı olduğu PharmacyGroup Id'si
        /// </summary>
        public int? GroupId { get; set; }

        /// <summary>
        /// Navigation property - Bağlı grup (nullable)
        /// </summary>
        public Group? Group { get; set; }

        /// <summary>
        /// Son mesajın gönderilme zamanı (sıralama için)
        /// </summary>
        public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Son mesajın önizlemesi (liste görünümünde gösterilir)
        /// </summary>
        [StringLength(200)]
        public string? LastMessagePreview { get; set; }

        /// <summary>
        /// Oluşturulma tarihi
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Konuşma katılımcıları
        /// </summary>
        public ICollection<ConversationParticipant> Participants { get; set; } = new List<ConversationParticipant>();

        /// <summary>
        /// Konuşmadaki mesajlar
        /// </summary>
        public ICollection<Message> Messages { get; set; } = new List<Message>();
    }
}
