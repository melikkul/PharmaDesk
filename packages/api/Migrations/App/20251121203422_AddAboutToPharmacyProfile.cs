using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.App
{
    /// <inheritdoc />
    public partial class AddAboutToPharmacyProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "About",
                table: "PharmacyProfiles",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "About",
                table: "PharmacyProfiles");
        }
    }
}
