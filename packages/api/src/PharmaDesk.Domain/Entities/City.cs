using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class City
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [StringLength(2)]
        public string? PlateCode { get; set; }

        public ICollection<District> Districts { get; set; } = new List<District>();
        public ICollection<Group> Groups { get; set; } = new List<Group>();
    }
}
