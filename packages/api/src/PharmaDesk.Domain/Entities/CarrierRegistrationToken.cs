using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class CarrierRegistrationToken
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Token { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        // Which admin created this token
        public int CreatedById { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime ExpiresAt { get; set; }

        public bool IsUsed { get; set; } = false;

        public DateTime? UsedAt { get; set; }

        // Navigation property
        public Admin? CreatedBy { get; set; }
    }
}
