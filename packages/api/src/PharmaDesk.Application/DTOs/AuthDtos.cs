namespace Backend.Dtos
{
    public class RegisterRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string GLN { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public int? GroupId { get; set; } // Nullable - user may or may not select a group
        public string PharmacyName { get; set; } = string.Empty;
    }

    // LoginRequest, ForgotRequest vb. aynı kalabilir...
    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public bool IsFirstLogin { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string PharmacyName { get; set; } = string.Empty;
        public AuthUserDto User { get; set; }
    }

    public class AuthUserDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PharmacyName { get; set; } = string.Empty;
        public string GLN { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty; // YENİ
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty; // 🆕 Açık adres
        
        [System.Text.Json.Serialization.JsonPropertyName("pharmacyId")]
        public string PharmacyId { get; set; } = string.Empty; // Changed from long to string for JSON serialization
    }
    public class ForgotRequest { public string Email { get; set; } = string.Empty; }
    public class ResetRequest { public string Token { get; set; } = string.Empty; public string NewPassword { get; set; } = string.Empty; }
}