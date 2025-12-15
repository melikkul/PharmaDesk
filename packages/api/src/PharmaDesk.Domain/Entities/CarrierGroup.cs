using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class CarrierGroup
    {
        [Key]
        public int Id { get; set; }

        public int CarrierId { get; set; }
        [ForeignKey("CarrierId")]
        public Carrier Carrier { get; set; } = null!;

        public int GroupId { get; set; }
        [ForeignKey("GroupId")]
        public Group Group { get; set; } = null!;
    }
}
