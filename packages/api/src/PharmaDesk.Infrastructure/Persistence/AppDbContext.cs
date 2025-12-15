using Backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace Backend.Data
{
    /// <summary>
    /// Refactored AppDbContext with:
    /// - JSONB column configuration for PostgreSQL
    /// - PostgreSQL xmin concurrency tokens
    /// - Global Query Filters for soft delete
    /// - Covering and Partial indexes for performance
    /// - Proper relationship configurations
    /// - Automatic Audit Logging for KVKK/GDPR compliance
    /// </summary>
    public class AppDbContext : DbContext
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor httpContextAccessor)
            : base(options)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        // ═══════════════════════════════════════════════════════════════
        // DbSets
        // ═══════════════════════════════════════════════════════════════

        public DbSet<Admin> Admins { get; set; } = null!;
        public DbSet<Carrier> Carriers { get; set; } = null!;
        public DbSet<CarrierGroup> CarrierGroups { get; set; } = null!;
        public DbSet<CarrierRegistrationToken> CarrierRegistrationTokens { get; set; } = null!;
        public DbSet<Cart> Carts { get; set; } = null!;
        public DbSet<CartItem> CartItems { get; set; } = null!;
        public DbSet<City> Cities { get; set; } = null!;
        public DbSet<District> Districts { get; set; } = null!;
        public DbSet<Group> Groups { get; set; } = null!;
        public DbSet<InventoryItem> InventoryItems { get; set; } = null!;
        public DbSet<MarketDemand> MarketDemands { get; set; } = null!;
        public DbSet<Medication> Medications { get; set; } = null!;
        public DbSet<Message> Messages { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<Offer> Offers { get; set; } = null!;
        public DbSet<OfferTarget> OfferTargets { get; set; } = null!; // 🆕 Join table
        public DbSet<Order> Orders { get; set; } = null!;
        public DbSet<OrderItem> OrderItems { get; set; } = null!;
        public DbSet<PharmacyGroup> PharmacyGroups { get; set; } = null!;
        public DbSet<PharmacyProfile> PharmacyProfiles { get; set; } = null!;
        public DbSet<PharmacySettings> PharmacySettings { get; set; } = null!;
        public DbSet<Report> Reports { get; set; } = null!;
        public DbSet<Shipment> Shipments { get; set; } = null!;
        public DbSet<ShipmentEvent> ShipmentEvents { get; set; } = null!;
        public DbSet<StockLock> StockLocks { get; set; } = null!;
        public DbSet<Transaction> Transactions { get; set; } = null!;
        public DbSet<WarehouseBarem> WarehouseBarems { get; set; } = null!;
        public DbSet<CarrierShift> CarrierShifts { get; set; } = null!; // 🆕 Carrier work shifts
        
        // 🆕 Audit & Compliance
        public DbSet<AuditLog> AuditLogs { get; set; } = null!;
        
        // 🆕 Financial Module (Enterprise)
        public DbSet<Invoice> Invoices { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        public DbSet<ReturnRequest> ReturnRequests { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ═══════════════════════════════════════════════════════════════
            // 1. GLOBAL QUERY FILTERS for Soft Delete
            // ═══════════════════════════════════════════════════════════════

            // Apply global filter to all ISoftDelete entities
            modelBuilder.Entity<Offer>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Medication>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<InventoryItem>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Transaction>().HasQueryFilter(e => !e.IsDeleted);

            // ═══════════════════════════════════════════════════════════════
            // 2. CONCURRENCY TOKENS (PostgreSQL xmin)
            // ═══════════════════════════════════════════════════════════════

            // Configure xmin as concurrency token for entities that need it
            modelBuilder.Entity<Offer>()
                .Property(e => e.RowVersion)
                .HasColumnName("xmin")
                .HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate()
                .IsConcurrencyToken();

            modelBuilder.Entity<Medication>()
                .Property(e => e.RowVersion)
                .HasColumnName("xmin")
                .HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate()
                .IsConcurrencyToken();

            modelBuilder.Entity<InventoryItem>()
                .Property(e => e.RowVersion)
                .HasColumnName("xmin")
                .HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate()
                .IsConcurrencyToken();

            modelBuilder.Entity<Transaction>()
                .Property(e => e.RowVersion)
                .HasColumnName("xmin")
                .HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate()
                .IsConcurrencyToken();

            // ═══════════════════════════════════════════════════════════════
            // 3. JSONB COLUMN CONFIGURATION (PostgreSQL native)
            // ═══════════════════════════════════════════════════════════════

            modelBuilder.Entity<Medication>(entity =>
            {
                // JSONB for alternative medications
                entity.Property(e => e.Alternatives)
                    .HasColumnType("jsonb");

                // JSONB for all image paths
                entity.Property(e => e.AllImagePaths)
                    .HasColumnType("jsonb");
            });

            // ═══════════════════════════════════════════════════════════════
            // 4. OFFER TARGET JOIN TABLE (1NF Normalization)
            // ═══════════════════════════════════════════════════════════════

            modelBuilder.Entity<OfferTarget>(entity =>
            {
                // Composite primary key
                entity.HasKey(ot => new { ot.OfferId, ot.TargetPharmacyId });

                // Relationships
                entity.HasOne(ot => ot.Offer)
                    .WithMany(o => o.OfferTargets)
                    .HasForeignKey(ot => ot.OfferId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(ot => ot.TargetPharmacy)
                    .WithMany()
                    .HasForeignKey(ot => ot.TargetPharmacyId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Index for efficient lookups by target pharmacy
                entity.HasIndex(ot => ot.TargetPharmacyId);
            });

            // ═══════════════════════════════════════════════════════════════
            // 5. TRANSACTION FK CONFIGURATION (Polymorphic Fix)
            // ═══════════════════════════════════════════════════════════════

            modelBuilder.Entity<Transaction>(entity =>
            {
                // Nullable FK to Order
                entity.HasOne(t => t.Order)
                    .WithMany()
                    .HasForeignKey(t => t.OrderId)
                    .OnDelete(DeleteBehavior.SetNull);

                // Nullable FK to Offer
                entity.HasOne(t => t.Offer)
                    .WithMany(o => o.Transactions)
                    .HasForeignKey(t => t.OfferId)
                    .OnDelete(DeleteBehavior.SetNull);

                // Counterparty pharmacy
                entity.HasOne(t => t.CounterpartyPharmacy)
                    .WithMany()
                    .HasForeignKey(t => t.CounterpartyPharmacyId)
                    .OnDelete(DeleteBehavior.SetNull);

                // Index for transaction lookups
                entity.HasIndex(t => new { t.PharmacyProfileId, t.Date });
                entity.HasIndex(t => t.OrderId);
                entity.HasIndex(t => t.OfferId);
                entity.HasIndex(t => t.CounterpartyPharmacyId);
                
                // 🆕 Production Performance: PharmacyProfileId + Date (DESC) for optimized history queries
                entity.HasIndex(t => new { t.PharmacyProfileId, t.Date })
                    .HasDatabaseName("IX_Transactions_Pharmacy_Date")
                    .IsDescending(false, true);
            });

            // ═══════════════════════════════════════════════════════════════
            // 6. INDEXES for Performance
            // ═══════════════════════════════════════════════════════════════

            // OFFERS
            modelBuilder.Entity<Offer>(entity =>
            {
                // Partial Index: Only active, non-deleted offers for marketplace queries
                entity.HasIndex(o => new { o.MedicationId, o.Price })
                    .HasDatabaseName("IX_Offers_Active_Price")
                    .HasFilter("\"Status\" = 0 AND \"IsDeleted\" = false");

                // Status + MedicationId for filtering
                entity.HasIndex(o => new { o.Status, o.MedicationId });

                // PharmacyProfileId for "my offers" queries
                entity.HasIndex(o => o.PharmacyProfileId);
                
                // 🆕 Production Performance: Status + CreatedAt (DESC) for optimized marketplace listings
                entity.HasIndex(o => new { o.Status, o.CreatedAt })
                    .HasDatabaseName("IX_Offers_Status_CreatedAt")
                    .IsDescending(false, true);
            });

            // MEDICATIONS
            modelBuilder.Entity<Medication>(entity =>
            {
                // Unique ATC code
                entity.HasIndex(m => m.ATC).IsUnique();

                // Barcode for quick lookups
                entity.HasIndex(m => m.Barcode);

                // Name for search
                entity.HasIndex(m => m.Name);
            });

            // INVENTORY ITEMS
            modelBuilder.Entity<InventoryItem>(entity =>
            {
                // Unique constraint: One batch per pharmacy/medication combo
                entity.HasIndex(i => new { i.PharmacyProfileId, i.MedicationId, i.BatchNumber })
                    .IsUnique();

                // Medication lookup
                entity.HasIndex(i => i.MedicationId);

                // Partial Index: Non-deleted items with stock
                entity.HasIndex(i => new { i.PharmacyProfileId, i.Quantity })
                    .HasDatabaseName("IX_InventoryItems_Active_Stock")
                    .HasFilter("\"IsDeleted\" = false AND \"Quantity\" > 0");
            });

            // ORDERS
            modelBuilder.Entity<Order>(entity =>
            {
                entity.HasIndex(o => o.OrderNumber).IsUnique();
                entity.HasIndex(o => o.BuyerPharmacyId);
                entity.HasIndex(o => o.SellerPharmacyId);
            });

            // ORDER ITEMS
            modelBuilder.Entity<OrderItem>(entity =>
            {
                entity.HasIndex(oi => oi.OrderId);
                entity.HasIndex(oi => oi.MedicationId);
                entity.HasIndex(oi => oi.OfferId);
                
                // 🆕 Production Performance: Optimized index for medication sales aggregation
                entity.HasIndex(oi => oi.MedicationId)
                    .HasDatabaseName("IX_OrderItems_MedicationId_Optimized");
            });

            // CARTS
            modelBuilder.Entity<Cart>(entity =>
            {
                entity.HasIndex(c => c.PharmacyProfileId);
            });

            // CART ITEMS
            modelBuilder.Entity<CartItem>(entity =>
            {
                entity.HasIndex(ci => new { ci.CartId, ci.OfferId });
                entity.HasIndex(ci => ci.OfferId);
            });

            // CITIES
            modelBuilder.Entity<City>(entity =>
            {
                entity.HasIndex(c => c.Name).IsUnique();
            });

            // DISTRICTS
            modelBuilder.Entity<District>(entity =>
            {
                entity.HasIndex(d => d.CityId);
            });

            // GROUPS
            modelBuilder.Entity<Group>(entity =>
            {
                entity.HasIndex(g => g.CityId);
            });

            // PHARMACY GROUPS (Join Table)
            modelBuilder.Entity<PharmacyGroup>(entity =>
            {
                entity.HasKey(pg => new { pg.PharmacyProfileId, pg.GroupId });
                entity.HasIndex(pg => pg.GroupId);
            });

            // PHARMACY PROFILES
            modelBuilder.Entity<PharmacyProfile>(entity =>
            {
                entity.HasIndex(pp => pp.Username).IsUnique();
            });

            // PHARMACY SETTINGS
            modelBuilder.Entity<PharmacySettings>(entity =>
            {
                entity.HasIndex(ps => ps.PharmacyProfileId).IsUnique();
            });

            // NOTIFICATIONS
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasIndex(n => n.PharmacyProfileId);
            });

            // MESSAGES
            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasIndex(m => new { m.SenderId, m.ReceiverId });
            });

            // MARKET DEMANDS
            modelBuilder.Entity<MarketDemand>(entity =>
            {
                entity.HasIndex(md => md.MedicationId);
                entity.HasIndex(md => new { md.City, md.LastSearchedDate });
            });

            // CARRIERS
            modelBuilder.Entity<Carrier>(entity =>
            {
                entity.HasIndex(c => c.Email).IsUnique();
                entity.HasIndex(c => c.Username).IsUnique();
            });

            // CARRIER GROUPS
            modelBuilder.Entity<CarrierGroup>(entity =>
            {
                entity.HasIndex(cg => new { cg.CarrierId, cg.GroupId }).IsUnique();

                entity.HasOne(cg => cg.Carrier)
                    .WithMany(c => c.CarrierGroups)
                    .HasForeignKey(cg => cg.CarrierId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(cg => cg.Group)
                    .WithMany()
                    .HasForeignKey(cg => cg.GroupId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // CARRIER REGISTRATION TOKENS
            modelBuilder.Entity<CarrierRegistrationToken>(entity =>
            {
                entity.HasIndex(crt => crt.Token).IsUnique();
                entity.HasIndex(crt => crt.CreatedById);
                entity.HasIndex(crt => new { crt.IsUsed, crt.ExpiresAt });
            });

            // SHIPMENTS
            modelBuilder.Entity<Shipment>(entity =>
            {
                entity.HasIndex(s => s.OrderNumber).IsUnique();
                entity.HasIndex(s => s.SenderPharmacyId);
                entity.HasIndex(s => s.ReceiverPharmacyId);
                entity.HasIndex(s => s.MedicationId);
            });

            // SHIPMENT EVENTS
            modelBuilder.Entity<ShipmentEvent>(entity =>
            {
                entity.HasIndex(se => new { se.ShipmentId, se.EventDate });
            });

            // STOCK LOCKS
            modelBuilder.Entity<StockLock>(entity =>
            {
                entity.HasIndex(sl => new { sl.OfferId, sl.ExpiresAt });
                entity.HasIndex(sl => sl.PharmacyProfileId);
            });

            // REPORTS
            modelBuilder.Entity<Report>(entity =>
            {
                entity.HasIndex(r => new { r.PharmacyProfileId, r.GeneratedDate });
                
                // JSONB for report data
                entity.Property(r => r.DataJson)
                    .HasColumnType("jsonb");
            });

            // 🆕 AUDIT LOGS (KVKK/GDPR Compliance)
            modelBuilder.Entity<AuditLog>(entity =>
            {
                // Indexes for efficient querying
                entity.HasIndex(a => a.Timestamp);
                entity.HasIndex(a => a.UserId);
                entity.HasIndex(a => a.PharmacyId);
                entity.HasIndex(a => new { a.EntityName, a.EntityId });
                entity.HasIndex(a => a.Action);
                entity.HasIndex(a => a.IpAddress);

                // Composite index for common query patterns
                entity.HasIndex(a => new { a.UserId, a.Timestamp })
                    .HasDatabaseName("IX_AuditLogs_User_Time");

                // JSONB columns
                entity.Property(a => a.OldValues)
                    .HasColumnType("jsonb");
                entity.Property(a => a.NewValues)
                    .HasColumnType("jsonb");
                entity.Property(a => a.ChangedProperties)
                    .HasColumnType("jsonb");
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // Override SaveChanges for Audit Fields and Audit Logging
        // ═══════════════════════════════════════════════════════════════

        public override int SaveChanges()
        {
            UpdateAuditFields();
            CreateAuditLogs();
            return base.SaveChanges();
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            UpdateAuditFields();
            CreateAuditLogs();
            return await base.SaveChangesAsync(cancellationToken);
        }

        private void UpdateAuditFields()
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.Entity is IAuditable && 
                           (e.State == EntityState.Added || e.State == EntityState.Modified));

            var now = DateTime.UtcNow;

            foreach (var entry in entries)
            {
                var entity = (IAuditable)entry.Entity;

                if (entry.State == EntityState.Added)
                {
                    entity.CreatedAt = now;
                }

                entity.UpdatedAt = now;
            }

            // Handle soft deletes
            var deletedEntries = ChangeTracker.Entries()
                .Where(e => e.Entity is ISoftDelete && e.State == EntityState.Deleted);

            foreach (var entry in deletedEntries)
            {
                // Convert hard delete to soft delete
                entry.State = EntityState.Modified;
                var entity = (ISoftDelete)entry.Entity;
                entity.IsDeleted = true;
                entity.DeletedAt = now;
            }
        }

        /// <summary>
        /// Creates audit log entries for all tracked entity changes.
        /// Captures Add, Modify, Delete operations with old/new values.
        /// </summary>
        private void CreateAuditLogs()
        {
            // Skip if no HttpContext (e.g., migrations, seeding)
            var httpContext = _httpContextAccessor?.HttpContext;
            
            // Get user context
            long? userId = null;
            long? pharmacyId = null;
            string? userName = null;
            string ipAddress = "System";
            string? userAgent = null;
            string? requestPath = null;
            string? httpMethod = null;

            if (httpContext != null)
            {
                // Extract user ID from claims
                var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (long.TryParse(userIdClaim, out var parsedUserId))
                    userId = parsedUserId;

                // Extract pharmacy ID from claims
                var pharmacyIdClaim = httpContext.User.FindFirst("PharmacyId")?.Value;
                if (long.TryParse(pharmacyIdClaim, out var parsedPharmacyId))
                    pharmacyId = parsedPharmacyId;

                userName = httpContext.User.FindFirst(ClaimTypes.Email)?.Value 
                        ?? httpContext.User.FindFirst(ClaimTypes.Name)?.Value;

                // Get request context
                ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
                userAgent = httpContext.Request.Headers["User-Agent"].FirstOrDefault();
                requestPath = httpContext.Request.Path.Value;
                httpMethod = httpContext.Request.Method;
            }

            var now = DateTime.UtcNow;
            var auditEntries = new List<AuditLog>();

            // Get entities that need audit logging (exclude AuditLog itself to prevent recursion)
            var entries = ChangeTracker.Entries()
                .Where(e => e.Entity is not AuditLog &&
                           (e.State == EntityState.Added || 
                            e.State == EntityState.Modified || 
                            e.State == EntityState.Deleted))
                .ToList();

            foreach (var entry in entries)
            {
                var entityName = entry.Entity.GetType().Name;
                var entityId = GetPrimaryKeyValue(entry);

                string action;
                string? oldValues = null;
                string? newValues = null;
                List<string>? changedProperties = null;

                switch (entry.State)
                {
                    case EntityState.Added:
                        action = AuditActions.Create;
                        newValues = SerializeEntity(entry.CurrentValues);
                        break;

                    case EntityState.Modified:
                        action = AuditActions.Update;
                        oldValues = SerializeEntity(entry.OriginalValues);
                        newValues = SerializeEntity(entry.CurrentValues);
                        changedProperties = entry.Properties
                            .Where(p => p.IsModified)
                            .Select(p => p.Metadata.Name)
                            .ToList();
                        
                        // Check if this is a soft delete
                        if (entry.Entity is ISoftDelete softDelete && softDelete.IsDeleted)
                        {
                            action = AuditActions.SoftDelete;
                        }
                        break;

                    case EntityState.Deleted:
                        action = AuditActions.Delete;
                        oldValues = SerializeEntity(entry.OriginalValues);
                        break;

                    default:
                        continue;
                }

                var auditLog = new AuditLog
                {
                    UserId = userId,
                    PharmacyId = pharmacyId,
                    UserName = userName,
                    Action = action,
                    EntityName = entityName,
                    EntityId = entityId,
                    OldValues = oldValues,
                    NewValues = newValues,
                    ChangedProperties = changedProperties,
                    IpAddress = ipAddress,
                    UserAgent = userAgent,
                    RequestPath = requestPath,
                    HttpMethod = httpMethod,
                    Timestamp = now,
                    IsSuccess = true
                };

                auditEntries.Add(auditLog);
            }

            // Add audit logs to context
            if (auditEntries.Any())
            {
                AuditLogs.AddRange(auditEntries);
            }
        }

        /// <summary>
        /// Gets the primary key value from an entity entry
        /// </summary>
        private static long? GetPrimaryKeyValue(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry)
        {
            var keyProperty = entry.Metadata.FindPrimaryKey()?.Properties.FirstOrDefault();
            if (keyProperty == null) return null;

            var keyValue = entry.Property(keyProperty.Name).CurrentValue;
            
            return keyValue switch
            {
                int intValue => intValue,
                long longValue => longValue,
                _ => null
            };
        }

        /// <summary>
        /// Serializes property values to JSON for audit logging
        /// </summary>
        private static string? SerializeEntity(Microsoft.EntityFrameworkCore.ChangeTracking.PropertyValues? values)
        {
            if (values == null) return null;

            var dictionary = new Dictionary<string, object?>();
            
            foreach (var property in values.Properties)
            {
                var value = values[property];
                
                // Skip navigation properties and complex types
                if (property.IsShadowProperty() || property.ClrType.IsClass && property.ClrType != typeof(string))
                    continue;

                // Mask sensitive fields
                var propertyName = property.Name.ToLowerInvariant();
                if (propertyName.Contains("password") || 
                    propertyName.Contains("secret") || 
                    propertyName.Contains("token") ||
                    propertyName.Contains("hash"))
                {
                    dictionary[property.Name] = "***MASKED***";
                }
                else
                {
                    dictionary[property.Name] = value;
                }
            }

            return JsonSerializer.Serialize(dictionary, new JsonSerializerOptions 
            { 
                WriteIndented = false,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            });
        }
    }
}
