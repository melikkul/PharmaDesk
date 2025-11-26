using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace Backend.Services
{
    public static class MedicationSeederService
    {
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
                int atcCounter = 1;
                int totalRecords = 0;
                int successfulRecords = 0;
                
                using (var reader = new StreamReader(csvPath, new UTF8Encoding(false))) // Detect BOM
                {
                    // Skip header line
                    var header = await reader.ReadLineAsync();
                    if (header != null && header.Length > 0)
                    {
                        logger.LogInformation($"CSV Header: {header.Substring(0, Math.Min(100, header.Length))}...");
                    }
                    
                    while (!reader.EndOfStream)
                    {
                        try
                        {
                            var record = await ReadCsvRecordAsync(reader);
                            if (record == null || record.Count < 1) continue;
                            
                            totalRecords++;
                            
                            // Skip if no name
                            if (string.IsNullOrWhiteSpace(record[0]))
                            {
                                logger.LogDebug($"Skipping record {totalRecords}: No name");
                                continue;
                            }

                            var medication = new Medication
                            {
                                Name = TruncateString(record[0].Trim(), 255),
                                Barcode = record.Count > 1 && !string.IsNullOrWhiteSpace(record[1]) 
                                    ? TruncateString(record[1].Trim(), 100) 
                                    : null,
                                Manufacturer = record.Count > 2 && !string.IsNullOrWhiteSpace(record[2])
                                    ? TruncateString(record[2].Trim(), 200)
                                    : null,
                                Description = record.Count > 3 ? TruncateString(record[3].Trim(), 1000) : null,
                                ATC = $"ATC{atcCounter:D6}",
                                PackageType = TruncateString(ExtractPackageType(record[0]), 100),
                                BasePrice = 0.0m
                            };

                            medications.Add(medication);
                            atcCounter++;
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
                    
                    logger.LogInformation($"Finished reading CSV. Total records processed: {totalRecords}, Successful: {successfulRecords}, EndOfStream: {reader.EndOfStream}");
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

        private static List<string> ParseCsvLine(string line)
        {
            var fields = new List<string>();
            var currentField = new StringBuilder();
            bool inQuotes = false;
            bool fieldStarted = false;

            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];

                if (c == '"')
                {
                    if (!fieldStarted)
                    {
                        // Starting a quoted field
                        inQuotes = true;
                        fieldStarted = true;
                    }
                    else if (inQuotes)
                    {
                        // Check if this is an escaped quote (double quote)
                        if (i + 1 < line.Length && line[i + 1] == '"')
                        {
                            currentField.Append('"');
                            i++; // Skip the next quote
                        }
                        else
                        {
                            // End of quoted field
                            inQuotes = false;
                        }
                    }
                    else
                    {
                        // Quote inside unquoted field - treat as normal char
                        currentField.Append(c);
                    }
                }
                else if (c == ',' && !inQuotes)
                {
                    // Field separator (not inside quotes)
                    fields.Add(currentField.ToString());
                    currentField.Clear();
                    fieldStarted = false;
                }
                else
                {
                    currentField.Append(c);
                    if (!fieldStarted) fieldStarted = true;
                }
            }

            // Add the last field
            fields.Add(currentField.ToString());
            return fields;
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
    }
}
