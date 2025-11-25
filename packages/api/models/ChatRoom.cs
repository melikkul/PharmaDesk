using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class ChatRoom
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        // SORUN ÇÖZÜCÜ: Name alanını 'nullable' (soru işareti) yaptık.
        // Veritabanı artık bu alan boş gelse bile hata vermeyecek.
        public string? Name { get; set; }

        public long User1Id { get; set; }
        [ForeignKey("User1Id")]
        public PharmacyProfile User1 { get; set; }

        public long User2Id { get; set; }
        [ForeignKey("User2Id")]
        public PharmacyProfile User2 { get; set; }

        public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}