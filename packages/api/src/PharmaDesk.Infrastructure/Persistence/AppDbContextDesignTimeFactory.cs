using Backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PharmaDesk.Infrastructure.Persistence
{
    /// <summary>
    /// Design-time factory for EF Core migrations.
    /// This factory is used by 'dotnet ef migrations' commands when the application
    /// cannot be started (e.g., due to missing environment variables or secrets).
    /// </summary>
    public class AppDbContextDesignTimeFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            
            // Default connection string for design-time operations (migrations)
            // This is only used during 'dotnet ef migrations add/remove' commands
            // In production, the actual connection string comes from environment variables
            var connectionString = "Host=localhost;Port=5433;Database=pharmadesk_db;Username=pharmadesk_user;Password=melik123";

            optionsBuilder.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly("PharmaDesk.Infrastructure");
            });

            return new AppDbContext(optionsBuilder.Options);
        }
    }
}
