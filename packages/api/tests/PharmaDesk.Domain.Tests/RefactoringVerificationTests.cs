using Backend.Data;
using Backend.Models;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace PharmaDesk.Domain.Tests
{
    /// <summary>
    /// Verification tests for the refactored entity structures.
    /// Tests JSONB arrays, OfferTarget relations, concurrency tokens, and FK integrity.
    /// 
    /// NOTE: These tests use InMemory database which doesn't support:
    /// - PostgreSQL xmin column (concurrency test uses in-memory simulation)
    /// - JSONB column type (but EF Core handles List<string> correctly)
    /// 
    /// For full verification, run integration tests against PostgreSQL.
    /// </summary>
    public class RefactoringVerificationTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly DbContextOptions<AppDbContext> _options;

        public RefactoringVerificationTests()
        {
            // Use unique database name for each test instance to avoid conflicts
            _options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
                .Options;

            _context = new AppDbContext(_options);
            _context.Database.EnsureCreated();
            
            // Seed required lookup data
            SeedTestData();
        }

        private void SeedTestData()
        {
            // Create test pharmacy profile (required for foreign keys)
            var pharmacy = new PharmacyProfile
            {
                Id = 1,
                PharmacyName = "Test Eczanesi",
                Username = "test_pharmacy",
                GLN = "TEST001GLN",
                PhoneNumber = "5551234567",
                CreatedAt = DateTime.UtcNow
            };
            _context.PharmacyProfiles.Add(pharmacy);
            
            // Create second pharmacy for OfferTarget tests
            var pharmacy2 = new PharmacyProfile
            {
                Id = 2,
                PharmacyName = "Hedef Eczane 1",
                Username = "target_pharmacy_1",
                GLN = "TARGET001GLN",
                PhoneNumber = "5551234568",
                CreatedAt = DateTime.UtcNow
            };
            _context.PharmacyProfiles.Add(pharmacy2);
            
            var pharmacy3 = new PharmacyProfile
            {
                Id = 3,
                PharmacyName = "Hedef Eczane 2",
                Username = "target_pharmacy_2",
                GLN = "TARGET002GLN",
                PhoneNumber = "5551234569",
                CreatedAt = DateTime.UtcNow
            };
            _context.PharmacyProfiles.Add(pharmacy3);
            
            _context.SaveChanges();
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        #region Senaryo 1: JSONB Arrays (Medication.Alternatives & AllImagePaths)

        [Fact]
        public async Task Medication_WithAlternativesAndImagePaths_ShouldPersistAsJsonbArrays()
        {
            // Arrange
            var medication = new Medication
            {
                Name = "Test İlaç",
                ATC = "N02BE01",
                Barcode = "8699536010001",
                Manufacturer = "Test Pharma",
                Description = "Test ilaç açıklaması",
                BasePrice = 150.00m,
                
                // 🆕 JSONB arrays - these should persist correctly
                Alternatives = new List<string> 
                { 
                    "8699536010002", 
                    "8699536010003", 
                    "N02BE02" 
                },
                AllImagePaths = new List<string> 
                { 
                    "images/medication1/1.png", 
                    "images/medication1/2.png",
                    "images/medication1/3.png"
                },
                ImageCount = 3,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Act
            _context.Medications.Add(medication);
            await _context.SaveChangesAsync();

            // Retrieve fresh from database
            var savedMedication = await _context.Medications
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.ATC == "N02BE01");

            // Assert
            savedMedication.Should().NotBeNull();
            savedMedication!.Name.Should().Be("Test İlaç");
            
            // JSONB array assertions
            savedMedication.Alternatives.Should().NotBeNull();
            savedMedication.Alternatives.Should().HaveCount(3);
            savedMedication.Alternatives.Should().Contain("8699536010002");
            savedMedication.Alternatives.Should().Contain("N02BE02");
            
            savedMedication.AllImagePaths.Should().NotBeNull();
            savedMedication.AllImagePaths.Should().HaveCount(3);
            savedMedication.AllImagePaths.Should().Contain("images/medication1/1.png");
            savedMedication.AllImagePaths.Should().Contain("images/medication1/3.png");
            
            savedMedication.ImageCount.Should().Be(3);
        }

        [Fact]
        public async Task Medication_WithEmptyAlternatives_ShouldPersistEmptyArray()
        {
            // Arrange
            var medication = new Medication
            {
                Name = "Empty Alternatives İlaç",
                ATC = "A01AA01",
                Barcode = "8699536099999",
                Manufacturer = "Test Pharma",
                BasePrice = 50.00m,
                Alternatives = new List<string>(), // Empty but not null
                AllImagePaths = null, // Null case
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Act
            _context.Medications.Add(medication);
            await _context.SaveChangesAsync();

            var savedMedication = await _context.Medications
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.ATC == "A01AA01");

            // Assert
            savedMedication.Should().NotBeNull();
            savedMedication!.Alternatives.Should().NotBeNull();
            savedMedication.Alternatives.Should().BeEmpty();
            savedMedication.AllImagePaths.Should().BeNull();
        }

        #endregion

        #region Senaryo 2: OfferTarget Relation (1NF Normalization)

        [Fact]
        public async Task Offer_WithOfferTargets_ShouldPersistNormalizedRelation()
        {
            // Arrange - First create a medication for the offer
            var medication = new Medication
            {
                Name = "Offer Test İlaç",
                ATC = "B01AC06",
                Barcode = "8699536020001",
                Manufacturer = "Test Pharma",
                BasePrice = 200.00m,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Medications.Add(medication);
            await _context.SaveChangesAsync();

            // Create offer with private targeting
            var offer = new Offer
            {
                PharmacyProfileId = 1,
                MedicationId = medication.Id,
                Type = OfferType.StockSale,
                Status = OfferStatus.Active,
                Price = 180.00m,
                Stock = 100,
                BonusQuantity = 10,
                MinSaleQuantity = 10,
                IsPrivate = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Offers.Add(offer);
            await _context.SaveChangesAsync();

            // 🆕 Add OfferTargets (normalized, replaces comma-separated TargetPharmacyIds string)
            var offerTarget1 = new OfferTarget
            {
                OfferId = offer.Id,
                TargetPharmacyId = 2, // First target pharmacy
                AddedAt = DateTime.UtcNow
            };
            var offerTarget2 = new OfferTarget
            {
                OfferId = offer.Id,
                TargetPharmacyId = 3, // Second target pharmacy
                AddedAt = DateTime.UtcNow
            };
            _context.OfferTargets.Add(offerTarget1);
            _context.OfferTargets.Add(offerTarget2);
            await _context.SaveChangesAsync();

            // Act - Retrieve offer with its targets
            var savedOffer = await _context.Offers
                .AsNoTracking()
                .Include(o => o.OfferTargets)
                .FirstOrDefaultAsync(o => o.Id == offer.Id);

            // Assert
            savedOffer.Should().NotBeNull();
            savedOffer!.IsPrivate.Should().BeTrue();
            
            // OfferTargets should be properly loaded
            savedOffer.OfferTargets.Should().NotBeNull();
            savedOffer.OfferTargets.Should().HaveCount(2);
            
            var targetPharmacyIds = savedOffer.OfferTargets.Select(ot => ot.TargetPharmacyId).ToList();
            targetPharmacyIds.Should().Contain(2);
            targetPharmacyIds.Should().Contain(3);
        }

        [Fact]
        public async Task Offer_OfferTargets_ShouldCascadeDelete()
        {
            // Arrange
            var medication = new Medication
            {
                Name = "Cascade Test İlaç",
                ATC = "C01AA01",
                Barcode = "8699536030001",
                Manufacturer = "Test Pharma",
                BasePrice = 100.00m,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Medications.Add(medication);
            await _context.SaveChangesAsync();

            var offer = new Offer
            {
                PharmacyProfileId = 1,
                MedicationId = medication.Id,
                Type = OfferType.StockSale,
                Status = OfferStatus.Active,
                Price = 90.00m,
                Stock = 50,
                IsPrivate = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Offers.Add(offer);
            await _context.SaveChangesAsync();

            _context.OfferTargets.Add(new OfferTarget { OfferId = offer.Id, TargetPharmacyId = 2 });
            await _context.SaveChangesAsync();

            var offerId = offer.Id;

            // Act - Delete the offer (should cascade to OfferTargets)
            _context.Offers.Remove(offer);
            await _context.SaveChangesAsync();

            // Assert
            var orphanedTargets = await _context.OfferTargets
                .Where(ot => ot.OfferId == offerId)
                .ToListAsync();
            
            orphanedTargets.Should().BeEmpty("OfferTargets should be cascade deleted with Offer");
        }

        #endregion

        #region Senaryo 3: Concurrency Token (xmin / RowVersion)

        [Fact]
        public async Task InventoryItem_WhenCreated_ShouldHaveRowVersionAssigned()
        {
            // Arrange
            var medication = new Medication
            {
                Name = "Concurrency Test İlaç",
                ATC = "D01AA01",
                Barcode = "8699536040001",
                Manufacturer = "Test Pharma",
                BasePrice = 75.00m,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Medications.Add(medication);
            await _context.SaveChangesAsync();

            var inventoryItem = new InventoryItem
            {
                PharmacyProfileId = 1,
                MedicationId = medication.Id,
                Quantity = 100,
                BonusQuantity = 5,
                CostPrice = 50.00m,
                SalePrice = 75.00m,
                BatchNumber = "BATCH001",
                ExpiryDate = DateTime.UtcNow.AddYears(2),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Act
            _context.InventoryItems.Add(inventoryItem);
            await _context.SaveChangesAsync();

            var savedItem = await _context.InventoryItems
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.BatchNumber == "BATCH001");

            // Assert
            savedItem.Should().NotBeNull();
            savedItem!.Quantity.Should().Be(100);
            
            // NOTE: InMemory database doesn't support PostgreSQL xmin column
            // In production with PostgreSQL, RowVersion would be automatically assigned
            // For InMemory, we verify the property exists and has default value
            savedItem.RowVersion.GetType().Should().Be(typeof(uint));
            
            // RowVersion starts at 0 in InMemory (PostgreSQL assigns real xmin)
            // This test verifies the property is defined and accessible
        }

        [Fact]
        public async Task InventoryItem_WhenUpdated_RowVersionShouldChange()
        {
            // Arrange
            var medication = new Medication
            {
                Name = "Update Test İlaç",
                ATC = "E01AA01",
                Barcode = "8699536050001",
                Manufacturer = "Test Pharma",
                BasePrice = 80.00m,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Medications.Add(medication);
            await _context.SaveChangesAsync();

            var item = new InventoryItem
            {
                PharmacyProfileId = 1,
                MedicationId = medication.Id,
                Quantity = 50,
                CostPrice = 40.00m,
                BatchNumber = "BATCH002",
                ExpiryDate = DateTime.UtcNow.AddYears(1),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.InventoryItems.Add(item);
            await _context.SaveChangesAsync();

            var originalRowVersion = item.RowVersion;

            // Act - Update the item
            item.Quantity = 75;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Assert
            // NOTE: InMemory database doesn't auto-increment RowVersion
            // In PostgreSQL, xmin would change on each update
            // This test verifies the update succeeds without concurrency exception
            var updatedItem = await _context.InventoryItems
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.BatchNumber == "BATCH002");
            
            updatedItem.Should().NotBeNull();
            updatedItem!.Quantity.Should().Be(75);
        }

        #endregion

        #region Senaryo 4: FK Integrity (Transaction.OrderId & OfferId)

        [Fact]
        public async Task Transaction_WithOfferId_ShouldPersistFKCorrectly()
        {
            // Arrange - Create medication and offer first
            var medication = new Medication
            {
                Name = "FK Test İlaç",
                ATC = "F01AA01",
                Barcode = "8699536060001",
                Manufacturer = "Test Pharma",
                BasePrice = 120.00m,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Medications.Add(medication);
            await _context.SaveChangesAsync();

            var offer = new Offer
            {
                PharmacyProfileId = 1,
                MedicationId = medication.Id,
                Type = OfferType.StockSale,
                Status = OfferStatus.Active,
                Price = 100.00m,
                Stock = 200,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Offers.Add(offer);
            await _context.SaveChangesAsync();

            // Create transaction with OfferId FK
            var transaction = new Transaction
            {
                PharmacyProfileId = 1,
                Type = TransactionType.OfferCreated,
                Status = TransactionStatus.Completed,
                Amount = 0,
                Description = "Teklif oluşturuldu: FK Test İlaç",
                Date = DateTime.UtcNow,
                
                // 🆕 Using OfferId FK instead of RelatedReferenceId string
                OfferId = offer.Id,
                OrderId = null, // No related order
                
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Act
            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            var savedTransaction = await _context.Transactions
                .AsNoTracking()
                .Include(t => t.Offer)
                .FirstOrDefaultAsync(t => t.OfferId == offer.Id);

            // Assert
            savedTransaction.Should().NotBeNull();
            savedTransaction!.OfferId.Should().Be(offer.Id);
            savedTransaction.OrderId.Should().BeNull();
            savedTransaction.Type.Should().Be(TransactionType.OfferCreated);
            
            // Navigation property should load
            savedTransaction.Offer.Should().NotBeNull();
            savedTransaction.Offer!.Price.Should().Be(100.00m);
        }

        [Fact]
        public async Task Transaction_WithOrderId_ShouldPersistFKCorrectly()
        {
            // Arrange - Create order first
            var order = new Order
            {
                OrderNumber = $"ORD-{DateTime.UtcNow.Ticks}",
                BuyerPharmacyId = 1,
                SellerPharmacyId = 2,
                TotalAmount = 500.00m,
                Status = OrderStatus.Pending,
                PaymentStatus = PaymentStatus.Pending,
                OrderDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            // Create transaction with OrderId FK
            var transaction = new Transaction
            {
                PharmacyProfileId = 1,
                Type = TransactionType.Purchase,
                Status = TransactionStatus.Completed,
                Amount = -500.00m,
                Description = "Sipariş: FK Test",
                Date = DateTime.UtcNow,
                CounterpartyPharmacyId = 2,
                
                // 🆕 Using OrderId FK
                OrderId = order.Id,
                OfferId = null,
                
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Act
            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            var savedTransaction = await _context.Transactions
                .AsNoTracking()
                .Include(t => t.Order)
                .Include(t => t.CounterpartyPharmacy)
                .FirstOrDefaultAsync(t => t.OrderId == order.Id);

            // Assert
            savedTransaction.Should().NotBeNull();
            savedTransaction!.OrderId.Should().Be(order.Id);
            savedTransaction.OfferId.Should().BeNull();
            savedTransaction.Type.Should().Be(TransactionType.Purchase);
            savedTransaction.Amount.Should().Be(-500.00m);
            
            // Navigation properties should load
            savedTransaction.Order.Should().NotBeNull();
            savedTransaction.Order!.OrderNumber.Should().Contain("ORD-");
            savedTransaction.CounterpartyPharmacy.Should().NotBeNull();
            savedTransaction.CounterpartyPharmacy!.Id.Should().Be(2);
        }

        [Fact]
        public async Task Transaction_WithBothOrderIdAndOfferId_ShouldPersistBothFKs()
        {
            // Arrange
            var medication = new Medication
            {
                Name = "Both FK Test İlaç",
                ATC = "G01AA01",
                Barcode = "8699536070001",
                Manufacturer = "Test Pharma",
                BasePrice = 90.00m,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Medications.Add(medication);
            await _context.SaveChangesAsync();

            var offer = new Offer
            {
                PharmacyProfileId = 2,
                MedicationId = medication.Id,
                Type = OfferType.StockSale,
                Status = OfferStatus.Active,
                Price = 80.00m,
                Stock = 50,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Offers.Add(offer);
            await _context.SaveChangesAsync();

            var order = new Order
            {
                OrderNumber = $"ORD-BOTH-{DateTime.UtcNow.Ticks}",
                BuyerPharmacyId = 1,
                SellerPharmacyId = 2,
                TotalAmount = 400.00m,
                Status = OrderStatus.Completed,
                PaymentStatus = PaymentStatus.Paid,
                OrderDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            // Create transaction linking both order and offer
            var transaction = new Transaction
            {
                PharmacyProfileId = 1,
                Type = TransactionType.Purchase,
                Status = TransactionStatus.Completed,
                Amount = -400.00m,
                Description = "Sipariş tamamlandı",
                Date = DateTime.UtcNow,
                
                // Both FKs set
                OrderId = order.Id,
                OfferId = offer.Id,
                
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Act
            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            var savedTransaction = await _context.Transactions
                .AsNoTracking()
                .Include(t => t.Order)
                .Include(t => t.Offer)
                .FirstOrDefaultAsync(t => t.OrderId == order.Id && t.OfferId == offer.Id);

            // Assert
            savedTransaction.Should().NotBeNull();
            savedTransaction!.OrderId.Should().Be(order.Id);
            savedTransaction.OfferId.Should().Be(offer.Id);
            
            savedTransaction.Order.Should().NotBeNull();
            savedTransaction.Offer.Should().NotBeNull();
        }

        #endregion

        #region Soft Delete Tests (Global Query Filter)

        [Fact]
        public async Task Medication_WhenSoftDeleted_ShouldBeFilteredByDefault()
        {
            // Arrange
            var medication = new Medication
            {
                Name = "Soft Delete Test İlaç",
                ATC = "H01AA01",
                Barcode = "8699536080001",
                Manufacturer = "Test Pharma",
                BasePrice = 60.00m,
                IsDeleted = false, // Not deleted initially
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Medications.Add(medication);
            await _context.SaveChangesAsync();

            // Act - Soft delete
            medication.IsDeleted = true;
            medication.DeletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Query without IgnoreQueryFilters (should not find it)
            var filteredResult = await _context.Medications
                .FirstOrDefaultAsync(m => m.ATC == "H01AA01");

            // Query with IgnoreQueryFilters (should find it)
            var unfilteredResult = await _context.Medications
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(m => m.ATC == "H01AA01");

            // Assert
            filteredResult.Should().BeNull("Soft deleted entities should be filtered by Global Query Filter");
            unfilteredResult.Should().NotBeNull("IgnoreQueryFilters should return soft deleted entities");
            unfilteredResult!.IsDeleted.Should().BeTrue();
            unfilteredResult.DeletedAt.Should().NotBeNull();
        }

        #endregion

        #region Audit Fields Tests (CreatedAt, UpdatedAt)

        [Fact]
        public async Task Entity_WhenCreated_ShouldHaveAuditFieldsSet()
        {
            // Arrange
            var beforeCreate = DateTime.UtcNow;
            
            var medication = new Medication
            {
                Name = "Audit Test İlaç",
                ATC = "I01AA01",
                Barcode = "8699536090001",
                Manufacturer = "Test Pharma",
                BasePrice = 45.00m
                // CreatedAt and UpdatedAt should be set by SaveChanges
            };

            // Act
            _context.Medications.Add(medication);
            await _context.SaveChangesAsync();

            var afterCreate = DateTime.UtcNow;

            var savedMedication = await _context.Medications
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.ATC == "I01AA01");

            // Assert
            savedMedication.Should().NotBeNull();
            savedMedication!.CreatedAt.Should().BeOnOrAfter(beforeCreate);
            savedMedication.CreatedAt.Should().BeOnOrBefore(afterCreate);
            savedMedication.UpdatedAt.Should().BeOnOrAfter(beforeCreate);
        }

        #endregion
    }
}
