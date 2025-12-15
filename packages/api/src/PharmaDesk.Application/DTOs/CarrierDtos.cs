namespace Backend.Dtos
{
    // --- LOGIN ---
    public class CarrierLoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class CarrierLoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public CarrierUserResponse User { get; set; } = new();
    }

    public class CarrierUserResponse
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? CompanyName { get; set; }
        public string? VehicleInfo { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // --- REGISTRATION ---
    public class CarrierRegisterRequest
    {
        public string Token { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? CompanyName { get; set; }
        public string? VehicleInfo { get; set; }
    }

    public class CarrierRegisterResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    // --- REGISTRATION TOKEN ---
    public class CreateCarrierTokenRequest
    {
        public string Email { get; set; } = string.Empty;
        public int ExpiresInDays { get; set; } = 7; // Default 7 days
    }

    public class CarrierTokenResponse
    {
        public string Token { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string RegistrationLink { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

    public class ValidateTokenResponse
    {
        public bool IsValid { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
    }

    // --- ADMIN DTOs ---
    public class AdminCarrierDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime? LastLoginDate { get; set; }
        public List<GroupDto> Groups { get; set; } = new();
    }

    public class CreateCarrierDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public string Username { get; set; } = string.Empty;
        [System.ComponentModel.DataAnnotations.Required]
        public string Password { get; set; } = string.Empty;
        [System.ComponentModel.DataAnnotations.Required]
        public string FirstName { get; set; } = string.Empty;
        [System.ComponentModel.DataAnnotations.Required]
        public string LastName { get; set; } = string.Empty;
        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.EmailAddress]
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public List<int> GroupIds { get; set; } = new();
    }

    public class UpdateCarrierDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? VehicleInfo { get; set; }
        public List<int> GroupIds { get; set; } = new();
        public bool IsActive { get; set; }
    }

    public class GroupDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    // --- SHIFT DTOs ---
    public class ShiftStatusResponse
    {
        public bool IsOnShift { get; set; }
        public int? ShiftId { get; set; }
        public DateTime? StartTime { get; set; }
        public int DurationMinutes { get; set; }
        public string DurationFormatted { get; set; } = string.Empty;
    }

    public class StartShiftRequest
    {
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }

    public class StartShiftResponse
    {
        public bool Success { get; set; }
        public int ShiftId { get; set; }
        public DateTime StartTime { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class EndShiftRequest
    {
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }

    public class EndShiftResponse
    {
        public bool Success { get; set; }
        public int ShiftId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public int DurationMinutes { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class UpdateLocationRequest
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}
