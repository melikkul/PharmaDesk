using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    /// <summary>
    /// Abonelik durumu enum
    /// </summary>
    public enum SubscriptionStatus
    {
        /// <summary>
        /// Aktif abonelik - tüm özelliklere erişim var
        /// </summary>
        Active,
        
        /// <summary>
        /// Ödeme gecikmiş - kısıtlı erişim
        /// </summary>
        PastDue,
        
        /// <summary>
        /// İptal edilmiş
        /// </summary>
        Cancelled,
        
        /// <summary>
        /// Deneme süresi
        /// </summary>
        Trial
    }

    /// <summary>
    /// Abonelik plan tipi enum
    /// </summary>
    public enum SubscriptionPlanType
    {
        /// <summary>
        /// Standart plan - Temel özellikler
        /// </summary>
        Standard,
        
        /// <summary>
        /// Kargo dahil plan - Tüm özellikler + Kargo hizmeti
        /// </summary>
        CargoPlus
    }
}
