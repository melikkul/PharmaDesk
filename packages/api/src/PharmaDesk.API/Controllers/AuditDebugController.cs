using System.Text.Json;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmaDesk.API.Services;

namespace Backend.Controllers
{
    /// <summary>
    /// Admin Audit & Debug Controller for Full Stack Traceability.
    /// Provides endpoints for viewing, filtering, and managing audit logs
    /// with session replay capabilities.
    /// </summary>
    [ApiController]
    [Route("api/admin/audit")]
    [Authorize(Roles = "SuperAdmin")]
    public class AuditDebugController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<AuditDebugController> _logger;

        public AuditDebugController(AppDbContext db, ILogger<AuditDebugController> logger)
        {
            _db = db;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════
        // GET: Paginated Audit Logs with Filtering
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Get paginated audit logs with comprehensive filtering options
        /// </summary>
        [HttpGet("logs")]
        public async Task<IActionResult> GetLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string? traceId = null,
            [FromQuery] string? userId = null,
            [FromQuery] string? logType = null,
            [FromQuery] string? action = null,
            [FromQuery] string? search = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] bool? hasErrors = null,
            [FromQuery] bool excludeAdminUsers = false,
            [FromQuery] string? excludeUserEmail = null)
        {
            var query = _db.AuditLogs.AsNoTracking().AsQueryable();

            // Exclude admin panel requests if requested
            if (excludeAdminUsers)
            {
                query = query.Where(a => 
                    !a.RequestPath!.StartsWith("/api/admin") && 
                    !a.RequestPath!.Contains("/admin/") &&
                    a.LogType != "AdminAction");
            }

            // Exclude specific user by email (for hiding admin user from Mission Control)
            if (!string.IsNullOrEmpty(excludeUserEmail))
            {
                query = query.Where(a => a.UserName != excludeUserEmail);
            }

            // Apply filters
            if (!string.IsNullOrEmpty(traceId))
                query = query.Where(a => a.TraceId == traceId);

            if (!string.IsNullOrEmpty(userId) && long.TryParse(userId, out var uid))
                query = query.Where(a => a.UserId == uid);

            if (!string.IsNullOrEmpty(logType))
                query = query.Where(a => a.LogType == logType);

            if (!string.IsNullOrEmpty(action))
                query = query.Where(a => a.Action == action);

            if (startDate.HasValue)
                query = query.Where(a => a.Timestamp >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(a => a.Timestamp <= endDate.Value);

            if (hasErrors == true)
                query = query.Where(a => !a.IsSuccess || a.HttpStatusCode >= 400);

            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(a =>
                    (a.RequestPath != null && a.RequestPath.ToLower().Contains(searchLower)) ||
                    (a.EntityName != null && a.EntityName.ToLower().Contains(searchLower)) ||
                    (a.UserName != null && a.UserName.ToLower().Contains(searchLower)) ||
                    (a.ErrorMessage != null && a.ErrorMessage.ToLower().Contains(searchLower)));
            }

            var totalCount = await query.CountAsync();

            var logs = await query
                .OrderByDescending(a => a.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.TraceId,
                    a.SessionId, // Added for better trace linking
                    a.Timestamp,
                    a.Action,
                    a.EntityName,
                    a.LogType,
                    a.HttpMethod,
                    a.RequestPath,
                    a.HttpStatusCode,
                    a.DurationMs,
                    a.IsSuccess,
                    a.UserId,
                    a.UserName,
                    a.IpAddress,
                    a.ClientLogs, // Add ClientLogs for browser console display
                    HasClientLogs = a.ClientLogs != null,
                    HasServerLogs = a.ServerLogs != null,
                    ErrorPreview = a.ErrorMessage != null ? a.ErrorMessage.Substring(0, Math.Min(100, a.ErrorMessage.Length)) : null
                })
                .ToListAsync();

            return Ok(new
            {
                data = logs,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // GET: Full Trace Timeline (Session Replay)
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Get complete trace timeline for session replay view
        /// Returns all logs with the given TraceId in chronological order
        /// </summary>
        [HttpGet("logs/{traceId}")]
        public async Task<IActionResult> GetTraceTimeline(string traceId)
        {
            var logs = await _db.AuditLogs
                .AsNoTracking()
                .Where(a => a.TraceId == traceId)
                .OrderBy(a => a.Timestamp)
                .ToListAsync();

            if (!logs.Any())
            {
                return NotFound(new { error = "TraceId bulunamadı." });
            }

            // Build timeline
            var timeline = logs.Select(a => new
            {
                a.Id,
                a.Timestamp,
                a.Action,
                a.EntityName,
                a.EntityId,
                a.LogType,
                a.HttpMethod,
                a.RequestPath,
                a.HttpStatusCode,
                a.DurationMs,
                a.IsSuccess,
                a.ErrorMessage,
                a.UserId,
                a.UserName,
                a.IpAddress,
                a.UserAgent,
                ClientLogs = ParseJsonSafe(a.ClientLogs),
                ServerLogs = ParseJsonSafe(a.ServerLogs),
                PerformanceMetrics = ParseJsonSafe(a.PerformanceMetrics),
                ClientMetadata = ParseJsonSafe(a.ClientMetadata),
                OldValues = ParseJsonSafe(a.OldValues),
                NewValues = ParseJsonSafe(a.NewValues),
                a.ChangedProperties
            }).ToList();

            // Summary stats
            var firstLog = logs.First();
            var lastLog = logs.Last();

            return Ok(new
            {
                traceId,
                sessionDurationMs = (lastLog.Timestamp - firstLog.Timestamp).TotalMilliseconds,
                startTime = firstLog.Timestamp,
                endTime = lastLog.Timestamp,
                totalEvents = logs.Count,
                errorCount = logs.Count(l => !l.IsSuccess || l.HttpStatusCode >= 400),
                user = new
                {
                    userId = firstLog.UserId,
                    userName = firstLog.UserName,
                    ipAddress = firstLog.IpAddress
                },
                clientMetadata = ParseJsonSafe(logs.FirstOrDefault(l => l.ClientMetadata != null)?.ClientMetadata),
                timeline
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // POST: Receive Client-Side Logs
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Receive console logs, errors, and events from frontend
        /// Uses sendBeacon fallback pattern
        /// </summary>
        [HttpPost("client-logs")]
        [AllowAnonymous] // Allow unauthenticated users to send error logs
        public async Task<IActionResult> ReceiveClientLogs([FromBody] ClientLogPayload payload)
        {
            if (payload?.Logs == null || !payload.Logs.Any())
            {
                return BadRequest(new { error = "No logs provided" });
            }

            try
            {
                // Get correlation ID from header if not in payload
                var traceId = payload.TraceId
                    ?? Request.Headers["X-Correlation-ID"].FirstOrDefault()
                    ?? Guid.NewGuid().ToString("N")[..32];

                // Serialize logs as-is (masking can be done if needed)
                var logsJson = JsonSerializer.Serialize(payload.Logs);
                var metadataJson = payload.Metadata.HasValue ? JsonSerializer.Serialize(payload.Metadata.Value) : null;

                // Create or update audit log entry
                var existingLog = await _db.AuditLogs
                    .FirstOrDefaultAsync(a => a.TraceId == traceId && a.LogType == "ClientSession");

                if (existingLog != null)
                {
                    // Append to existing client logs
                    var existingLogsArray = JsonSerializer.Deserialize<List<JsonElement>>(existingLog.ClientLogs ?? "[]");
                    existingLogsArray?.AddRange(payload.Logs);
                    existingLog.ClientLogs = JsonSerializer.Serialize(existingLogsArray);
                    existingLog.Timestamp = DateTime.UtcNow; // Update timestamp
                }
                else
                {
                    // Create new audit log entry
                    var auditLog = new AuditLog
                    {
                        TraceId = traceId,
                        SessionId = payload.SessionId,
                        Action = "ClientLog",
                        EntityName = "Browser",
                        LogType = "ClientSession",
                        ClientLogs = logsJson,
                        ClientMetadata = metadataJson,
                        IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
                        UserAgent = Request.Headers["User-Agent"].FirstOrDefault(),
                        Timestamp = DateTime.UtcNow,
                        IsSuccess = true
                    };

                    // Check for error logs by looking at level property
                    var hasErrors = payload.Logs.Any(log =>
                    {
                        if (log.TryGetProperty("level", out var levelProp))
                        {
                            return levelProp.GetString() == "error";
                        }
                        return false;
                    });

                    if (hasErrors)
                    {
                        auditLog.LogType = "ClientError";
                        auditLog.IsSuccess = false;
                    }

                    _db.AuditLogs.Add(auditLog);
                }

                await _db.SaveChangesAsync();

                return Ok(new { received = payload.Logs.Count, traceId });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to process client logs");
                return StatusCode(500, new { error = "Failed to process logs" });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // DELETE: Cleanup Old Logs (Retention Policy)
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Manual cleanup of old logs based on retention policy
        /// </summary>
        [HttpDelete("cleanup")]
        public async Task<IActionResult> CleanupLogs(
            [FromQuery] int daysToKeep = 7,
            [FromQuery] int maxLogCount = 10000)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-daysToKeep);

            // Delete logs older than cutoff date
            var deletedByDate = await _db.AuditLogs
                .Where(a => a.Timestamp < cutoffDate)
                .ExecuteDeleteAsync();

            _logger.LogInformation("Deleted {Count} audit logs older than {Date}", deletedByDate, cutoffDate);

            // If still over max count, delete oldest logs
            var currentCount = await _db.AuditLogs.CountAsync();
            var deletedByCount = 0;

            if (currentCount > maxLogCount)
            {
                var toDelete = currentCount - maxLogCount;
                deletedByCount = await _db.AuditLogs
                    .OrderBy(a => a.Timestamp)
                    .Take(toDelete)
                    .ExecuteDeleteAsync();

                _logger.LogInformation("Deleted {Count} additional logs to maintain max count of {Max}",
                    deletedByCount, maxLogCount);
            }

            return Ok(new
            {
                message = "Cleanup completed",
                deletedByAge = deletedByDate,
                deletedByCount,
                remainingLogs = await _db.AuditLogs.CountAsync()
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // GET: Log Statistics
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Get audit log statistics for dashboard
        /// </summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var today = DateTime.UtcNow.Date;
            var last24Hours = DateTime.UtcNow.AddHours(-24);
            var last7Days = DateTime.UtcNow.AddDays(-7);

            var stats = new
            {
                totalLogs = await _db.AuditLogs.CountAsync(),
                logsToday = await _db.AuditLogs.CountAsync(a => a.Timestamp >= today),
                logsLast24h = await _db.AuditLogs.CountAsync(a => a.Timestamp >= last24Hours),
                errorsLast24h = await _db.AuditLogs.CountAsync(a => a.Timestamp >= last24Hours && !a.IsSuccess),
                clientErrorsLast24h = await _db.AuditLogs.CountAsync(a => a.Timestamp >= last24Hours && a.LogType == "ClientError"),
                uniqueUsersLast7d = await _db.AuditLogs
                    .Where(a => a.Timestamp >= last7Days && a.UserId != null)
                    .Select(a => a.UserId)
                    .Distinct()
                    .CountAsync(),
                avgRequestDurationMs = await _db.AuditLogs
                    .Where(a => a.Timestamp >= last24Hours && a.DurationMs != null)
                    .AverageAsync(a => (double?)a.DurationMs) ?? 0,
                topErrorPaths = await _db.AuditLogs
                    .Where(a => a.Timestamp >= last7Days && !a.IsSuccess && a.RequestPath != null)
                    .GroupBy(a => a.RequestPath)
                    .Select(g => new { path = g.Key, count = g.Count() })
                    .OrderByDescending(x => x.count)
                    .Take(5)
                    .ToListAsync()
            };

            return Ok(stats);
        }

        // ═══════════════════════════════════════════════════════════════
        // GET: Log Types & Actions (for filter dropdowns)
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Get distinct log types and actions for filter dropdowns
        /// </summary>
        [HttpGet("filter-options")]
        public async Task<IActionResult> GetFilterOptions()
        {
            var logTypes = await _db.AuditLogs
                .Where(a => a.LogType != null)
                .Select(a => a.LogType)
                .Distinct()
                .ToListAsync();

            var actions = await _db.AuditLogs
                .Where(a => a.Action != null)
                .Select(a => a.Action)
                .Distinct()
                .Take(50)
                .ToListAsync();

            return Ok(new { logTypes, actions });
        }

        // ═══════════════════════════════════════════════════════════════
        // Helper: Parse JSON safely
        // ═══════════════════════════════════════════════════════════════

        private static object? ParseJsonSafe(string? json)
        {
            if (string.IsNullOrEmpty(json))
                return null;

            try
            {
                return JsonSerializer.Deserialize<object>(json);
            }
            catch
            {
                return json;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DTOs
    // ═══════════════════════════════════════════════════════════════

    public class ClientLogPayload
    {
        public string? TraceId { get; set; }
        public string? SessionId { get; set; }
        public List<JsonElement>? Logs { get; set; }
        public JsonElement? Metadata { get; set; }
    }
}
