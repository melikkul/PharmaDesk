namespace Backend.DTOs
{
    public class RegisterRequest
    {
        public string GLN { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string PharmacyName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? PostalCode { get; set; }
        public string? ServicePackage { get; set; }
    }
}
