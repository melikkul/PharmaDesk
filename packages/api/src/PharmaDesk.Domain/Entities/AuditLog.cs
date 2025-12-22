using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Audit Log entity for tracking all user actions in the system.
    /// Stores who did what, when, and from where.
    /// Critical for compliance (KVKK/GDPR) and security auditing.
    /// </summary>
    public class AuditLog
    {
        [Key]
        public long Id { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // User & Context Information
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// User ID who performed the action (nullable for system actions)
        /// </summary>
        public long? UserId { get; set; }

        /// <summary>
        /// Pharmacy ID associated with the user (for B2B context)
        /// </summary>
        public long? PharmacyId { get; set; }

        /// <summary>
        /// Username or email for quick reference (denormalized)
        /// </summary>
        [StringLength(200)]
        public string? UserName { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Action Details
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Action type: Create, Update, Delete, Login, Logout, View, Export, etc.
        /// </summary>
        [Required, StringLength(50)]
        public string Action { get; set; } = string.Empty;

        /// <summary>
        /// Entity/Table name that was affected (e.g., "Offer", "Order", "InventoryItem")
        /// </summary>
        [Required, StringLength(100)]
        public string EntityName { get; set; } = string.Empty;

        /// <summary>
        /// Primary key of the affected entity
        /// </summary>
        public long? EntityId { get; set; }

        /// <summary>
        /// JSON representation of old values (for Update and Delete operations)
        /// </summary>
        [Column(TypeName = "jsonb")]
        public string? OldValues { get; set; }

        /// <summary>
        /// JSON representation of new values (for Create and Update operations)
        /// </summary>
        [Column(TypeName = "jsonb")]
        public string? NewValues { get; set; }

        /// <summary>
        /// List of changed property names (for Update operations)
        /// </summary>
        [Column(TypeName = "jsonb")]
        public List<string>? ChangedProperties { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Request Context
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Client IP address
        /// </summary>
        [Required, StringLength(50)]
        public string IpAddress { get; set; } = string.Empty;

        /// <summary>
        /// User agent string (browser/client info)
        /// </summary>
        [StringLength(500)]
        public string? UserAgent { get; set; }

        /// <summary>
        /// Request URL/endpoint
        /// </summary>
        [StringLength(500)]
        public string? RequestPath { get; set; }

        /// <summary>
        /// HTTP method (GET, POST, PUT, DELETE, etc.)
        /// </summary>
        [StringLength(10)]
        public string? HttpMethod { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Timestamps
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// When the action occurred
        /// </summary>
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Duration of the operation in milliseconds (for performance tracking)
        /// </summary>
        public int? DurationMs { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Additional Context
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Additional context or notes about the action
        /// </summary>
        [StringLength(1000)]
        public string? AdditionalInfo { get; set; }

        /// <summary>
        /// Was the operation successful?
        /// </summary>
        public bool IsSuccess { get; set; } = true;

        /// <summary>
        /// Error message if operation failed
        /// </summary>
        [StringLength(2000)]
        public string? ErrorMessage { get; set; }

        // ═══════════════════════════════════════════════════════════════
        // Full Stack Traceability Fields
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Correlation ID linking frontend and backend logs (X-Correlation-ID)
        /// </summary>
        [StringLength(36)]
        public string? TraceId { get; set; }

        /// <summary>
        /// Client-side console logs, errors, and events (JSONB)
        /// Format: [{ level: "log|warn|error", message: string, timestamp: number }]
        /// </summary>
        [Column(TypeName = "jsonb")]
        public string? ClientLogs { get; set; }

        /// <summary>
        /// Server-side logs during this request (JSONB)
        /// Format: [{ level: "info|warn|error", message: string, stackTrace?: string }]
        /// </summary>
        [Column(TypeName = "jsonb")]
        public string? ServerLogs { get; set; }

        /// <summary>
        /// Performance metrics: RequestDuration, DbDuration, MemoryUsed, etc. (JSONB)
        /// Format: { requestMs: number, dbMs: number, memoryBytes: number }
        /// </summary>
        [Column(TypeName = "jsonb")]
        public string? PerformanceMetrics { get; set; }

        /// <summary>
        /// Client metadata: Browser, OS, Screen Resolution, etc. (JSONB)
        /// Format: { userAgent: string, screen: string, language: string, timezone: string }
        /// </summary>
        [Column(TypeName = "jsonb")]
        public string? ClientMetadata { get; set; }

        /// <summary>
        /// Log type for categorization: Request, Error, ClientError, SystemEvent, etc.
        /// </summary>
        [StringLength(50)]
        public string? LogType { get; set; }

        /// <summary>
        /// HTTP Status code of the response
        /// </summary>
        public int? HttpStatusCode { get; set; }

        /// <summary>
        /// Session ID for grouping related logs
        /// </summary>
        [StringLength(36)]
        public string? SessionId { get; set; }
    }

    /// <summary>
    /// Common action types for audit logging
    /// </summary>
    public static class AuditActions
    {
        public const string Create = "Create";
        public const string Update = "Update";
        public const string Delete = "Delete";
        public const string SoftDelete = "SoftDelete";
        public const string View = "View";
        public const string Export = "Export";
        public const string Login = "Login";
        public const string Logout = "Logout";
        public const string LoginFailed = "LoginFailed";
        public const string PasswordChange = "PasswordChange";
        public const string PasswordReset = "PasswordReset";
        public const string OrderCreated = "OrderCreated";
        public const string OrderStatusChanged = "OrderStatusChanged";
        public const string PaymentReceived = "PaymentReceived";
        public const string BalanceUpdated = "BalanceUpdated";
        public const string ITSActivation = "ITSActivation";
        public const string ShipmentCreated = "ShipmentCreated";
        public const string ShipmentStatusChanged = "ShipmentStatusChanged";
    }
}
