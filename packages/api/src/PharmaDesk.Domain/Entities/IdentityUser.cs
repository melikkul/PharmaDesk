using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Backend.Models
{
    public enum UserStatus
    {
        Active,
        Suspended
    }

    public class IdentityUser
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(50)]
        public string GLN { get; set; } = string.Empty;

        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        // --- Yeni Eklenen Alanlar ---
        [Required, StringLength(50)]
        public string FirstName { get; set; } = string.Empty; // İsim

        [Required, StringLength(50)]
        public string LastName { get; set; } = string.Empty;  // Soyisim

        // Foreign Key for PharmacyProfile
        public long PharmacyId { get; set; }
        // Navigation property can be added if needed, but usually IdentityUser is kept lightweight or in a separate context.
        // However, since we are linking them, it's good to have the ID.
        
        public bool IsFirstLogin { get; set; } = true;

        public string? Role { get; set; } = "User";
        
        public DateTime? LastLoginDate { get; set; }
        
        public UserStatus Status { get; set; } = UserStatus.Active;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpires { get; set; }
    }
}