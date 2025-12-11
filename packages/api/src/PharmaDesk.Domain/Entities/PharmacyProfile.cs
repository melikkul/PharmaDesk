using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Models
{
    public class PharmacyProfile
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)] // We will manually set the ID
        public long Id { get; set; }

        public string PublicId { get; set; } = string.Empty;

        [Required, StringLength(50)]
        public string GLN { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string PharmacyName { get; set; } = string.Empty;

        [Phone]
        public string? PhoneNumber { get; set; }
        
        public string? City { get; set; }
        public string? District { get; set; }
        public string? Address { get; set; } // Consolidated Address
        
        [StringLength(20)]
        public string? TaxNumber { get; set; } // Vergi No
        
        [StringLength(100)]
        public string? TaxOffice { get; set; } // Vergi Dairesi
        
        // Many-to-many relationship with Groups (a pharmacy can belong to multiple groups)
        public ICollection<PharmacyGroup> PharmacyGroups { get; set; } = new List<PharmacyGroup>();

        public string? ServicePackage { get; set; }
        public string? ProfileImagePath { get; set; }
        public string? LogoUrl { get; set; } // Logo URL
        public string? About { get; set; }
        
        // --- YENİ ALANLAR: Frontend Entegrasyonu için ---
        [Column(TypeName = "decimal(18,2)")]
        public decimal Balance { get; set; } = 15000; // Cüzdan bakiyesi - varsayılan 15000 ₺
        
        public string? CoverImageUrl { get; set; } // Kapak fotoğrafı
        
        [StringLength(100)]
        public string? Username { get; set; } // URL-friendly benzersiz kimlik (örn: yildiz-eczanesi)
        
        public DateTime RegistrationDate { get; set; } = DateTime.UtcNow; // Kayıt tarihi
        
        /// <summary>
        /// Admin tarafından tanımlanan kargo hizmeti durumu.
        /// True ise eczane PharmaDesk kargo hizmetinden yararlanabilir.
        /// </summary>
        public bool HasShippingService { get; set; } = false; // Default: kargo hizmeti yok
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}