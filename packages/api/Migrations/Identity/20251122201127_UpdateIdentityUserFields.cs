using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.Identity
{
    /// <inheritdoc />
    public partial class UpdateIdentityUserFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastLoginDate",
                table: "IdentityUsers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "IdentityUsers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_IdentityUsers_Status",
                table: "IdentityUsers",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_IdentityUsers_Status",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "LastLoginDate",
                table: "IdentityUsers");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "IdentityUsers");
        }
    }
}
