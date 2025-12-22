using System.Net.Http;
using System.Net.Sockets;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    /// <summary>
    /// Controller for accessing Docker container logs from Mission Control.
    /// Uses Docker HTTP API via Unix socket (no Docker CLI required).
    /// </summary>
    [ApiController]
    [Route("api/admin/docker")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class DockerLogsController : ControllerBase
    {
        private readonly ILogger<DockerLogsController> _logger;
        private readonly HttpClient _dockerClient;
        
        // Container names from docker-compose
        private static readonly HashSet<string> AllowedContainers = new(StringComparer.OrdinalIgnoreCase)
        {
            "pharma_desk_backend",
            "pharma_desk_frontend_web",
            "pharma_desk_frontend_admin",
            "pharma_desk_frontend_cargo",
            "pharma_desk_db",
            "pharma_desk_scrapper"
        };

        public DockerLogsController(ILogger<DockerLogsController> logger)
        {
            _logger = logger;
            
            // Create HttpClient that connects via Unix socket
            var handler = new SocketsHttpHandler
            {
                ConnectCallback = async (context, cancellationToken) =>
                {
                    var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
                    var endpoint = new UnixDomainSocketEndPoint("/var/run/docker.sock");
                    await socket.ConnectAsync(endpoint, cancellationToken);
                    return new NetworkStream(socket, ownsSocket: true);
                }
            };
            
            _dockerClient = new HttpClient(handler)
            {
                BaseAddress = new Uri("http://localhost"),
                Timeout = TimeSpan.FromSeconds(30)
            };
        }

        /// <summary>
        /// Get list of available Docker containers
        /// </summary>
        [HttpGet("containers")]
        public async Task<IActionResult> GetContainers()
        {
            try
            {
                var response = await _dockerClient.GetAsync("/containers/json?all=true");
                
                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode(500, new { error = "Failed to list containers" });
                }

                var content = await response.Content.ReadAsStringAsync();
                var containers = JsonSerializer.Deserialize<JsonElement[]>(content);
                
                var result = new List<object>();
                
                if (containers != null)
                {
                    foreach (var container in containers)
                    {
                        if (container.TryGetProperty("Names", out var names))
                        {
                            var nameArray = names.EnumerateArray().ToList();
                            if (nameArray.Count > 0)
                            {
                                var name = nameArray[0].GetString()?.TrimStart('/') ?? "";
                                
                                if (AllowedContainers.Contains(name))
                                {
                                    var state = container.TryGetProperty("State", out var s) ? s.GetString() : "unknown";
                                    
                                    result.Add(new
                                    {
                                        name,
                                        displayName = name.Replace("pharma_desk_", "").Replace("_", " ").ToUpperInvariant(),
                                        state
                                    });
                                }
                            }
                        }
                    }
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to list Docker containers");
                return StatusCode(500, new { error = "Failed to connect to Docker socket", details = ex.Message });
            }
        }

        /// <summary>
        /// Get logs from a specific Docker container
        /// </summary>
        /// <param name="containerName">Name of the container (e.g., pharma_desk_backend)</param>
        /// <param name="tail">Number of lines to return (default: 100)</param>
        /// <param name="since">Return logs since this timestamp (Unix epoch seconds)</param>
        /// <param name="search">Filter logs containing this text</param>
        [HttpGet("logs/{containerName}")]
        public async Task<IActionResult> GetContainerLogs(
            string containerName,
            [FromQuery] int tail = 100,
            [FromQuery] string? since = null,
            [FromQuery] string? search = null)
        {
            // Security: Only allow specific containers
            if (!AllowedContainers.Contains(containerName))
            {
                return BadRequest(new { error = $"Container '{containerName}' is not allowed" });
            }

            try
            {
                // Build Docker API URL for logs
                var url = $"/containers/{containerName}/logs?stdout=true&stderr=true&tail={Math.Min(tail, 500)}&timestamps=true";
                
                if (!string.IsNullOrEmpty(since))
                {
                    url += $"&since={since}";
                }

                var response = await _dockerClient.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Docker logs request failed: {Status} - {Error}", response.StatusCode, errorContent);
                    return StatusCode((int)response.StatusCode, new { error = $"Docker API returned {response.StatusCode}", details = errorContent });
                }

                var rawLogs = await response.Content.ReadAsByteArrayAsync();
                
                // Parse Docker log stream format (8-byte header per line)
                var parsedLogs = ParseDockerLogStream(rawLogs, search);

                return Ok(new
                {
                    container = containerName,
                    logCount = parsedLogs.Count,
                    logs = parsedLogs
                });
            }
            catch (SocketException ex)
            {
                _logger.LogError(ex, "Docker socket connection failed");
                return StatusCode(500, new { error = "Docker socket not accessible", details = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading logs for container {Container}", containerName);
                return StatusCode(500, new { error = "Failed to read container logs", details = ex.Message });
            }
        }

        /// <summary>
        /// Parse Docker log stream format (multiplexed stdout/stderr)
        /// Each frame: [8-byte header][payload]
        /// Header: [1 byte stream type][3 bytes padding][4 bytes payload size (big-endian)]
        /// </summary>
        private List<DockerLogEntry> ParseDockerLogStream(byte[] data, string? searchFilter)
        {
            var entries = new List<DockerLogEntry>();
            var offset = 0;

            while (offset + 8 <= data.Length)
            {
                // Read header
                var streamType = data[offset]; // 1=stdout, 2=stderr
                var payloadSize = (data[offset + 4] << 24) | (data[offset + 5] << 16) | (data[offset + 6] << 8) | data[offset + 7];
                
                offset += 8;

                if (offset + payloadSize > data.Length)
                    break;

                // Read payload
                var payload = System.Text.Encoding.UTF8.GetString(data, offset, payloadSize).Trim();
                offset += payloadSize;

                if (string.IsNullOrWhiteSpace(payload))
                    continue;

                // Apply search filter
                if (!string.IsNullOrEmpty(searchFilter) &&
                    !payload.Contains(searchFilter, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                // Parse timestamp from log line (format: 2024-01-15T10:30:45.123456789Z message)
                var timestampMatch = Regex.Match(payload, @"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\.\d]*Z?)\s*(.*)$");
                string timestamp;
                string message;

                if (timestampMatch.Success)
                {
                    timestamp = timestampMatch.Groups[1].Value;
                    message = timestampMatch.Groups[2].Value.Trim();
                }
                else
                {
                    timestamp = DateTime.UtcNow.ToString("o");
                    message = payload;
                }

                // Determine log level
                var level = DetermineLogLevel(message, streamType);

                entries.Add(new DockerLogEntry
                {
                    Timestamp = timestamp,
                    Level = level,
                    Message = message
                });
            }

            return entries;
        }

        private string DetermineLogLevel(string message, byte streamType)
        {
            // stderr is typically errors
            if (streamType == 2)
                return "error";
            
            var lowerMessage = message.ToLowerInvariant();
            
            if (lowerMessage.Contains("error") || lowerMessage.Contains("exception") || 
                lowerMessage.Contains("fail") || lowerMessage.Contains("critical"))
                return "error";
            
            if (lowerMessage.Contains("warn"))
                return "warn";
            
            if (lowerMessage.Contains("debug") || lowerMessage.Contains("trace"))
                return "debug";
            
            if (lowerMessage.Contains("info"))
                return "info";
            
            return "log";
        }
    }

    public class DockerLogEntry
    {
        public string Timestamp { get; set; } = "";
        public string Level { get; set; } = "log";
        public string Message { get; set; } = "";
        public string? Container { get; set; }
    }
}
