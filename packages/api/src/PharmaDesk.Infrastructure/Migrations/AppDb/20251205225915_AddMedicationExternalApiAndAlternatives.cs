using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmaDesk.Infrastructure.Migrations.AppDb
{
    /// <inheritdoc />
    public partial class AddMedicationExternalApiAndAlternatives : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Alternatives",
                table: "Medications",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ExternalApiId",
                table: "Medications",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Alternatives",
                table: "Medications");

            migrationBuilder.DropColumn(
                name: "ExternalApiId",
                table: "Medications");
        }
    }
}
