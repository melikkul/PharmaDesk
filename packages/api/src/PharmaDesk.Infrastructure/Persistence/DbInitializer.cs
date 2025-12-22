using Backend.Data;
using Backend.Models;
using Backend.Services;
using PharmaDesk.Infrastructure.Services;
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
                logger.LogInformation("Creating database schema...");
                
                // Apply migrations
                var pharmacyDb = services.GetRequiredService<AppDbContext>();
                await pharmacyDb.Database.MigrateAsync();
                logger.LogInformation("AppDbContext migrations applied successfully.");
                
                // Ensure HasShippingService column exists (added after initial migrations)
                try
                {
                    await pharmacyDb.Database.ExecuteSqlRawAsync(@"
                        DO $$ 
                        BEGIN 
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns 
                                WHERE table_name = 'PharmacyProfiles' 
                                AND column_name = 'HasShippingService'
                            ) THEN 
                                ALTER TABLE ""PharmacyProfiles"" 
                                ADD COLUMN ""HasShippingService"" BOOLEAN NOT NULL DEFAULT FALSE;
                                RAISE NOTICE 'Added HasShippingService column to PharmacyProfiles';
                            END IF;
                        END $$;
                    ");
                    logger.LogInformation("HasShippingService column ensured in PharmacyProfiles.");
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Could not ensure HasShippingService column - may already exist");
                }

                // Ensure ImagePath column exists in Medications table
                try
                {
                    await pharmacyDb.Database.ExecuteSqlRawAsync(@"
                        DO $$ 
                        BEGIN 
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns 
                                WHERE table_name = 'Medications' 
                                AND column_name = 'ImagePath'
                            ) THEN 
                                ALTER TABLE ""Medications"" 
                                ADD COLUMN ""ImagePath"" VARCHAR(500) NULL;
                                RAISE NOTICE 'Added ImagePath column to Medications';
                            END IF;
                        END $$;
                    ");
                    logger.LogInformation("ImagePath column ensured in Medications.");
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Could not ensure ImagePath column - may already exist");
                }

                // Ensure ImageCount column exists in Medications table
                try
                {
                    await pharmacyDb.Database.ExecuteSqlRawAsync(@"
                        DO $$ 
                        BEGIN 
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns 
                                WHERE table_name = 'Medications' 
                                AND column_name = 'ImageCount'
                            ) THEN 
                                ALTER TABLE ""Medications"" 
                                ADD COLUMN ""ImageCount"" INTEGER NOT NULL DEFAULT 1;
                                RAISE NOTICE 'Added ImageCount column to Medications';
                            END IF;
                        END $$;
                    ");
                    logger.LogInformation("ImageCount column ensured in Medications.");
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Could not ensure ImageCount column - may already exist");
                }

                // Ensure AllImagePaths column exists in Medications table (for multi-image support)
                try
                {
                    await pharmacyDb.Database.ExecuteSqlRawAsync(@"
                        DO $$ 
                        BEGIN 
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns 
                                WHERE table_name = 'Medications' 
                                AND column_name = 'AllImagePaths'
                            ) THEN 
                                ALTER TABLE ""Medications"" 
                                ADD COLUMN ""AllImagePaths"" VARCHAR(2000) NULL;
                                RAISE NOTICE 'Added AllImagePaths column to Medications';
                            END IF;
                        END $$;
                    ");
                    logger.LogInformation("AllImagePaths column ensured in Medications.");
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Could not ensure AllImagePaths column - may already exist");
                }

                // Ensure StockLocks table exists (for checkout stock reservation)
                try
                {
                    await pharmacyDb.Database.ExecuteSqlRawAsync(@"
                        CREATE TABLE IF NOT EXISTS ""StockLocks"" (
                            ""Id"" SERIAL PRIMARY KEY,
                            ""OfferId"" INTEGER NOT NULL,
                            ""PharmacyProfileId"" BIGINT NOT NULL,
                            ""LockedQuantity"" INTEGER NOT NULL,
                            ""LockedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                            ""ExpiresAt"" TIMESTAMP WITH TIME ZONE NOT NULL,
                            CONSTRAINT ""FK_StockLocks_Offers"" FOREIGN KEY (""OfferId"") REFERENCES ""Offers""(""Id"") ON DELETE CASCADE,
                            CONSTRAINT ""FK_StockLocks_PharmacyProfiles"" FOREIGN KEY (""PharmacyProfileId"") REFERENCES ""PharmacyProfiles""(""Id"") ON DELETE CASCADE
                        );
                        CREATE INDEX IF NOT EXISTS ""IX_StockLocks_OfferId"" ON ""StockLocks""(""OfferId"");
                        CREATE INDEX IF NOT EXISTS ""IX_StockLocks_PharmacyProfileId"" ON ""StockLocks""(""PharmacyProfileId"");
                    ");
                    logger.LogInformation("StockLocks table ensured.");
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Could not ensure StockLocks table - may already exist");
                }

                var identityDb = services.GetRequiredService<IdentityDbContext>();
                // Fix: EnsureCreated skips if DB exists. We must manually ensure IdentityUsers table exists.
                var tableExists = false;
                try 
                {
                    // Check if table exists
                    await identityDb.Database.ExecuteSqlRawAsync("SELECT 1 FROM \"IdentityUsers\" LIMIT 1");
                    tableExists = true;
                }
                catch 
                {
                    tableExists = false;
                }

                if (!tableExists)
                {
                    logger.LogInformation("IdentityUsers table missing. Creating manually...");
                    await identityDb.Database.ExecuteSqlRawAsync(@"
                        CREATE TABLE ""IdentityUsers"" (
                            ""Id"" SERIAL PRIMARY KEY,
                            ""GLN"" VARCHAR(50) NOT NULL,
                            ""Email"" TEXT NOT NULL,
                            ""PasswordHash"" TEXT NOT NULL,
                            ""FirstName"" VARCHAR(50) NOT NULL,
                            ""LastName"" VARCHAR(50) NOT NULL,
                            ""PharmacyId"" BIGINT NOT NULL,
                            ""IsFirstLogin"" BOOLEAN NOT NULL DEFAULT TRUE,
                            ""IsApproved"" BOOLEAN NOT NULL DEFAULT TRUE,
                            ""Role"" TEXT,
                            ""LastLoginDate"" TIMESTAMP WITH TIME ZONE,
                            ""Status"" INTEGER NOT NULL DEFAULT 0,
                            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                            ""ResetToken"" TEXT,
                            ""ResetTokenExpires"" TIMESTAMP WITH TIME ZONE
                        );
                        CREATE UNIQUE INDEX ""IX_IdentityUsers_Email"" ON ""IdentityUsers"" (""Email"");
                    ");
                    logger.LogInformation("IdentityUsers table created manually.");
                }
                else
                {
                    logger.LogInformation("IdentityUsers table already exists.");
                }
                
                // Ensure RefreshTokens table exists
                try
                {
                    await identityDb.Database.ExecuteSqlRawAsync(@"
                        CREATE TABLE IF NOT EXISTS ""RefreshTokens"" (
                            ""Id"" SERIAL PRIMARY KEY,
                            ""UserId"" INTEGER NOT NULL,
                            ""TokenHash"" VARCHAR(88) NOT NULL,
                            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL,
                            ""ExpiresAt"" TIMESTAMP WITH TIME ZONE NOT NULL,
                            ""IsRevoked"" BOOLEAN NOT NULL DEFAULT FALSE,
                            ""RevokedAt"" TIMESTAMP WITH TIME ZONE,
                            ""ReplacedByTokenHash"" VARCHAR(88),
                            ""CreatedByIp"" VARCHAR(45),
                            ""RevokedByIp"" VARCHAR(45),
                            CONSTRAINT ""FK_RefreshTokens_IdentityUsers_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""IdentityUsers""(""Id"") ON DELETE CASCADE
                        );
                        CREATE INDEX IF NOT EXISTS ""IX_RefreshTokens_UserId"" ON ""RefreshTokens"" (""UserId"");
                        CREATE INDEX IF NOT EXISTS ""IX_RefreshTokens_TokenHash"" ON ""RefreshTokens"" (""TokenHash"");
                    ");
                    logger.LogInformation("RefreshTokens table ensured.");
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Could not ensure RefreshTokens table - may already exist");
                }

                // Ensure Role column exists in Admins table (for RBAC)
                try
                {
                    await pharmacyDb.Database.ExecuteSqlRawAsync(@"
                        DO $$ 
                        BEGIN 
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns 
                                WHERE table_name = 'Admins' 
                                AND column_name = 'Role'
                            ) THEN 
                                ALTER TABLE ""Admins"" 
                                ADD COLUMN ""Role"" VARCHAR(50) NOT NULL DEFAULT 'Admin';
                                RAISE NOTICE 'Added Role column to Admins';
                            END IF;
                        END $$;
                    ");
                    logger.LogInformation("Role column ensured in Admins table.");
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Could not ensure Role column in Admins - may already exist");
                }
               
                // Seed data
                var configuration = services.GetRequiredService<IConfiguration>();
                
                try
                {
                    await SeedLocationsAsync(pharmacyDb, logger);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Could not seed locations - skipping");
                }
                
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
                    Role = "SuperAdmin", // First admin gets SuperAdmin privileges
                    CreatedAt = DateTime.UtcNow
                };
                
                context.Admins.Add(newAdmin);
                await context.SaveChangesAsync();
                logger.LogInformation($"Admin account created: {adminEmail}");
            }
            else
            {
                // Update existing admin
                existingAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
                existingAdmin.FirstName = adminFirstName;
                existingAdmin.LastName = adminLastName;
                // Ensure melik_kul@outlook.com always has SuperAdmin role
                if (existingAdmin.Email == "melik_kul@outlook.com")
                {
                    existingAdmin.Role = "SuperAdmin";
                }
                await context.SaveChangesAsync();
                logger.LogInformation($"Admin account updated: {adminEmail} (Role: {existingAdmin.Role})");
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
                // Use the new CSV file with image paths
                var csvPath = "/app/ilac_arsivi_with_images.csv";
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
                        CostPrice = 28.0m,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                        // Note: RowVersion is auto-assigned by PostgreSQL xmin
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
                        CostPrice = 40.0m,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
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
                        CostPrice = 20.0m,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
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

        /// <summary>
        /// Seeds cities and districts from il_ilce.csv file
        /// </summary>
        private static async Task SeedLocationsAsync(AppDbContext context, ILogger logger)
        {
            logger.LogInformation("Seeding locations (cities and districts)...");
            
            var cityCount = await context.Cities.CountAsync();
            if (cityCount == 0)
            {
                var csvPath = "/app/il_ilce.csv";
                var seededCount = await LocationSeederService.SeedFromCsvAsync(context, csvPath, logger);
                logger.LogInformation($"Seeded {seededCount} districts from CSV");
            }
            else
            {
                logger.LogInformation($"Locations already seeded ({cityCount} cities), skipping CSV import");
            }
        }
    }
}
