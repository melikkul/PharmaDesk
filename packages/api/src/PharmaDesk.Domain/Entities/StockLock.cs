using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Stok kilidi - "Siparişi Tamamla" sayfasındayken stokları geçici olarak kilitler
    /// </summary>
    public class StockLock
    {
        [Key]
        public int Id { get; set; }

        public int OfferId { get; set; }
        
        public long PharmacyProfileId { get; set; }  // Kilitleyen kullanıcı (alıcı)
        
        [Required]
        public int LockedQuantity { get; set; }
        
        public DateTime LockedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime ExpiresAt { get; set; }  // Varsayılan 10 dakika sonra expire

        // Navigation Properties
        [ForeignKey(nameof(OfferId))]
        public Offer Offer { get; set; } = null!;

        [ForeignKey(nameof(PharmacyProfileId))]
        public PharmacyProfile PharmacyProfile { get; set; } = null!;
    }
}
