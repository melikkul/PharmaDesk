using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text;

namespace Backend.Services
{
    /// <summary>
    /// İlaç verilerini CSV'den yükleyen seeder servisi.
    /// Yeni CSV formatı: Sira_ID, API_ID, Urun_Ismi, Urun_Barkodu, Muadil_Barkodlari, Gorsel_Path
    /// </summary>
    public static class MedicationSeederService
    {
        /// <summary>
        /// Yeni ilac_arsivi_with_images.csv formatından veri yükler
        /// CSV Columns: Sira_ID, API_ID, Urun_Ismi, Urun_Barkodu, Muadil_Barkodlari, Gorsel_Path
        /// </summary>
        public static async Task<int> SeedFromCsvAsync(AppDbContext context, string csvPath, ILogger logger)
        {
            try
            {
                if (!File.Exists(csvPath))
                {
                    logger.LogError($"CSV file not found: {csvPath}");
                    return 0;
                }

                logger.LogInformation($"Reading CSV file: {csvPath}");
                
                var medications = new List<Medication>();
                int totalRecords = 0;
                int successfulRecords = 0;
                
                using (var reader = new StreamReader(csvPath, new UTF8Encoding(false)))
                {
                    // Skip header line
                    var header = await reader.ReadLineAsync();
                    if (header != null && header.Length > 0)
                    {
                        logger.LogInformation($"CSV Header: {header}");
                        
                        // Validate header format
                        var expectedHeader = "Sira_ID,API_ID,Urun_Ismi,Urun_Barkodu,Muadil_Barkodlari,Gorsel_Path";
                        if (!header.StartsWith("Sira_ID"))
                        {
                            logger.LogWarning($"Unexpected CSV header format. Expected: {expectedHeader}");
                        }
                    }
                    
                    while (!reader.EndOfStream)
                    {
                        try
                        {
                            var record = await ReadCsvRecordAsync(reader);
                            if (record == null || record.Count < 3) continue;
                            
                            totalRecords++;
                            
                            // Parse fields
                            // Column 0: Sira_ID (will be used as Id)
                            // Column 1: API_ID (ExternalApiId - for Alliance Healthcare)
                            // Column 2: Urun_Ismi (Name)
                            // Column 3: Urun_Barkodu (Barcode) - optional
                            // Column 4: Muadil_Barkodlari (Alternatives JSON) - optional
                            // Column 5: Gorsel_Path (Image paths JSON array) - optional
                            
                            if (!int.TryParse(record[0].Trim(), out int siraId))
                            {
                                logger.LogDebug($"Skipping record {totalRecords}: Invalid Sira_ID '{record[0]}'");
                                continue;
                            }
                            
                            int? apiId = null;
                            if (record.Count > 1 && int.TryParse(record[1].Trim(), out int parsedApiId))
                            {
                                apiId = parsedApiId;
                            }
                            
                            var name = record.Count > 2 ? record[2].Trim() : string.Empty;
                            if (string.IsNullOrWhiteSpace(name))
                            {
                                logger.LogDebug($"Skipping record {totalRecords}: No name");
                                continue;
                            }
                            
                            var barcode = record.Count > 3 && !string.IsNullOrWhiteSpace(record[3]) 
                                ? TruncateString(record[3].Trim(), 100) 
                                : null;
                            
                            // Muadil_Barkodlari is already in JSON array format from Python scrapper
                            var alternatives = record.Count > 4 && !string.IsNullOrWhiteSpace(record[4]) 
                                ? TruncateString(record[4].Trim(), 2000) 
                                : null;
                            
                            // Parse Gorsel_Path JSON array and extract first image
                            var gorselPath = record.Count > 5 && !string.IsNullOrWhiteSpace(record[5])
                                ? record[5].Trim()
                                : null;
                            var imagePath = gorselPath != null ? ParseFirstImagePath(gorselPath) : null;
                            var imageCount = gorselPath != null ? ParseImageCount(gorselPath) : 1;
                            // Store the complete JSON array for AllImagePaths (cleaned)
                            var allImagePaths = gorselPath != null ? CleanImagePathsJson(gorselPath) : null;

                            // Use auto-generated ID, store CSV's Sira_ID in Description for reference
                            var medication = new Medication
                            {
                                // ID is auto-generated by EF/PostgreSQL
                                ExternalApiId = apiId ?? siraId, // Use API_ID if available, otherwise use Sira_ID
                                Name = TruncateString(name, 255),
                                Barcode = barcode,
                                Alternatives = alternatives,
                                ImagePath = imagePath, // Store first image path from JSON array
                                AllImagePaths = allImagePaths, // Store complete JSON array of image paths
                                ImageCount = imageCount, // Store number of images
                                ATC = $"ATC{successfulRecords + 1:D6}", // Use sequential ATC codes
                                PackageType = TruncateString(ExtractPackageType(name), 100),
                                Description = $"CSV_REF:{siraId}", // Store original Sira_ID for reference
                                BasePrice = 0.0m
                            };

                            medications.Add(medication);
                            successfulRecords++;

                            // Batch insert every 1000 records
                            if (medications.Count >= 1000)
                            {
                                context.Medications.AddRange(medications);
                                await context.SaveChangesAsync();
                                logger.LogInformation($"Seeded batch: {medications.Count} medications (Total: {successfulRecords}/{totalRecords})");
                                medications.Clear();
                            }
                        }
                        catch (Exception ex)
                        {
                            logger.LogWarning($"Failed to parse record {totalRecords}: {ex.Message}");
                            continue;
                        }
                    }
                    
                    logger.LogInformation($"Finished reading CSV. Total records processed: {totalRecords}, Successful: {successfulRecords}");
                }

                // Insert remaining medications
                if (medications.Any())
                {
                    context.Medications.AddRange(medications);
                    await context.SaveChangesAsync();
                    logger.LogInformation($"Seeded final batch: {medications.Count} medications");
                }

                var totalCount = await context.Medications.CountAsync();
                logger.LogInformation($"CSV seeding complete. Total records: {totalRecords}, Successful: {successfulRecords}, DB Count: {totalCount}");
                return totalCount;
            }
            catch (Exception ex)
            {
                logger.LogError($"Error seeding medications from CSV: {ex.Message}");
                throw;
            }
        }

        private static async Task<List<string>?> ReadCsvRecordAsync(StreamReader reader)
        {
            var fields = new List<string>();
            var currentField = new StringBuilder();
            bool inQuotes = false;
            bool recordComplete = false;

            while (!recordComplete && !reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (line == null) break;

                for (int i = 0; i < line.Length; i++)
                {
                    char c = line[i];

                    if (c == '"')
                    {
                        // Check for escaped quotes (double quotes)
                        if (i + 1 < line.Length && line[i + 1] == '"')
                        {
                            currentField.Append('"');
                            i++; // Skip next quote
                        }
                        else
                        {
                            // Toggle quote state
                            inQuotes = !inQuotes;
                        }
                    }
                    else if (c == ',' && !inQuotes)
                    {
                        // Field separator
                        fields.Add(currentField.ToString());
                        currentField.Clear();
                    }
                    else
                    {
                        currentField.Append(c);
                    }
                }

                // If we're in quotes, this was a multi-line field - add newline and continue
                if (inQuotes)
                {
                    currentField.Append('\n');
                }
                else
                {
                    // Record is complete
                    recordComplete = true;
                }
            }

            // Add the last field
            if (currentField.Length > 0 || fields.Count > 0)
            {
                fields.Add(currentField.ToString());
            }

            return fields.Count > 0 ? fields : null;
        }

        private static string ExtractPackageType(string medicationName)
        {
            // Extract package type from medication name (TABLET, KAPSUL, SURUP, etc.)
            var upperName = medicationName.ToUpper();
            
            if (upperName.Contains("TABLET")) return "Tablet";
            if (upperName.Contains("KAPSUL") || upperName.Contains("CAPSULE")) return "Kapsül";
            if (upperName.Contains("SURUP") || upperName.Contains("ŞURUP")) return "Şurup";
            if (upperName.Contains("AMPUL") || upperName.Contains("ENJEKSIY")) return "Ampul";
            if (upperName.Contains("FLAKON")) return "Flakon";
            if (upperName.Contains("KREM")) return "Krem";
            if (upperName.Contains("MERHEM")) return "Merhem";
            if (upperName.Contains("DAMLA")) return "Damla";
            if (upperName.Contains("JEL")) return "Jel";
            if (upperName.Contains("POMAD")) return "Pomad";
            
            return "Diğer";
        }

        private static string TruncateString(string value, int maxLength)
        {
            if (string.IsNullOrEmpty(value)) return value;
            return value.Length <= maxLength ? value : value.Substring(0, maxLength);
        }

        /// <summary>
        /// JSON array formatındaki görsel yollarından ilk görseli parse eder
        /// Örnek: ["images/24/1.png", "images/24/2.png"] -> "images/24/1.png"
        /// </summary>
        private static string? ParseFirstImagePath(string jsonPath)
        {
            try
            {
                // Remove whitespace and check format
                var trimmed = jsonPath.Trim();
                
                // Handle empty or "NOT_FOUND" cases
                if (string.IsNullOrWhiteSpace(trimmed) || trimmed == "NOT_FOUND" || trimmed == "[]")
                {
                    return null;
                }
                
                // Simple JSON array parsing - extract first path
                // Format: ["images/24/1.png", "images/24/2.png"]
                if (trimmed.StartsWith("[") && trimmed.Contains("\""))
                {
                    var startIndex = trimmed.IndexOf("\"") + 1;
                    var endIndex = trimmed.IndexOf("\"", startIndex);
                    
                    if (startIndex > 0 && endIndex > startIndex)
                    {
                        var firstPath = trimmed.Substring(startIndex, endIndex - startIndex);
                        return string.IsNullOrWhiteSpace(firstPath) ? null : firstPath;
                    }
                }
                
                return null;
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// JSON array formatındaki görsel yollarından görsel sayısını parse eder
        /// Örnek: ["images/24/1.png", "images/24/2.png"] -> 2
        /// </summary>
        private static int ParseImageCount(string jsonPath)
        {
            try
            {
                var trimmed = jsonPath.Trim();
                
                if (string.IsNullOrWhiteSpace(trimmed) || trimmed == "NOT_FOUND" || trimmed == "[]")
                {
                    return 1;
                }
                
                // Count commas + 1 = number of items (simple JSON array count)
                if (trimmed.StartsWith("[") && trimmed.EndsWith("]"))
                {
                    // Count occurrences of "images/" which indicates image entries
                    var count = trimmed.Split(new[] { "\"images/" }, StringSplitOptions.None).Length - 1;
                    return count > 0 ? Math.Min(count, 4) : 1; // Max 4 images
                }
                
                return 1;
            }
            catch
            {
                return 1;
            }
        }

        /// <summary>
        /// JSON array formatındaki görsel yollarını temizler ve standart formata çevirir
        /// Örnek: ["images/24/1.png", "images/24/2.png"] -> ["images/24/1.png","images/24/2.png"]
        /// Max 4 görsel döndürür
        /// </summary>
        private static string? CleanImagePathsJson(string jsonPath)
        {
            try
            {
                var trimmed = jsonPath.Trim();
                
                if (string.IsNullOrWhiteSpace(trimmed) || trimmed == "NOT_FOUND" || trimmed == "[]")
                {
                    return null;
                }
                
                // Extract image paths from JSON array
                if (trimmed.StartsWith("[") && trimmed.EndsWith("]"))
                {
                    var paths = new List<string>();
                    var content = trimmed.Substring(1, trimmed.Length - 2); // Remove [ ]
                    
                    // Simple parsing: split by ", " considering quotes
                    int start = 0;
                    bool inQuote = false;
                    
                    for (int i = 0; i < content.Length; i++)
                    {
                        char c = content[i];
                        if (c == '"' && (i == 0 || content[i - 1] != '\\'))
                        {
                            inQuote = !inQuote;
                        }
                        else if (c == ',' && !inQuote)
                        {
                            var path = ExtractPath(content.Substring(start, i - start));
                            if (!string.IsNullOrEmpty(path) && paths.Count < 4)
                            {
                                paths.Add(path);
                            }
                            start = i + 1;
                        }
                    }
                    
                    // Last item
                    var lastPath = ExtractPath(content.Substring(start));
                    if (!string.IsNullOrEmpty(lastPath) && paths.Count < 4)
                    {
                        paths.Add(lastPath);
                    }
                    
                    if (paths.Count > 0)
                    {
                        // Return as JSON array
                        return "[" + string.Join(",", paths.Select(p => $"\"{p}\"")) + "]";
                    }
                }
                
                return null;
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Tırnak içindeki path'i çıkarır
        /// </summary>
        private static string? ExtractPath(string segment)
        {
            var trimmed = segment.Trim();
            if (trimmed.StartsWith("\"") && trimmed.EndsWith("\""))
            {
                return trimmed.Substring(1, trimmed.Length - 2).Trim();
            }
            return trimmed.Length > 0 ? trimmed : null;
        }
    }
}
