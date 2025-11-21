using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.Identity
{
    /// <inheritdoc />
    public partial class UpdateUserFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PharmacyName",
                table: "IdentityUsers");

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "IdentityUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FirstName",
                table: "IdentityUsers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Group",
                table: "IdentityUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LastName",
                table: "IdentityUsers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "IdentityUsers",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "City",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "FirstName",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "Group",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "LastName",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "IdentityUsers");

            migrationBuilder.AddColumn<string>(
                name: "PharmacyName",
                table: "IdentityUsers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }
    }
}
