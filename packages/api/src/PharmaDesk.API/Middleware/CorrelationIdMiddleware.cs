using Serilog.Context;

namespace PharmaDesk.API.Middleware
{
    /// <summary>
    /// Correlation ID Middleware for Full Stack Traceability.
    /// - Reads X-Correlation-ID from request header or generates new GUID
    /// - Enriches Serilog LogContext with CorrelationId
    /// - Returns the ID in response header for frontend chain completion
    /// </summary>
    public class CorrelationIdMiddleware
    {
        private readonly RequestDelegate _next;
        public const string HeaderName = "X-Correlation-ID";

        public CorrelationIdMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Get or generate correlation ID
            var correlationId = context.Request.Headers[HeaderName].FirstOrDefault()
                ?? Guid.NewGuid().ToString("N")[..32]; // 32-char hex without dashes

            // Store in HttpContext.Items for access throughout request
            context.Items["CorrelationId"] = correlationId;

            // Add to response headers (do this early so it's included even on errors)
            context.Response.OnStarting(() =>
            {
                if (!context.Response.Headers.ContainsKey(HeaderName))
                {
                    context.Response.Headers.Append(HeaderName, correlationId);
                }
                return Task.CompletedTask;
            });

            // Enrich Serilog LogContext - all logs during this request will include CorrelationId
            using (LogContext.PushProperty("CorrelationId", correlationId))
            {
                await _next(context);
            }
        }
    }

    /// <summary>
    /// Extension method to register CorrelationId middleware
    /// </summary>
    public static class CorrelationIdMiddlewareExtensions
    {
        public static IApplicationBuilder UseCorrelationId(this IApplicationBuilder app)
        {
            return app.UseMiddleware<CorrelationIdMiddleware>();
        }
    }
}
