using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Refresh Token entity for secure session management.
    /// Tokens are hashed (SHA256) before storage for security.
    /// </summary>
    public class RefreshToken
    {
        [Key]
        public int Id { get; set; }
        
        /// <summary>
        /// Foreign key to the user this token belongs to.
        /// </summary>
        public int UserId { get; set; }
        
        /// <summary>
        /// SHA256 hash of the actual refresh token.
        /// The plain token is only sent to the client once.
        /// </summary>
        [Required]
        [StringLength(88)] // SHA256 base64 length
        public string TokenHash { get; set; } = string.Empty;
        
        /// <summary>
        /// When this token was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// When this token expires.
        /// RememberMe=true: 30 days, RememberMe=false: 24 hours
        /// </summary>
        public DateTime ExpiresAt { get; set; }
        
        /// <summary>
        /// Whether this token has been revoked (logout, token rotation, etc.)
        /// </summary>
        public bool IsRevoked { get; set; } = false;
        
        /// <summary>
        /// When this token was revoked.
        /// </summary>
        public DateTime? RevokedAt { get; set; }
        
        /// <summary>
        /// If this token was replaced (token rotation), the hash of the new token.
        /// Used for detecting token reuse attacks.
        /// </summary>
        [StringLength(88)]
        public string? ReplacedByTokenHash { get; set; }
        
        /// <summary>
        /// IP address from which this token was created.
        /// </summary>
        [StringLength(45)] // IPv6 max length
        public string? CreatedByIp { get; set; }
        
        /// <summary>
        /// IP address from which this token was revoked.
        /// </summary>
        [StringLength(45)]
        public string? RevokedByIp { get; set; }
        
        // ═══════════════════════════════════════════════════════════════
        // Computed Properties
        // ═══════════════════════════════════════════════════════════════
        
        /// <summary>
        /// Check if the token is still active (not expired and not revoked).
        /// </summary>
        [NotMapped]
        public bool IsActive => !IsRevoked && DateTime.UtcNow < ExpiresAt;
        
        // ═══════════════════════════════════════════════════════════════
        // Navigation Properties
        // ═══════════════════════════════════════════════════════════════
        
        [ForeignKey(nameof(UserId))]
        public IdentityUser User { get; set; } = null!;
    }
}
