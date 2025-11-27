using Backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PharmaDesk.Infrastructure.Persistence;

namespace PharmaDesk.API.Extensions
{
    /// <summary>
    /// Extension methods for database configuration and initialization
    /// </summary>
    public static class DatabaseExtensions
    {
        /// <summary>
        /// Gets connection string from configuration with DATABASE_URL support
        /// </summary>
        public static string GetDatabaseConnectionString(this IConfiguration configuration)
        {
            string? databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
            
            if (!string.IsNullOrWhiteSpace(databaseUrl))
            {
                return ParseDatabaseUrl(databaseUrl);
            }
            
            return configuration.GetConnectionString("DefaultConnection")
                   ?? throw new InvalidOperationException("Connection string not found and DATABASE_URL is not set.");
        }

        /// <summary>
        /// Parses DATABASE_URL environment variable into PostgreSQL connection string
        /// </summary>
        private static string ParseDatabaseUrl(string databaseUrl)
        {
            var uri = new Uri(databaseUrl);
            var userInfo = (uri.UserInfo ?? "").Split(':');
            var host = uri.Host;
            var port = uri.Port;
            var db = uri.AbsolutePath.TrimStart('/');
            var user = userInfo.Length > 0 ? userInfo[0] : "";
            var pass = userInfo.Length > 1 ? userInfo[1] : "";

            return $"Host={host};Port={port};Database={db};Username={user};Password={pass};Pooling=true;SSL Mode=Prefer;Trust Server Certificate=true";
        }

        /// <summary>
        /// Adds database contexts with connection string
        /// </summary>
        public static IServiceCollection AddDatabaseContexts(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetDatabaseConnectionString();
            
            services.AddDbContext<AppDbContext>(opt => opt.UseNpgsql(connectionString));
            services.AddDbContext<IdentityDbContext>(opt => opt.UseNpgsql(connectionString));
            
            return services;
        }

        /// <summary>
        /// Initializes database by applying migrations and seeding data
        /// </summary>
        public static async Task InitializeDatabaseAsync(this IServiceProvider services)
        {
            using var scope = services.CreateScope();
            var scopedServices = scope.ServiceProvider;
            var logger = scopedServices.GetRequiredService<ILogger<Program>>();
            
            await DbInitializer.InitializeAsync(scopedServices, logger);
        }
    }
}
