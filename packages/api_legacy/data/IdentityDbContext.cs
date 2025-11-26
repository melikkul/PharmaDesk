using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class IdentityDbContext : DbContext
    {
        public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options) { }

        public DbSet<IdentityUser> IdentityUsers { get; set; } 


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.Entity<IdentityUser>()
                .HasIndex(u => u.Email)
                .IsUnique();
            
            // Index for filtering by status
            modelBuilder.Entity<IdentityUser>()
                .HasIndex(u => u.Status);
        }
    }
}