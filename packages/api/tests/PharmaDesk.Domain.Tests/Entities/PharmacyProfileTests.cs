using FluentAssertions;
using Backend.Models;

namespace PharmaDesk.Domain.Tests.Entities
{
    public class PharmacyProfileTests
    {
        [Fact]
        public void PharmacyProfile_WhenCreated_ShouldHaveCorrectProperties()
        {
            // Arrange & Act
            var pharmacy = new PharmacyProfile
            {
                Name = "Test Eczanesi",
                LicenseNumber = "12345",
                City = "İstanbul",
                District = "Kadıköy",
                Address = "Test Mahallesi No:1"
            };

            // Assert
            pharmacy.Name.Should().Be("Test Eczanesi");
            pharmacy.LicenseNumber.Should().Be("12345");
            pharmacy.City.Should().Be("İstanbul");
            pharmacy.District.Should().Be("Kadıköy");
            pharmacy.Address.Should().Be("Test Mahallesi No:1");
        }

        [Fact]
        public void PharmacyProfile_LicenseNumber_ShouldNotBeNull()
        {
            // Arrange
            var pharmacy = new PharmacyProfile
            {
                Name = "Test Eczanesi",
                LicenseNumber = "ABC123"
            };

            // Act & Assert
            pharmacy.LicenseNumber.Should().NotBeNullOrEmpty();
        }

        [Theory]
        [InlineData("İstanbul")]
        [InlineData("Ankara")]
        [InlineData("İzmir")]
        public void PharmacyProfile_City_ShouldAcceptValidCities(string city)
        {
            // Arrange & Act
            var pharmacy = new PharmacyProfile
            {
                Name = "Test Eczanesi",
                City = city
            };

            // Assert
            pharmacy.City.Should().Be(city);
        }
    }
}
