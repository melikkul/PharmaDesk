using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class Group
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }
    }
}
