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
        /// Configures global exception handler for production environments
        /// </summary>
        public static IApplicationBuilder ConfigureExceptionHandler(this WebApplication app)
        {
            if (!app.Environment.IsDevelopment())
            {
                app.UseExceptionHandler(errorApp =>
                {
                    errorApp.Run(async context =>
                    {
                        var problemDetailsService = context.RequestServices.GetService<IProblemDetailsService>();
                        var problemDetails = new ProblemDetails
                        {
                            Status = (int)HttpStatusCode.InternalServerError,
                            Title = "An unexpected error occurred.",
                            Detail = "An unexpected error occurred. Please try again later."
                        };
                        
                        context.Response.ContentType = "application/problem+json";
                        
                        if (problemDetailsService != null)
                        {
                            await problemDetailsService.WriteAsync(new ProblemDetailsContext 
                            { 
                                HttpContext = context, 
                                ProblemDetails = problemDetails 
                            });
                        }
                        else
                        {
                            await context.Response.WriteAsJsonAsync(problemDetails);
                        }
                    });
                });
            }
            
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

            // Swagger in development
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
                app.UseStaticFiles();
            }

            // Health check endpoints
            app.MapHealthCheckEndpoints();

            // Authentication & Authorization
            app.UseAuthentication();
            app.UseAuthorization();

            // Controllers & SignalR Hubs
            app.MapControllers();
            app.MapHub<PharmaDesk.API.Hubs.NotificationHub>("/hubs/notifications");

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
