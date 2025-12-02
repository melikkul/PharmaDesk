using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<PharmacyProfile> PharmacyProfiles { get; set; }
        public DbSet<PharmacySettings> PharmacySettings { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<City> Cities { get; set; }
        public DbSet<District> Districts { get; set; }
        public DbSet<PharmacyGroup> PharmacyGroups { get; set; }
        public DbSet<Medication> Medications { get; set; }
        public DbSet<InventoryItem> InventoryItems { get; set; }
        public DbSet<Admin> Admins { get; set; }
        
        // --- MARKETPLACE & SALES ---
        public DbSet<Offer> Offers { get; set; }
        public DbSet<Cart> Carts { get; set; }
        public DbSet<CartItem> CartItems { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        
        // --- LOGISTICS ---
        public DbSet<Shipment> Shipments { get; set; }
        public DbSet<ShipmentEvent> ShipmentEvents { get; set; }
        
        // --- FINANCE & ANALYTICS ---
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<MarketDemand> MarketDemands { get; set; }
        
        // --- COMMUNICATION ---
        public DbSet<Notification> Notifications { get; set; }
        
        // --- EXTERNAL RESOURCES ---
        public DbSet<WarehouseBarem> WarehouseBarems { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // atc index
            modelBuilder.Entity<Medication>()
                .HasIndex(m => m.ATC)
                .IsUnique();

            // inventory constraint
            modelBuilder.Entity<InventoryItem>()
                .HasIndex(i => new { i.PharmacyProfileId, i.MedicationId, i.BatchNumber })
                .IsUnique();
            
            // --- YENİ İNDEXLER ---
            // PharmacyProfile Username unique constraint
            modelBuilder.Entity<PharmacyProfile>()
                .HasIndex(p => p.Username)
                .IsUnique();
            
            // Shipment OrderNumber unique constraint
            modelBuilder.Entity<Shipment>()
                .HasIndex(s => s.OrderNumber)
                .IsUnique();
            
            // Transaction indexing for performance
            modelBuilder.Entity<Transaction>()
                .HasIndex(t => new { t.PharmacyProfileId, t.Date });
            
            // Offer indexing for marketplace queries
            modelBuilder.Entity<Offer>()
                .HasIndex(o => new { o.Status, o.MedicationId });
            
            // --- NEW INDEXES ---
            // Order OrderNumber unique constraint
            modelBuilder.Entity<Order>()
                .HasIndex(o => o.OrderNumber)
                .IsUnique();
            
            // Cart indexing
            modelBuilder.Entity<Cart>()
                .HasIndex(c => c.PharmacyProfileId);
            
            // CartItem composite index
            modelBuilder.Entity<CartItem>()
                .HasIndex(ci => new { ci.CartId, ci.OfferId });
            
            // ShipmentEvent indexing for timeline queries
            modelBuilder.Entity<ShipmentEvent>()
                .HasIndex(se => new { se.ShipmentId, se.EventDate });
            
            // MarketDemand indexing for analytics
            modelBuilder.Entity<MarketDemand>()
                .HasIndex(md => new { md.City, md.LastSearchedDate });
            

            
            // Report indexing
            modelBuilder.Entity<Report>()
                .HasIndex(r => new { r.PharmacyProfileId, r.GeneratedDate });
            
            // WarehouseBarem indexing
            modelBuilder.Entity<WarehouseBarem>()
                .HasIndex(wb => new { wb.MedicationId, wb.WarehouseName });
            
            // PharmacySettings unique constraint (one setting per pharmacy)
            modelBuilder.Entity<PharmacySettings>()
                .HasIndex(ps => ps.PharmacyProfileId)
                .IsUnique();

            // Admin seed data removed - no automatic admin accounts
            
            // --- GEO-BASED GROUP MANAGEMENT ---
            // PharmacyGroup composite key
            modelBuilder.Entity<PharmacyGroup>()
                .HasKey(pg => new { pg.PharmacyProfileId, pg.GroupId });
            
            // PharmacyGroup -> PharmacyProfile relationship
            modelBuilder.Entity<PharmacyGroup>()
                .HasOne(pg => pg.PharmacyProfile)
                .WithMany(p => p.PharmacyGroups)
                .HasForeignKey(pg => pg.PharmacyProfileId);
            
            // PharmacyGroup -> Group relationship
            modelBuilder.Entity<PharmacyGroup>()
                .HasOne(pg => pg.Group)
                .WithMany(g => g.PharmacyGroups)
                .HasForeignKey(pg => pg.GroupId);
            
            // District -> City relationship
            modelBuilder.Entity<District>()
                .HasOne(d => d.City)
                .WithMany(c => c.Districts)
                .HasForeignKey(d => d.CityId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Group -> City relationship
            modelBuilder.Entity<Group>()
                .HasOne(g => g.City)
                .WithMany(c => c.Groups)
                .HasForeignKey(g => g.CityId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent deleting cities with groups
            
            // City name unique constraint
            modelBuilder.Entity<City>()
                .HasIndex(c => c.Name)
                .IsUnique();
        }
    }
}