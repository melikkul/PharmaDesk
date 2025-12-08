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
}
