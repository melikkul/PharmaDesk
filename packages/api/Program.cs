using Backend.Data;
using Backend.Services;
using Backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Http.Features;
using System.Text;

var builder = WebApplication.CreateBuilder(args);


builder.WebHost.UseUrls(builder.Configuration["ASPNETCORE_URLS"] ?? "http://0.0.0.0:8081");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();

builder.Services.AddCors(opt =>
{
    opt.AddPolicy("frontend",
        p => p.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 5 * 1024 * 1024;
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var pharmacyDb = services.GetRequiredService<Backend.Data.AppDbContext>();
        pharmacyDb.Database.Migrate();

        var identityDb = services.GetRequiredService<Backend.Data.IdentityDbContext>();
        identityDb.Database.Migrate();

        // --- Admin Kullanıcısı Oluşturma (Seed) ---
        // İleride bu yorum satırlarını açtığınızda çalışacak kod:
        /*
        if (!identityDb.IdentityUsers.Any(u => u.Role == "Admin"))
        {
            identityDb.IdentityUsers.Add(new Backend.Models.IdentityUser {
                GLN = "9999999999999",
                Email = "admin@pharma.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                PharmacyName = "PharmaDesk HQ",
                Role = "Admin",
                CreatedAt = DateTime.UtcNow
            });
            identityDb.SaveChanges();
        }
        */
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

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();