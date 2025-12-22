using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;

namespace Backend.Controllers;

/// <summary>
/// Controller for server system metrics
/// </summary>
[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class SystemMetricsController : ControllerBase
{
    private readonly ILogger<SystemMetricsController> _logger;
    private static readonly Process CurrentProcess = Process.GetCurrentProcess();

    public SystemMetricsController(ILogger<SystemMetricsController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Get current server system metrics (CPU, RAM, Disk, Network)
    /// </summary>
    [HttpGet]
    public IActionResult GetSystemMetrics()
    {
        try
        {
            var metrics = new
            {
                timestamp = DateTime.UtcNow,
                cpu = GetCpuMetrics(),
                memory = GetMemoryMetrics(),
                disk = GetDiskMetrics(),
                network = GetNetworkMetrics(),
                process = GetProcessMetrics(),
                system = GetSystemInfo()
            };

            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get system metrics");
            return StatusCode(500, new { error = "Failed to get system metrics", details = ex.Message });
        }
    }

    private object GetCpuMetrics()
    {
        try
        {
            // Get process CPU time
            var processCpuTime = CurrentProcess.TotalProcessorTime.TotalMilliseconds;
            var processorCount = Environment.ProcessorCount;

            return new
            {
                processorCount,
                processUptime = (DateTime.Now - CurrentProcess.StartTime).TotalSeconds,
                processCpuTimeMs = processCpuTime
            };
        }
        catch
        {
            return new { error = "Could not retrieve CPU metrics" };
        }
    }

    private object GetMemoryMetrics()
    {
        try
        {
            // Process memory
            CurrentProcess.Refresh();
            var workingSet = CurrentProcess.WorkingSet64;
            var privateMemory = CurrentProcess.PrivateMemorySize64;
            var gcMemory = GC.GetTotalMemory(false);

            // Try to get system memory from /proc/meminfo on Linux
            long totalMemory = 0;
            long availableMemory = 0;
            double memoryUsagePercent = 0;

            if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            {
                try
                {
                    var memInfo = System.IO.File.ReadAllLines("/proc/meminfo");
                    foreach (var line in memInfo)
                    {
                        if (line.StartsWith("MemTotal:"))
                        {
                            totalMemory = ParseMemInfoValue(line) * 1024; // Convert KB to bytes
                        }
                        else if (line.StartsWith("MemAvailable:"))
                        {
                            availableMemory = ParseMemInfoValue(line) * 1024;
                        }
                    }
                    if (totalMemory > 0)
                    {
                        memoryUsagePercent = ((totalMemory - availableMemory) / (double)totalMemory) * 100;
                    }
                }
                catch { /* Ignore errors */ }
            }

            return new
            {
                processWorkingSetMb = workingSet / (1024 * 1024),
                processPrivateMemoryMb = privateMemory / (1024 * 1024),
                gcMemoryMb = gcMemory / (1024 * 1024),
                systemTotalMb = totalMemory / (1024 * 1024),
                systemAvailableMb = availableMemory / (1024 * 1024),
                systemUsagePercent = Math.Round(memoryUsagePercent, 1)
            };
        }
        catch
        {
            return new { error = "Could not retrieve memory metrics" };
        }
    }

    private static long ParseMemInfoValue(string line)
    {
        var parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2 && long.TryParse(parts[1], out var value))
        {
            return value;
        }
        return 0;
    }

    private object GetDiskMetrics()
    {
        try
        {
            var drives = DriveInfo.GetDrives()
                .Where(d => d.IsReady && d.DriveType == DriveType.Fixed)
                .Select(d => new
                {
                    name = d.Name,
                    label = d.VolumeLabel,
                    totalGb = Math.Round(d.TotalSize / (1024.0 * 1024 * 1024), 1),
                    freeGb = Math.Round(d.TotalFreeSpace / (1024.0 * 1024 * 1024), 1),
                    usedGb = Math.Round((d.TotalSize - d.TotalFreeSpace) / (1024.0 * 1024 * 1024), 1),
                    usagePercent = Math.Round(((d.TotalSize - d.TotalFreeSpace) / (double)d.TotalSize) * 100, 1)
                })
                .ToList();

            var primaryDrive = drives.FirstOrDefault();

            return new
            {
                drives,
                primaryUsagePercent = primaryDrive?.usagePercent ?? 0,
                primaryFreeGb = primaryDrive?.freeGb ?? 0,
                primaryTotalGb = primaryDrive?.totalGb ?? 0
            };
        }
        catch
        {
            return new { error = "Could not retrieve disk metrics" };
        }
    }

    private object GetNetworkMetrics()
    {
        try
        {
            var isConnected = NetworkInterface.GetIsNetworkAvailable();
            
            var interfaces = NetworkInterface.GetAllNetworkInterfaces()
                .Where(n => n.OperationalStatus == OperationalStatus.Up && 
                           n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                .Select(n => {
                    var stats = n.GetIPv4Statistics();
                    return new
                    {
                        name = n.Name,
                        type = n.NetworkInterfaceType.ToString(),
                        speed = n.Speed / 1_000_000, // Mbps
                        bytesSent = stats.BytesSent,
                        bytesReceived = stats.BytesReceived
                    };
                })
                .Take(3) // Limit to first 3 interfaces
                .ToList();

            return new
            {
                isConnected,
                interfaceCount = interfaces.Count,
                interfaces
            };
        }
        catch
        {
            return new { 
                isConnected = false,
                error = "Could not retrieve network metrics" 
            };
        }
    }

    private object GetProcessMetrics()
    {
        try
        {
            CurrentProcess.Refresh();
            return new
            {
                processId = CurrentProcess.Id,
                threadCount = CurrentProcess.Threads.Count,
                handleCount = CurrentProcess.HandleCount,
                startTime = CurrentProcess.StartTime,
                uptimeMinutes = Math.Round((DateTime.Now - CurrentProcess.StartTime).TotalMinutes, 1)
            };
        }
        catch
        {
            return new { error = "Could not retrieve process metrics" };
        }
    }

    private object GetSystemInfo()
    {
        return new
        {
            osDescription = RuntimeInformation.OSDescription,
            frameworkDescription = RuntimeInformation.FrameworkDescription,
            processorArchitecture = RuntimeInformation.ProcessArchitecture.ToString(),
            machineName = Environment.MachineName,
            isDocker = System.IO.File.Exists("/.dockerenv")
        };
    }
}
