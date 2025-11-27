using FluentAssertions;
using Backend.Models;

namespace PharmaDesk.Domain.Tests.Entities
{
    public class MedicationTests
    {
        [Fact]
        public void Medication_WhenCreated_ShouldHaveCorrectProperties()
        {
            // Arrange & Act
            var medication = new Medication
            {
                Name = "Dolorex 500 mg",
                Barcode = "8699514010019",
                ActiveIngredient = "Paracetamol",
                Manufacturer = "Abdi İbrahim"
            };

            // Assert
            medication.Name.Should().Be("Dolorex 500 mg");
            medication.Barcode.Should().Be("8699514010019");
            medication.ActiveIngredient.Should().Be("Paracetamol");
            medication.Manufacturer.Should().Be("Abdi İbrahim");
        }

        [Fact]
        public void Medication_Barcode_ShouldNotBeEmpty()
        {
            // Arrange
            var medication = new Medication
            {
                Name = "Test İlaç",
                Barcode = "1234567890123"
            };

            // Act & Assert
            medication.Barcode.Should().NotBeNullOrEmpty();
        }

        [Theory]
        [InlineData("8699514010019")]
        [InlineData("1234567890123")]
        [InlineData("9876543210987")]
        public void Medication_Barcode_ShouldAcceptValidBarcodes(string barcode)
        {
            // Arrange & Act
            var medication = new Medication
            {
                Name = "Test İlaç",
                Barcode = barcode
            };

            // Assert
            medication.Barcode.Should().Be(barcode);
            medication.Barcode.Length.Should().Be(13); // Standard barcode length
        }
    }
}
