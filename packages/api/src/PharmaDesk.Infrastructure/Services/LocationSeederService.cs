using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace PharmaDesk.Infrastructure.Services
{
    /// <summary>
    /// Service for seeding City and District data from CSV file
    /// </summary>
    public static class LocationSeederService
    {
        /// <summary>
        /// Seeds cities and districts from il_ilce.csv file
        /// </summary>
        /// <param name="context">Database context</param>
        /// <param name="csvPath">Path to il_ilce.csv file</param>
        /// <param name="logger">Logger instance</param>
        /// <returns>Total number of districts seeded</returns>
        public static async Task<int> SeedFromCsvAsync(AppDbContext context, string csvPath, ILogger logger)
        {
            try
            {
                if (!File.Exists(csvPath))
                {
                    logger.LogWarning($"CSV file not found at path: {csvPath}");
                    return 0;
                }

                var cities = new Dictionary<string, City>();
                var lines = await File.ReadAllLinesAsync(csvPath);
                
                // Skip header row
                foreach (var line in lines.Skip(1))
                {
                    if (string.IsNullOrWhiteSpace(line)) continue;

                    var parts = line.Split(',');
                    if (parts.Length < 2)
                    {
                        logger.LogWarning($"Invalid CSV line format: {line}");
                        continue;
                    }

                    var cityName = parts[0].Trim();
                    var districtName = parts[1].Trim();

                    if (string.IsNullOrWhiteSpace(cityName) || string.IsNullOrWhiteSpace(districtName))
                    {
                        logger.LogWarning($"Empty city or district name in line: {line}");
                        continue;
                    }

                    // Create city if it doesn't exist
                    if (!cities.ContainsKey(cityName))
                    {
                        cities[cityName] = new City
                        {
                            Name = cityName,
                            PlateCode = null // Will be set later if needed
                        };
                    }

                    // Add district to city
                    cities[cityName].Districts.Add(new District
                    {
                        Name = districtName
                    });
                }

                // Save all cities and districts to database
                if (cities.Any())
                {
                    context.Cities.AddRange(cities.Values);
                    await context.SaveChangesAsync();
                    
                    var cityCount = cities.Count;
                    var districtCount = cities.Values.Sum(c => c.Districts.Count);
                    
                    logger.LogInformation($"Successfully seeded {cityCount} cities and {districtCount} districts from CSV");
                    return districtCount;
                }
                
                logger.LogWarning("No valid data found in CSV file");
                return 0;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred while seeding locations from CSV");
                throw;
            }
        }
    }
}
