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

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        /// <summary>
        /// If true, refresh token will be valid for 30 days. 
        /// If false, refresh token will be valid for 24 hours (or session).
        /// </summary>
        public bool RememberMe { get; set; } = false;
    }

    public class LoginResponse
    {
        /// <summary>
        /// Short-lived access token (15 minutes).
        /// </summary>
        public string AccessToken { get; set; } = string.Empty;
        
        /// <summary>
        /// Long-lived refresh token. Stored as HttpOnly cookie.
        /// </summary>
        public string RefreshToken { get; set; } = string.Empty;
        
        /// <summary>
        /// Access token expiry in seconds (default: 900 = 15 minutes).
        /// </summary>
        public int ExpiresIn { get; set; } = 900;
        
        public bool IsFirstLogin { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string PharmacyName { get; set; } = string.Empty;
        public AuthUserDto User { get; set; } = null!;
    }

    /// <summary>
    /// Request for refreshing an expired access token.
    /// </summary>
    public class RefreshTokenRequest
    {
        /// <summary>
        /// The refresh token (from HttpOnly cookie or body).
        /// </summary>
        public string RefreshToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response containing a new access token.
    /// </summary>
    public class TokenResponse
    {
        /// <summary>
        /// New access token.
        /// </summary>
        public string AccessToken { get; set; } = string.Empty;
        
        /// <summary>
        /// Expiry in seconds.
        /// </summary>
        public int ExpiresIn { get; set; } = 900;
    }

    public class AuthUserDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PharmacyName { get; set; } = string.Empty;
        public string GLN { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        
        [System.Text.Json.Serialization.JsonPropertyName("pharmacyId")]
        public string PharmacyId { get; set; } = string.Empty;
    }
    
    public class ForgotRequest { public string Email { get; set; } = string.Empty; }
    public class ResetRequest { public string Token { get; set; } = string.Empty; public string NewPassword { get; set; } = string.Empty; }
}