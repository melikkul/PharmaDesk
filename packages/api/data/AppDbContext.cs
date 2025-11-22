using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<PharmacyProfile> PharmacyProfiles { get; set; }
        public DbSet<Group> Groups { get; set; }
        public DbSet<Medication> Medications { get; set; }
        public DbSet<InventoryItem> InventoryItems { get; set; }
        public DbSet<Admin> Admins { get; set; }
        
        // --- YENİ TABLOLAR: Frontend Entegrasyonu için ---
        public DbSet<Offer> Offers { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<Shipment> Shipments { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Message> Messages { get; set; }

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

            // Admin seed data removed - no automatic admin accounts
        }
    }
}