using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmaDesk.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FinalProductionRelease : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_PharmacyProfileId_Date",
                table: "Transactions");

            migrationBuilder.RenameIndex(
                name: "IX_OrderItems_MedicationId",
                table: "OrderItems",
                newName: "IX_OrderItems_MedicationId_Optimized");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Pharmacy_Date",
                table: "Transactions",
                columns: new[] { "PharmacyProfileId", "Date" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_Offers_Status_CreatedAt",
                table: "Offers",
                columns: new[] { "Status", "CreatedAt" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_Pharmacy_Date",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Offers_Status_CreatedAt",
                table: "Offers");

            migrationBuilder.RenameIndex(
                name: "IX_OrderItems_MedicationId_Optimized",
                table: "OrderItems",
                newName: "IX_OrderItems_MedicationId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_PharmacyProfileId_Date",
                table: "Transactions",
                columns: new[] { "PharmacyProfileId", "Date" });
        }
    }
}
