using Backend.Data;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;

namespace PharmaDesk.API.Extensions
{
    /// <summary>
    /// Extension methods for health check configuration
    /// </summary>
    public static class HealthCheckExtensions
    {
        /// <summary>
        /// Adds health checks for database and system
        /// </summary>
        public static IServiceCollection AddHealthChecksConfiguration(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetDatabaseConnectionString();
            
            services.AddHealthChecks()
                .AddNpgSql(
                    connectionString,
                    name: "postgres-db",
                    failureStatus: HealthStatus.Unhealthy,
                    tags: new[] { "db", "postgresql" },
                    timeout: TimeSpan.FromSeconds(5))
                .AddDbContextCheck<AppDbContext>(
                    name: "appdb-context",
                    failureStatus: HealthStatus.Unhealthy,
                    tags: new[] { "db", "context" })
                .AddDbContextCheck<IdentityDbContext>(
                    name: "identity-context",
                    failureStatus: HealthStatus.Unhealthy,
                    tags: new[] { "db", "context" });

            return services;
        }

        /// <summary>
        /// Maps health check endpoints
        /// </summary>
        public static IEndpointRouteBuilder MapHealthCheckEndpoints(this IEndpointRouteBuilder endpoints)
        {
            endpoints.MapHealthChecks("/health", new HealthCheckOptions
            {
                ResponseWriter = WriteHealthCheckResponse
            });

            endpoints.MapHealthChecks("/health/ready", new HealthCheckOptions
            {
                Predicate = check => check.Tags.Contains("db"),
                ResponseWriter = WriteHealthCheckResponse
            });

            endpoints.MapHealthChecks("/health/live", new HealthCheckOptions
            {
                Predicate = _ => false,
                ResponseWriter = WriteHealthCheckResponse
            });

            return endpoints;
        }

        private static async Task WriteHealthCheckResponse(HttpContext context, HealthReport report)
        {
            context.Response.ContentType = "application/json";

            var result = JsonSerializer.Serialize(new
            {
                status = report.Status.ToString(),
                timestamp = DateTime.UtcNow,
                duration = report.TotalDuration,
                checks = report.Entries.Select(e => new
                {
                    name = e.Key,
                    status = e.Value.Status.ToString(),
                    description = e.Value.Description,
                    duration = e.Value.Duration,
                    exception = e.Value.Exception?.Message,
                    data = e.Value.Data
                })
            }, new JsonSerializerOptions
            {
                WriteIndented = true
            });

            await context.Response.WriteAsync(result);
        }
    }
}
