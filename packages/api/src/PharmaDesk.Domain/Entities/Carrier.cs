using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public enum CarrierStatus
    {
        Active,
        Suspended
    }

    public class Carrier
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string LastName { get; set; } = string.Empty;

        [Phone]
        [StringLength(20)]
        public string? PhoneNumber { get; set; }

        [StringLength(100)]
        public string? CompanyName { get; set; }

        [StringLength(200)]
        public string? VehicleInfo { get; set; }

        public CarrierStatus Status { get; set; } = CarrierStatus.Active;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastLoginDate { get; set; }

        public string? Role { get; set; } = "Carrier";
    }
}
