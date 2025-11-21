using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.App
{
    /// <inheritdoc />
    public partial class AddPublicIdToPharmacyProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PublicId",
                table: "PharmacyProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PublicId",
                table: "PharmacyProfiles");
        }
    }
}
