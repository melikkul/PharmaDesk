using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Backend.Models
{
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

        [Phone]
        public string PhoneNumber { get; set; } = string.Empty; // Telefon

        public string City { get; set; } = string.Empty;      // Şehir
        public string District { get; set; } = string.Empty;  // İlçe
        public string Address { get; set; } = string.Empty;   // Açık Adres
        public string Group { get; set; } = string.Empty;     // Grup
        // ---------------------------

        // New Fields
        public string PharmacyName { get; set; } = string.Empty;
        public bool IsFirstLogin { get; set; } = true;

        public string? Role { get; set; } = "User";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpires { get; set; }
    }
}