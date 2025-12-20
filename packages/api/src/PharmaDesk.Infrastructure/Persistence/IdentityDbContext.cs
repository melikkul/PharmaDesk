using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class IdentityDbContext : DbContext
    {
        public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options) { }

        public DbSet<IdentityUser> IdentityUsers { get; set; } 
        public DbSet<RefreshToken> RefreshTokens { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.Entity<IdentityUser>()
                .HasIndex(u => u.Email)
                .IsUnique();
            
            // Index for filtering by status
            modelBuilder.Entity<IdentityUser>()
                .HasIndex(u => u.Status);
            
            // Index for filtering by approval status
            modelBuilder.Entity<IdentityUser>()
                .HasIndex(u => u.IsApproved);
            
            // Index for fast refresh token lookup
            modelBuilder.Entity<RefreshToken>()
                .HasIndex(rt => rt.TokenHash);
            
            // Index for user's tokens
            modelBuilder.Entity<RefreshToken>()
                .HasIndex(rt => rt.UserId);
        }
    }
}