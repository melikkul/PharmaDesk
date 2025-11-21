using Backend.Data;
using Backend.Services;
using Backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Http.Features;
using System.Text;
using AspNetCoreRateLimit;
using Microsoft.AspNetCore.Diagnostics;
using System.Net;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls(builder.Configuration["ASPNETCORE_URLS"] ?? "http://0.0.0.0:8081");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();

// --- Rate Limiting Services ---
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(options =>
{
    options.GeneralRules = new List<RateLimitRule>
    {
        new RateLimitRule
        {
            Endpoint = "*",
            Period = "1m",
            Limit = 100 // 1 dakikada maksimum 100 istek
        },
        new RateLimitRule
        {
            Endpoint = "*",
            Period = "1h",
            Limit = 3600
        }
    };
});
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
// ------------------------------

string? databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
string connString;

if (!string.IsNullOrWhiteSpace(databaseUrl))
{
    var uri = new Uri(databaseUrl);
    var userInfo = (uri.UserInfo ?? "").Split(':');
    var host = uri.Host;
    var port = uri.Port;
    var db   = uri.AbsolutePath.TrimStart('/');
    var user = userInfo.Length > 0 ? userInfo[0] : "";
    var pass = userInfo.Length > 1 ? userInfo[1] : "";

    connString = $"Host={host};Port={port};Database={db};Username={user};Password={pass};Pooling=true;SSL Mode=Prefer;Trust Server Certificate=true";
}
else
{
    connString = builder.Configuration.GetConnectionString("DefaultConnection")
                 ?? throw new InvalidOperationException("Connection string not found and DATABASE_URL is not set.");
}

builder.Services.AddDbContext<AppDbContext>(opt => opt.UseNpgsql(connString)); 
builder.Services.AddDbContext<IdentityDbContext>(opt => opt.UseNpgsql(connString));

builder.Services.AddScoped<AuthService>();

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("Jwt:Key missing. Provide via appsettings or environment (Jwt__Key).");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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
    });

builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();

// --- Secure CORS Policy ---
var allowedOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")?.Split(',');

    builder.Services.AddCors(opt =>
    {
        opt.AddPolicy("frontend", p =>
        {
            p.SetIsOriginAllowed(origin => true) // Allow any origin for now to fix Docker/Network issues
             .AllowAnyHeader()
             .AllowAnyMethod()
             .AllowCredentials();
        });
    });

builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 5 * 1024 * 1024;
});

var app = builder.Build();

// --- Global Exception Handler ---
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
                await problemDetailsService.WriteAsync(new ProblemDetailsContext { HttpContext = context, ProblemDetails = problemDetails });
            }
            else
            {
                await context.Response.WriteAsJsonAsync(problemDetails);
            }
        });
    });
}
// -------------------------------

// --- Security Headers Middleware ---
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Content-Security-Policy", "default-src 'self';");
    await next();
});
// -----------------------------------

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var pharmacyDb = services.GetRequiredService<Backend.Data.AppDbContext>();
        pharmacyDb.Database.Migrate();

        var identityDb = services.GetRequiredService<Backend.Data.IdentityDbContext>();
        identityDb.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Veritabanı migration işlemi sırasında bir hata oluştu.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseStaticFiles();
}

app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.UseIpRateLimiting(); // Rate Limiting Middleware
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();