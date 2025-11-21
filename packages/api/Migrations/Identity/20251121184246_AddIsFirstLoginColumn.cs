using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.Identity
{
    /// <inheritdoc />
    public partial class AddIsFirstLoginColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFirstLogin",
                table: "IdentityUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PharmacyName",
                table: "IdentityUsers",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsFirstLogin",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "PharmacyName",
                table: "IdentityUsers");
        }
    }
}
