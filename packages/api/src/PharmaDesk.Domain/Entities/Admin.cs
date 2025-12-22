using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class Admin
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        
        /// <summary>
        /// Admin role: "SuperAdmin" for full access, "Admin" for restricted access
        /// </summary>
        public string Role { get; set; } = "Admin";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
