namespace Backend.Dtos
{
    public class UserMeResponse
    {
        public int Id { get; set; }
        public string GLN { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PharmacyName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? PostalCode { get; set; }
        public string? ServicePackage { get; set; }
        public string? Role { get; set; }
        public string? ProfileImagePath { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class UpdateProfileRequest
    {
        public string? PhoneNumber { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? PostalCode { get; set; }
        public string? ServicePackage { get; set; }
        public string? PharmacyName { get; set; }
        public string? ProfileImagePath { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
