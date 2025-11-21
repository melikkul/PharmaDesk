using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.Identity
{
    /// <inheritdoc />
    public partial class AddAddressAndDistrict : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "IdentityUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "District",
                table: "IdentityUsers",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "District",
                table: "IdentityUsers");
        }
    }
}
