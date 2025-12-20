using System;
namespace Backend.Dtos
{
    public class UserMeResponse
    {
        public string Id { get; set; } = string.Empty;
        public string GLN { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PharmacyName { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty; // YENİ
        public string? PhoneNumber { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? PostalCode { get; set; }
        public string? ServicePackage { get; set; }
        public string? Role { get; set; }
        public string? ProfileImagePath { get; set; }
        public string? PharmacistFirstName { get; set; } // Eczacı Adı
        public string? PharmacistLastName { get; set; }  // Eczacı Soyadı
        public DateTime CreatedAt { get; set; }
        
        // 🆕 SaaS Subscription Fields
        public string? SubscriptionStatus { get; set; } // Active, Trial, PastDue, Cancelled
        public DateTime? SubscriptionExpireDate { get; set; }
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
        public string? About { get; set; } // YENİ
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}