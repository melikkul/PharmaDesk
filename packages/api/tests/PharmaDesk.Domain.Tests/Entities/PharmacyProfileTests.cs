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
                PharmacyName = "Test Eczanesi",
                GLN = "12345",
                City = "İstanbul",
                District = "Kadıköy",
                Address = "Test Mahallesi No:1"
            };

            // Assert
            pharmacy.PharmacyName.Should().Be("Test Eczanesi");
            pharmacy.GLN.Should().Be("12345");
            pharmacy.City.Should().Be("İstanbul");
            pharmacy.District.Should().Be("Kadıköy");
            pharmacy.Address.Should().Be("Test Mahallesi No:1");
        }

        [Fact]
        public void PharmacyProfile_GLN_ShouldNotBeNull()
        {
            // Arrange
            var pharmacy = new PharmacyProfile
            {
                PharmacyName = "Test Eczanesi",
                GLN = "ABC123"
            };

            // Act & Assert
            pharmacy.GLN.Should().NotBeNullOrEmpty();
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
                PharmacyName = "Test Eczanesi",
                City = city
            };

            // Assert
            pharmacy.City.Should().Be(city);
        }
    }
}
