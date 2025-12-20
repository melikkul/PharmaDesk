using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class Group
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        // Geo-based grouping: Each group belongs to a city
        public int CityId { get; set; }
        public City City { get; set; } = null!;

        // Many-to-many relationship with PharmacyProfiles
        public ICollection<PharmacyGroup> PharmacyGroups { get; set; } = new List<PharmacyGroup>();

        // ═══════════════════════════════════════════════════════════════
        // SaaS Subscription Features
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Grubun kargo hizmetini satın alıp almadığı.
        /// True ise, bu gruptaki tüm üyelerin aylık abonelik fiyatına
        /// kargo bedeli eklenir.
        /// </summary>
        public bool HasCargoService { get; set; } = false;

        /// <summary>
        /// 🆕 Özel kargo fiyatı. Varsayılan 2450 TL.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal CargoPrice { get; set; } = 2450;

        /// <summary>
        /// Özel abonelik fiyatı (Override/Ezme).
        /// Eğer bu alan doluysa (Null değilse), bu gruptaki üyeler
        /// varsayılan 400 TL yerine bu tutarı öder.
        /// Örn: 350 TL girilirse, üyeler 350 TL öder.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? CustomSubscriptionPrice { get; set; }
    }
}

