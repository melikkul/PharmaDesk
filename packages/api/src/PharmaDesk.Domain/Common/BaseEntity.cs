using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    /// <summary>
    /// Soft Delete interface for entities
    /// </summary>
    public interface ISoftDelete
    {
        bool IsDeleted { get; set; }
        DateTime? DeletedAt { get; set; }
        long? DeletedBy { get; set; }
    }

    /// <summary>
    /// Auditable interface for tracking entity changes
    /// </summary>
    public interface IAuditable
    {
        DateTime CreatedAt { get; set; }
        long? CreatedBy { get; set; }
        DateTime UpdatedAt { get; set; }
        long? UpdatedBy { get; set; }
    }

    /// <summary>
    /// Concurrency interface for optimistic locking with PostgreSQL xmin
    /// </summary>
    public interface IHasConcurrencyToken
    {
        uint RowVersion { get; set; }
    }

    /// <summary>
    /// Base entity with common fields for all entities
    /// </summary>
    public abstract class BaseEntity : IAuditable, ISoftDelete, IHasConcurrencyToken
    {
        [Key]
        public int Id { get; set; }

        // Audit fields
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public long? CreatedBy { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public long? UpdatedBy { get; set; }

        // Soft delete fields
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public long? DeletedBy { get; set; }

        // Concurrency token - PostgreSQL xmin system column
        [Timestamp]
        [Column("xmin", TypeName = "xid")]
        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public uint RowVersion { get; set; }
    }

    /// <summary>
    /// Base entity without concurrency token (for simple lookup tables)
    /// </summary>
    public abstract class SimpleEntity
    {
        [Key]
        public int Id { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
