using Backend.Data;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);


builder.WebHost.UseUrls(builder.Configuration["ASPNETCORE_URLS"] ?? "http://0.0.0.0:8081");

// services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// db
string? databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
string connString;

if (!string.IsNullOrWhiteSpace(databaseUrl))
{
    // format: postgresql://user:pass@host:port/dbname[?params]
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

// services
builder.Services.AddScoped<AuthService>();

// auth
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

// cors
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("frontend",
        p => p.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

// auto migrate
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
