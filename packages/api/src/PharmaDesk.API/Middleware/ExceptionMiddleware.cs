using System.Net;
using System.Text.Json;

namespace PharmaDesk.API.Middleware
{
    /// <summary>
    /// Global Exception Handling Middleware
    /// Catches all unhandled exceptions and returns consistent error responses
    /// Logs errors using Serilog for centralized monitoring
    /// </summary>
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;
        private readonly IHostEnvironment _environment;

        public ExceptionMiddleware(
            RequestDelegate next,
            ILogger<ExceptionMiddleware> logger,
            IHostEnvironment environment)
        {
            _next = next;
            _logger = logger;
            _environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            // Log the exception with full details
            _logger.LogError(exception, 
                "Unhandled exception occurred. TraceId: {TraceId}, Path: {Path}, Method: {Method}",
                context.TraceIdentifier,
                context.Request.Path,
                context.Request.Method);

            // Determine status code and message based on exception type
            var (statusCode, errorCode, message) = exception switch
            {
                ArgumentNullException => (HttpStatusCode.BadRequest, "INVALID_ARGUMENT", "Geçersiz parametre."),
                ArgumentException => (HttpStatusCode.BadRequest, "INVALID_ARGUMENT", exception.Message),
                UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "UNAUTHORIZED", "Yetkisiz erişim."),
                KeyNotFoundException => (HttpStatusCode.NotFound, "NOT_FOUND", "Kayıt bulunamadı."),
                InvalidOperationException => (HttpStatusCode.BadRequest, "INVALID_OPERATION", exception.Message),
                OperationCanceledException => (HttpStatusCode.BadRequest, "OPERATION_CANCELLED", "İşlem iptal edildi."),
                _ => (HttpStatusCode.InternalServerError, "INTERNAL_ERROR", "Beklenmeyen bir hata oluştu.")
            };

            // Build error response
            var errorResponse = new ErrorResponse
            {
                Success = false,
                Error = new ErrorDetails
                {
                    Code = errorCode,
                    Message = message,
                    TraceId = context.TraceIdentifier
                }
            };

            // Include stack trace in development environment only
            if (_environment.IsDevelopment())
            {
                errorResponse.Error.Details = exception.ToString();
            }

            // Set response properties
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)statusCode;

            // Serialize and write response
            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = _environment.IsDevelopment()
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse, options));
        }
    }

    /// <summary>
    /// Standardized error response format
    /// </summary>
    public class ErrorResponse
    {
        public bool Success { get; set; }
        public ErrorDetails Error { get; set; } = null!;
    }

    /// <summary>
    /// Error details with code, message, and optional trace info
    /// </summary>
    public class ErrorDetails
    {
        public string Code { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? TraceId { get; set; }
        public string? Details { get; set; } // Only populated in Development
    }

    /// <summary>
    /// Extension method to register the middleware
    /// </summary>
    public static class ExceptionMiddlewareExtensions
    {
        public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
        {
            return app.UseMiddleware<ExceptionMiddleware>();
        }
    }
}
