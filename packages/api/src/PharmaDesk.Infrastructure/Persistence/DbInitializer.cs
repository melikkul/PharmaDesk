using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace PharmaDesk.Infrastructure.Persistence
{
    public static class DbInitializer
    {
        /// <summary>
        /// Initializes the database by applying migrations and seeding initial data
        /// </summary>
        public static async Task InitializeAsync(IServiceProvider services, ILogger logger)
        {
            try
            {
                logger.LogInformation("Applying database migrations...");
                
                // Apply migrations
                var pharmacyDb = services.GetRequiredService<AppDbContext>();
                await pharmacyDb.Database.MigrateAsync();
                logger.LogInformation("AppDbContext migrations applied successfully.");

                var identityDb = services.GetRequiredService<IdentityDbContext>();
                await identityDb.Database.MigrateAsync();
                logger.LogInformation("IdentityDbContext migrations applied successfully.");
                
                // Seed data
                var configuration = services.GetRequiredService<IConfiguration>();
                await SeedAdminAccountAsync(pharmacyDb, configuration, logger);
                await SeedMedicationsAsync(pharmacyDb, logger);
                await SeedInventoryAsync(pharmacyDb, logger);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred while applying database migrations or seeding data.");
                // Don't throw - allow app to start even if migrations fail
                // This prevents the container from crashing on startup
            }
        }

        /// <summary>
        /// Seeds the admin account from configuration or environment variables
        /// </summary>
        private static async Task SeedAdminAccountAsync(AppDbContext context, IConfiguration configuration, ILogger logger)
        {
            logger.LogInformation("Seeding admin account...");
            
            // Get admin configuration
            var adminEmail = configuration["AdminSeeding:Email"] ?? "melik_kul@outlook.com";
            var adminFirstName = configuration["AdminSeeding:FirstName"] ?? "Melik";
            var adminLastName = configuration["AdminSeeding:LastName"] ?? "Kul";
            
            // Get password from environment variable (security best practice)
            var adminPassword = Environment.GetEnvironmentVariable("ADMIN_DEFAULT_PASSWORD");
            if (string.IsNullOrWhiteSpace(adminPassword))
            {
                logger.LogWarning("ADMIN_DEFAULT_PASSWORD environment variable not set. Admin account will not be seeded.");
                return;
            }
            
            var existingAdmin = await context.Admins.FirstOrDefaultAsync(a => a.Email == adminEmail);
            
            if (existingAdmin == null)
            {
                // Create new admin
                var newAdmin = new Admin
                {
                    Email = adminEmail,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                    FirstName = adminFirstName,
                    LastName = adminLastName,
                    CreatedAt = DateTime.UtcNow
                };
                
                context.Admins.Add(newAdmin);
                await context.SaveChangesAsync();
                logger.LogInformation($"Admin account created: {adminEmail}");
            }
            else
            {
                // Update existing admin password
                existingAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
                existingAdmin.FirstName = adminFirstName;
                existingAdmin.LastName = adminLastName;
                await context.SaveChangesAsync();
                logger.LogInformation($"Admin account updated: {adminEmail}");
            }
        }

        /// <summary>
        /// Seeds medications from CSV file
        /// </summary>
        private static async Task SeedMedicationsAsync(AppDbContext context, ILogger logger)
        {
            logger.LogInformation("Seeding medications from CSV...");
            
            var medicationCount = await context.Medications.CountAsync();
            if (medicationCount == 0)
            {
                var csvPath = "/app/ilac_verileri.csv";
                var seededCount = await MedicationSeederService.SeedFromCsvAsync(context, csvPath, logger);
                logger.LogInformation($"Seeded {seededCount} medications from CSV");
            }
            else
            {
                logger.LogInformation($"Medications already seeded ({medicationCount} records), skipping CSV import");
            }
        }

        /// <summary>
        /// Seeds test inventory for pharmacy ID 2
        /// </summary>
        private static async Task SeedInventoryAsync(AppDbContext context, ILogger logger)
        {
            logger.LogInformation("Seeding inventory...");
            
            var testPharmacyId = 2; // melik_kul@outlook.com pharmacy
            var existingInventory = await context.InventoryItems
                .Where(i => i.PharmacyProfileId == testPharmacyId)
                .AnyAsync();
                
            if (!existingInventory)
            {
                var dolorex = await context.Medications.FirstOrDefaultAsync(m => m.Barcode == "8699514010019");
                var benical = await context.Medications.FirstOrDefaultAsync(m => m.Barcode == "8699546090011");
                var aspirin = await context.Medications.FirstOrDefaultAsync(m => m.Barcode == "1234567890123");
                
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
                    context.InventoryItems.AddRange(inventoryItems);
                    await context.SaveChangesAsync();
                    logger.LogInformation($"Seeded {inventoryItems.Count} inventory items for pharmacy {testPharmacyId}");
                }
            }
            else
            {
                logger.LogInformation("Inventory already seeded, skipping");
            }
        }
    }
}
