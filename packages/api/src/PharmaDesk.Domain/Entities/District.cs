using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class District
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public int CityId { get; set; }
        public City City { get; set; } = null!;
    }
}
