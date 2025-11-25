using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class ChatMessage
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid ChatRoomId { get; set; }
        [ForeignKey("ChatRoomId")]
        public ChatRoom ChatRoom { get; set; }

        public long SenderId { get; set; }
        // Sender navigation property opsiyoneldir, döngüsel hatayı önlemek için eklemiyorum

        [Required]
        public string Content { get; set; }

        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        
        public bool IsRead { get; set; } = false;
    }
}