using Backend.Data;
using Backend.Services;
using Backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Http.Features;
using System.Text;

using Microsoft.AspNetCore.Diagnostics;
using System.Net;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls(builder.Configuration["ASPNETCORE_URLS"] ?? "http://0.0.0.0:8081");

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();





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

// --- Auto-apply migrations on startup (for Docker) ---
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    
    try
    {
        logger.LogInformation("Applying database migrations...");
        
        var pharmacyDb = services.GetRequiredService<Backend.Data.AppDbContext>();
        pharmacyDb.Database.Migrate();
        logger.LogInformation("AppDbContext migrations applied successfully.");

        var identityDb = services.GetRequiredService<Backend.Data.IdentityDbContext>();
        identityDb.Database.Migrate();
        logger.LogInformation("IdentityDbContext migrations applied successfully.");
        
        // --- Seed hardcoded admin account ---
        logger.LogInformation("Seeding admin account...");
        var adminEmail = "melik_kul@outlook.com";
        var adminPassword = "melik123";
        
        var existingAdmin = await pharmacyDb.Admins.FirstOrDefaultAsync(a => a.Email == adminEmail);
        
        if (existingAdmin == null)
        {
            // Create new admin
            var newAdmin = new Admin
            {
                Email = adminEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                FirstName = "Melik",
                LastName = "Kul",
                CreatedAt = DateTime.UtcNow
            };
            
            pharmacyDb.Admins.Add(newAdmin);
            await pharmacyDb.SaveChangesAsync();
            logger.LogInformation($"Admin account created: {adminEmail}");
        }
        else
        {
            // Update existing admin password (in case it was changed)
            existingAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
            existingAdmin.FirstName = "Melik";
            existingAdmin.LastName = "Kul";
            await pharmacyDb.SaveChangesAsync();
            logger.LogInformation($"Admin account updated: {adminEmail}");
        }
        
        // --- Seed medications from CSV ---
        logger.LogInformation("Seeding medications from CSV...");
        
        var medicationCount = await pharmacyDb.Medications.CountAsync();
        if (medicationCount == 0)
        {
            var csvPath = "/app/ilac_verileri.csv";
            var seededCount = await MedicationSeederService.SeedFromCsvAsync(pharmacyDb, csvPath, logger);
            logger.LogInformation($"Seeded {seededCount} medications from CSV");
        }
        else
        {
            logger.LogInformation($"Medications already seeded ({medicationCount} records), skipping CSV import");
        }
        
        // --- Seed test inventory for PharmacyId=2 (melik_kul@outlook.com) ---
        logger.LogInformation("Seeding inventory...");
        
        var testPharmacyId = 2; // melik_kul@outlook.com pharmacy
        var existingInventory = await pharmacyDb.InventoryItems
            .Where(i => i.PharmacyProfileId == testPharmacyId)
            .AnyAsync();
            
        if (!existingInventory)
        {
            var dolorex = await pharmacyDb.Medications.FirstOrDefaultAsync(m => m.Barcode == "8699514010019");
            var benical = await pharmacyDb.Medications.FirstOrDefaultAsync(m => m.Barcode == "8699546090011");
            var aspirin = await pharmacyDb.Medications.FirstOrDefaultAsync(m => m.Barcode == "1234567890123");
            
            var inventoryItems = new List<InventoryItem>();
            
            if (dolorex != null)
            {
                inventoryItems.Add(new InventoryItem
                {
                    PharmacyProfileId = testPharmacyId,
                    MedicationId = dolorex.Id,
                    Quantity = 500,
                    ExpiryDate = DateTime.SpecifyKind(new DateTime(2028, 1, 31), DateTimeKind.Utc),
                    BatchNumber = "BATCH001",
                    CostPrice = 28.0m
                });
            }
            
            if (benical != null)
            {
                inventoryItems.Add(new InventoryItem
                {
                    PharmacyProfileId = testPharmacyId,
                    MedicationId = benical.Id,
                    Quantity = 300,
                    ExpiryDate = DateTime.SpecifyKind(new DateTime(2025, 10, 31), DateTimeKind.Utc),
                    BatchNumber = "BATCH002",
                    CostPrice = 40.0m
                });
            }
            
            if (aspirin != null)
            {
                inventoryItems.Add(new InventoryItem
                {
                    PharmacyProfileId = testPharmacyId,
                    MedicationId = aspirin.Id,
                    Quantity = 200,
                    ExpiryDate = DateTime.SpecifyKind(new DateTime(2026, 6, 30), DateTimeKind.Utc),
                    BatchNumber = "BATCH003",
                    CostPrice = 20.0m
                });
            }
            
            if (inventoryItems.Any())
            {
                pharmacyDb.InventoryItems.AddRange(inventoryItems);
                await pharmacyDb.SaveChangesAsync();
                logger.LogInformation($"Seeded {inventoryItems.Count} inventory items for pharmacy {testPharmacyId}");
            }
        }
        else
        {
            logger.LogInformation("Inventory already seeded, skipping");
        }
        // ------------------------------------
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while applying database migrations or seeding admin.");
        // Don't throw - allow app to start even if migrations fail
        // This prevents the container from crashing on startup
    }
}
// ------------------------------------------------------

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseStaticFiles();
}

app.MapGet("/health", () => Results.Ok(new { ok = true }));


app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();