using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.Identity
{
    /// <inheritdoc />
    public partial class AddPharmacyIdAndGLNToIdentityUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "City",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "District",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "Group",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "PharmacyName",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "IdentityUsers");

            migrationBuilder.AddColumn<int>(
                name: "PharmacyId",
                table: "IdentityUsers",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PharmacyId",
                table: "IdentityUsers");

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "IdentityUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "City",
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

            migrationBuilder.AddColumn<string>(
                name: "Group",
                table: "IdentityUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PharmacyName",
                table: "IdentityUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "IdentityUsers",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
