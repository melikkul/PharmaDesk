using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;

namespace PharmaDesk.API.Extensions
{
    public static class ServiceExtensions
    {


        /// <summary>
        /// Adds JWT Bearer authentication configuration
        /// </summary>
        public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var jwtKey = configuration["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey == "[SECRET_FROM_ENV]")
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
                        // Note: Using default claim types since JWT now uses ClaimTypes.Role directly
                    };
                    
                    // 🔐 JWT Token Resolution: Authorization header first, then Cookie, then QueryString
                    opt.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            // 1️⃣ PRIMARY: Check Authorization header first (standard JWT approach)
                            // This is the default behavior - we only need to override if header is empty
                            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
                            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                            {
                                // Let the default handler process the Authorization header
                                return Task.CompletedTask;
                            }
                            
                            // 2️⃣ FALLBACK: Check HttpOnly cookie (for browser sessions without explicit header)
                            var tokenFromCookie = context.Request.Cookies["token"];
                            if (!string.IsNullOrEmpty(tokenFromCookie))
                            {
                                context.Token = tokenFromCookie;
                                return Task.CompletedTask;
                            }
                            
                            // 3️⃣ FALLBACK: Check query string for SignalR WebSocket connections
                            var accessToken = context.Request.Query["access_token"];
                            var path = context.HttpContext.Request.Path;
                            
                            if (!string.IsNullOrEmpty(accessToken) && 
                                (path.StartsWithSegments("/hubs") || path.StartsWithSegments("/signalr")))
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
        /// Adds CORS policy for frontend access - HARDENED VERSION
        /// Only allows specific origins instead of any origin
        /// Supports Docker internal networking for development
        /// </summary>
        public static IServiceCollection AddCorsPolicy(this IServiceCollection services)
        {
            services.AddCors(opt =>
            {
                opt.AddPolicy("frontend", p =>
                {
                    // Production origins - strict whitelist
                    var allowedOrigins = new[]
                    {
                        // Development origins (localhost)
                        "http://localhost:3000",   // Frontend Web
                        "http://localhost:3001",   // Frontend Admin
                        "http://localhost:3002",   // Frontend Cargo
                        "http://127.0.0.1:3000",
                        "http://127.0.0.1:3001",
                        "http://127.0.0.1:3002",
                        // Docker service names
                        "http://frontend-web:3000",
                        "http://frontend-admin:3000",
                        "http://frontend-cargo:3000",
                        // Production origins (add your domains here)
                        "https://pharmadesk.com",
                        "https://admin.pharmadesk.com",
                        "https://www.pharmadesk.com"
                    };

                    p.WithOrigins(allowedOrigins)
                     .SetIsOriginAllowed(origin =>
                     {
                         // Allow listed origins
                         if (allowedOrigins.Contains(origin))
                             return true;
                         
                         // Allow Docker internal network IPs (172.x.x.x) for development
                         // This handles Docker container-to-container communication
                         if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                         {
                             var host = uri.Host;
                             // Docker default bridge network range
                             if (host.StartsWith("172.") || host.StartsWith("192.168.") || host.StartsWith("10."))
                             {
                                 // Only allow common frontend ports
                                 return uri.Port == 3000 || uri.Port == 3001 || uri.Port == 3002;
                             }
                         }
                         
                         return false;
                     })
                     .AllowAnyHeader()
                     .AllowAnyMethod()
                     .AllowCredentials()
                     .WithExposedHeaders("Content-Disposition", "X-Suggested-Filename");
                });
            });
            
            return services;
        }

        /// <summary>
        /// Adds Rate Limiting to protect against DDoS and brute-force attacks
        /// </summary>
        public static IServiceCollection AddRateLimiting(this IServiceCollection services)
        {
            services.AddRateLimiter(options =>
            {
                // Global rate limit: 100 requests per minute per IP
                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            AutoReplenishment = true,
                            PermitLimit = 100,
                            Window = TimeSpan.FromMinutes(1)
                        }));

                // Custom policy for auth endpoints (stricter: 10 requests per minute)
                options.AddFixedWindowLimiter("auth", opt =>
                {
                    opt.PermitLimit = 10;
                    opt.Window = TimeSpan.FromMinutes(1);
                    opt.AutoReplenishment = true;
                });

                // Return 429 Too Many Requests with proper message
                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.HttpContext.Response.ContentType = "application/json";
                    
                    var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfterValue)
                        ? retryAfterValue.TotalSeconds
                        : 60;
                    
                    context.HttpContext.Response.Headers.RetryAfter = retryAfter.ToString();
                    
                    await context.HttpContext.Response.WriteAsJsonAsync(new
                    {
                        error = "Too many requests. Please try again later.",
                        retryAfterSeconds = retryAfter
                    }, token);
                };
            });

            return services;
        }

        /// <summary>
        /// Adds application-specific services
        /// </summary>
        public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddScoped<AuthService>();
            services.AddScoped<CarrierAuthService>();
            services.AddHttpContextAccessor();
            services.AddSignalR();
            
            // 🆕 Register OfferService (Service Layer Pattern)
            services.AddScoped<IOfferService, OfferService>();
            
            // 🆕 Register OrderService (Service Layer Pattern)
            services.AddScoped<IOrderService, OrderService>();
            
            // 🆕 Register InventoryService (Service Layer Pattern)
            services.AddScoped<IInventoryService, InventoryService>();
            
            // 🆕 Register ShipmentService (Service Layer Pattern)
            services.AddScoped<IShipmentService, ShipmentService>();
            
            // 🆕 Register CryptoService (AES-256 for QR shipment tokens)
            services.AddSingleton<ICryptoService, CryptoService>();
            
            // Add memory cache for barem data caching
            services.AddMemoryCache();
            
            // Add Rate Limiting
            services.AddRateLimiting();
            
            // Configure form options for file uploads
            services.Configure<FormOptions>(o =>
            {
                o.MultipartBodyLengthLimit = 5 * 1024 * 1024; // 5 MB
            });
            
            // Register HttpClient for scrapper service
            services.AddHttpClient<AllianceHealthcareClient>(client =>
            {
                var scrapperUrl = Environment.GetEnvironmentVariable("SCRAPPER_SERVICE_URL") 
                    ?? configuration.GetValue<string>("ScrapperService:BaseUrl")
                    ?? "http://scrapper-service:8000";
                client.BaseAddress = new Uri(scrapperUrl);
                client.Timeout = TimeSpan.FromSeconds(60);
            });
            
            // Register external drug service
            services.AddScoped<IExternalDrugService, ExternalDrugService>();
            
            return services;
        }
    }
}
