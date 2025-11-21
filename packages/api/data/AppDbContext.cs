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

        public DbSet<Admin> Admins { get; set; }

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

            // Seed Admin
            modelBuilder.Entity<Admin>().HasData(new Admin
            {
                Id = 1,
                Email = "melik_kul@outlook.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("melik123"),
                FirstName = "Melik",
                LastName = "Kul",
                CreatedAt = DateTime.UtcNow
            });
        }
    }
}