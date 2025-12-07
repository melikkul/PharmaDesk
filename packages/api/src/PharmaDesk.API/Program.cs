using PharmaDesk.API.Extensions;
using Serilog;

// Configure Serilog early (bootstrap logger)
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

Log.Information("Starting PharmaDesk API...");

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Add Serilog
    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext());

    // Configure URL binding
    builder.WebHost.UseUrls(builder.Configuration["ASPNETCORE_URLS"] ?? "http://0.0.0.0:8081");

    // Add services
    builder.Services.AddControllers().ConfigureJsonOptions();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();
    builder.Services.AddProblemDetails();

    // Infrastructure services
    builder.Services.AddDatabaseContexts(builder.Configuration);
    builder.Services.AddJwtAuthentication(builder.Configuration);
    builder.Services.AddCorsPolicy();
    builder.Services.AddApplicationServices(builder.Configuration);
    builder.Services.AddHealthChecksConfiguration(builder.Configuration);

    var app = builder.Build();

    // Add Serilog request logging
    app.UseSerilogRequestLogging();

    // Initialize database (migrations and seeding)
    await app.Services.InitializeDatabaseAsync();

    // Configure middleware pipeline
    app.ConfigureExceptionHandler();
    app.ConfigureSecurityHeaders();
    app.ConfigurePipeline();

    Log.Information("PharmaDesk API started successfully");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "PharmaDesk API failed to start");
    throw;
}
finally
{
    Log.CloseAndFlush();
}