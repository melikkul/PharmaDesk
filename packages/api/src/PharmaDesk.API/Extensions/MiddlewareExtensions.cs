using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using System.Net;

namespace PharmaDesk.API.Extensions
{
    /// <summary>
    /// Extension methods for middleware configuration
    /// </summary>
    public static class MiddlewareExtensions
    {
        /// <summary>
        /// Configures global exception handler using custom ExceptionMiddleware
        /// Provides: Serilog logging, consistent JSON responses, TraceId tracking
        /// </summary>
        public static IApplicationBuilder ConfigureExceptionHandler(this WebApplication app)
        {
            // Use our custom middleware for all environments
            // It handles logging and provides consistent error responses
            app.UseMiddleware<Middleware.ExceptionMiddleware>();
            
            return app;
        }

        /// <summary>
        /// Configures security headers for all responses
        /// </summary>
        public static IApplicationBuilder ConfigureSecurityHeaders(this WebApplication app)
        {
            app.Use(async (context, next) =>
            {
                // Skip security headers for CORS preflight requests
                if (context.Request.Method != "OPTIONS")
                {
                    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
                    context.Response.Headers.Append("X-Frame-Options", "DENY");
                    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
                    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
                }
                await next();
            });
            
            return app;
        }

        /// <summary>
        /// Configures the middleware pipeline (Swagger, CORS, Auth, Controllers, SignalR)
        /// </summary>
        public static IApplicationBuilder ConfigurePipeline(this WebApplication app)
        {
            // CORS must be first to handle preflight OPTIONS requests
            app.UseCors("frontend");

            // Rate Limiting - protect against DDoS and brute-force attacks
            app.UseRateLimiter();

            // Static files for serving images from /app/wwwroot
            var wwwrootPath = "/app/wwwroot";
            if (Directory.Exists(wwwrootPath))
            {
                app.UseStaticFiles(new StaticFileOptions
                {
                    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(wwwrootPath),
                    RequestPath = ""
                });
            }

            // Swagger in development
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // Health check endpoints
            app.MapHealthCheckEndpoints();

            // Authentication & Authorization
            app.UseAuthentication();
            app.UseAuthorization();

            // Controllers & SignalR Hubs
            app.MapControllers();
            app.MapHub<PharmaDesk.API.Hubs.NotificationHub>("/hubs/notifications");
            app.MapHub<PharmaDesk.API.Hubs.LocationHub>("/hubs/location");
            app.MapHub<PharmaDesk.API.Hubs.ChatHub>("/hubs/chat");

            return app;
        }
        
        /// <summary>
        /// Configures JSON serializer options for controllers
        /// </summary>
        public static IMvcBuilder ConfigureJsonOptions(this IMvcBuilder builder)
        {
            return builder.AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
            });
        }
    }
}
