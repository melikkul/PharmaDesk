using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Tracks carrier shift/work periods
    /// Records when a carrier starts and ends their work day
    /// </summary>
    public class CarrierShift
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int CarrierId { get; set; }

        [ForeignKey(nameof(CarrierId))]
        public Carrier Carrier { get; set; } = null!;

        /// <summary>
        /// When the shift started
        /// </summary>
        [Required]
        public DateTime StartTime { get; set; }

        /// <summary>
        /// When the shift ended (null if still active)
        /// </summary>
        public DateTime? EndTime { get; set; }

        /// <summary>
        /// Duration in minutes (calculated on end)
        /// </summary>
        public int? DurationMinutes { get; set; }

        /// <summary>
        /// Last known latitude during this shift
        /// </summary>
        public double? LastLatitude { get; set; }

        /// <summary>
        /// Last known longitude during this shift
        /// </summary>
        public double? LastLongitude { get; set; }

        /// <summary>
        /// Last location update time
        /// </summary>
        public DateTime? LastLocationUpdate { get; set; }

        /// <summary>
        /// Is this shift currently active?
        /// </summary>
        [NotMapped]
        public bool IsActive => EndTime == null;

        /// <summary>
        /// Calculated duration (for active shifts uses current time)
        /// </summary>
        [NotMapped]
        public TimeSpan Duration => EndTime.HasValue 
            ? EndTime.Value - StartTime 
            : DateTime.UtcNow - StartTime;
    }
}
