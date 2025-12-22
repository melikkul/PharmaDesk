using System.Diagnostics;
using System.Text.Json;
using Backend.Data;
using Backend.Models;

namespace PharmaDesk.API.Middleware
{
    /// <summary>
    /// Request Logging Middleware for Full Stack Traceability.
    /// - Tracks request/response timing
    /// - Captures HTTP status codes
    /// - Writes audit logs asynchronously (fire-and-forget)
    /// - Skips health checks, metrics, and static files (Production Sampling)
    /// </summary>
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        // Paths to skip for production sampling
        private static readonly string[] SkipPaths = 
        {
            "/health",
            "/healthz",
            "/metrics",
            "/ready",
            "/live",
            "/hubs/"
        };

        // Extensions to skip
        private static readonly string[] SkipExtensions =
        {
            ".css",
            ".js",
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".ico",
            ".svg",
            ".woff",
            ".woff2",
            ".ttf",
            ".map"
        };

        public RequestLoggingMiddleware(
            RequestDelegate next,
            ILogger<RequestLoggingMiddleware> logger,
            IServiceScopeFactory scopeFactory)
        {
            _next = next;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // ═══════════════════════════════════════════════════════════════
            // Production Sampling: Skip health checks, metrics, and static files
            // ═══════════════════════════════════════════════════════════════
            var path = context.Request.Path.Value ?? string.Empty;

            if (ShouldSkip(path))
            {
                await _next(context);
                return;
            }

            // ═══════════════════════════════════════════════════════════════
            // Start performance tracking
            // ═══════════════════════════════════════════════════════════════
            var stopwatch = Stopwatch.StartNew();
            var memoryBefore = GC.GetTotalMemory(false);

            // Get correlation ID from previous middleware
            var correlationId = context.Items["CorrelationId"]?.ToString();

            try
            {
                await _next(context);
            }
            finally
            {
                stopwatch.Stop();
                var memoryAfter = GC.GetTotalMemory(false);

                // ═══════════════════════════════════════════════════════════════
                // Fire-and-Forget: Write audit log asynchronously
                // ═══════════════════════════════════════════════════════════════
                _ = WriteAuditLogAsync(
                    correlationId,
                    context.Request.Path.Value,
                    context.Request.Method,
                    context.Response.StatusCode,
                    stopwatch.ElapsedMilliseconds,
                    memoryAfter - memoryBefore,
                    context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                    context.User.FindFirst("PharmacyId")?.Value,
                    context.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value,
                    context.Connection.RemoteIpAddress?.ToString(),
                    context.Request.Headers["User-Agent"].FirstOrDefault()
                );
            }
        }

        /// <summary>
        /// Determines if the request should be skipped for logging (production sampling)
        /// </summary>
        private static bool ShouldSkip(string path)
        {
            // Check path prefixes
            foreach (var skipPath in SkipPaths)
            {
                if (path.StartsWith(skipPath, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            // Check file extensions
            foreach (var ext in SkipExtensions)
            {
                if (path.EndsWith(ext, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }

        /// <summary>
        /// Writes audit log entry asynchronously (fire-and-forget)
        /// </summary>
        private async Task WriteAuditLogAsync(
            string? traceId,
            string? requestPath,
            string httpMethod,
            int statusCode,
            long durationMs,
            long memoryDelta,
            string? userId,
            string? pharmacyId,
            string? userName,
            string? ipAddress,
            string? userAgent)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var performanceMetrics = new
                {
                    requestMs = durationMs,
                    memoryDelta = memoryDelta,
                    timestamp = DateTime.UtcNow
                };

                // Build server-side log entries
                var serverLogs = new[]
                {
                    new {
                        timestamp = DateTime.UtcNow.ToString("o"),
                        level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info",
                        message = $"{httpMethod} {requestPath} → {statusCode} ({durationMs}ms)"
                    },
                    new {
                        timestamp = DateTime.UtcNow.ToString("o"),
                        level = "debug",
                        message = $"User: {userName ?? "anonymous"} | IP: {ipAddress} | Memory: {memoryDelta:+#;-#;0} bytes"
                    }
                };

                var auditLog = new AuditLog
                {
                    TraceId = traceId,
                    Action = "Request",
                    EntityName = "HttpRequest",
                    RequestPath = requestPath,
                    HttpMethod = httpMethod,
                    HttpStatusCode = statusCode,
                    DurationMs = (int)durationMs,
                    LogType = statusCode >= 400 ? "Error" : "Request",
                    UserId = long.TryParse(userId, out var uid) ? uid : null,
                    PharmacyId = long.TryParse(pharmacyId, out var pid) ? pid : null,
                    UserName = userName,
                    IpAddress = ipAddress ?? "Unknown",
                    UserAgent = userAgent,
                    Timestamp = DateTime.UtcNow,
                    IsSuccess = statusCode < 400,
                    PerformanceMetrics = JsonSerializer.Serialize(performanceMetrics),
                    ServerLogs = JsonSerializer.Serialize(serverLogs)
                };

                dbContext.AuditLogs.Add(auditLog);
                await dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Never let logging failures affect the main request
                _logger.LogWarning(ex, "Failed to write audit log for TraceId: {TraceId}", traceId);
            }
        }
    }

    /// <summary>
    /// Extension method to register RequestLogging middleware
    /// </summary>
    public static class RequestLoggingMiddlewareExtensions
    {
        public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder app)
        {
            return app.UseMiddleware<RequestLoggingMiddleware>();
        }
    }
}
