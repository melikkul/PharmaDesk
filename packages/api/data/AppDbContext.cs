using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<PharmacyProfile> PharmacyProfiles { get; set; }
        public DbSet<Medication> Medications { get; set; }
        public DbSet<InventoryItem> InventoryItems { get; set; }

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
        }
    }
}