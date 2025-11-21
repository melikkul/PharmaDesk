using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Backend.Models
{
    public class PharmacyProfile
    {
        [Key]
        public int Id { get; set; }

        public string PublicId { get; set; } = string.Empty;

        [Required, StringLength(50)]
        public string GLN { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string PharmacyName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? PostalCode { get; set; }
        public string? ServicePackage { get; set; }
        public string? ProfileImagePath { get; set; }
        public string? About { get; set; } // YENİ
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}