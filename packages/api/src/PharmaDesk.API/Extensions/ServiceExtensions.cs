using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace PharmaDesk.API.Extensions
{
    public static class ServiceExtensions
    {
        /// <summary>
        /// Adds database contexts to the service collection
        /// </summary>
        public static IServiceCollection AddDatabaseContexts(this IServiceCollection services, string connectionString)
        {
            services.AddDbContext<AppDbContext>(opt => opt.UseNpgsql(connectionString));
            services.AddDbContext<IdentityDbContext>(opt => opt.UseNpgsql(connectionString));
            
            return services;
        }

        /// <summary>
        /// Adds JWT Bearer authentication configuration
        /// </summary>
        public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var jwtKey = configuration["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(jwtKey))
                throw new InvalidOperationException("Jwt:Key missing. Provide via appsettings or environment (Jwt__Key).");

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(opt =>
                {
                    opt.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = "PharmaDeskApi",
                        ValidAudience = "PharmaDeskClient",
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                    };
                    
                    // SignalR WebSocket authentication: Read JWT from QueryString
                    opt.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            var accessToken = context.Request.Query["access_token"];
                            var path = context.HttpContext.Request.Path;
                            
                            // If the request is for SignalR hub and token is in query string
                            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                            {
                                context.Token = accessToken;
                            }
                            
                            return Task.CompletedTask;
                        }
                    };
                });

            services.AddAuthorization();
            
            return services;
        }

        /// <summary>
        /// Adds CORS policy for frontend access
        /// </summary>
        public static IServiceCollection AddCorsPolicy(this IServiceCollection services)
        {
            services.AddCors(opt =>
            {
                opt.AddPolicy("frontend", p =>
                {
                    p.SetIsOriginAllowed(origin => true) // Allow any origin for now to fix Docker/Network issues
                     .AllowAnyHeader()
                     .AllowAnyMethod()
                     .AllowCredentials()
                     .WithExposedHeaders("*"); // Expose all headers for SignalR negotiate
                });
            });
            
            return services;
        }

        /// <summary>
        /// Adds application-specific services
        /// </summary>
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            services.AddScoped<AuthService>();
            services.AddHttpContextAccessor();
            services.AddSignalR();
            
            // Configure form options for file uploads
            services.Configure<FormOptions>(o =>
            {
                o.MultipartBodyLengthLimit = 5 * 1024 * 1024; // 5 MB
            });
            
            return services;
        }
    }
}
