using System;
using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    /// <summary>
    /// Sohbet mesajı - Bir konuşma içindeki tek bir mesaj
    /// </summary>
    public class Message
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Mesajın ait olduğu konuşma
        /// </summary>
        public int ConversationId { get; set; }

        /// <summary>
        /// Navigation property - Konuşma
        /// </summary>
        public Conversation Conversation { get; set; } = null!;

        /// <summary>
        /// Gönderen PharmacyProfile Id'si
        /// </summary>
        public string SenderId { get; set; } = string.Empty;

        /// <summary>
        /// Gönderen eczane adı (grup sohbetinde gösterilir)
        /// </summary>
        [StringLength(200)]
        public string? SenderName { get; set; }

        /// <summary>
        /// Mesaj içeriği
        /// </summary>
        [Required]
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// Gönderilme zamanı
        /// </summary>
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Okundu durumu (1:1 sohbetler için)
        /// </summary>
        public bool IsRead { get; set; } = false;
    }
}