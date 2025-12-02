using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    /// <summary>
    /// Join table for many-to-many relationship between PharmacyProfile and Group
    /// Allows pharmacies to be members of multiple groups
    /// </summary>
    public class PharmacyGroup
    {
        public long PharmacyProfileId { get; set; }
        public PharmacyProfile PharmacyProfile { get; set; } = null!;

        public int GroupId { get; set; }
        public Group Group { get; set; } = null!;

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
    }
}
