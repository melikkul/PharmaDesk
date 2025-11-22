using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace api.Migrations.App
{
    /// <inheritdoc />
    public partial class RefactorDatabaseSchema_v1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address1",
                table: "PharmacyProfiles");

            migrationBuilder.DropColumn(
                name: "Address2",
                table: "PharmacyProfiles");

            migrationBuilder.RenameColumn(
                name: "PostalCode",
                table: "PharmacyProfiles",
                newName: "Address");

            migrationBuilder.AddColumn<int>(
                name: "GroupId",
                table: "PharmacyProfiles",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Groups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Groups", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "Admins",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash" },
                values: new object[] { new DateTime(2025, 11, 22, 14, 10, 57, 988, DateTimeKind.Utc).AddTicks(9118), "$2a$11$vgnBDDyuWM1nFkAxgj/rPuadrEkVp.r/nVLnZ5yg0gyqsX/JCGuKO" });

            migrationBuilder.CreateIndex(
                name: "IX_PharmacyProfiles_GroupId",
                table: "PharmacyProfiles",
                column: "GroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_PharmacyProfiles_Groups_GroupId",
                table: "PharmacyProfiles",
                column: "GroupId",
                principalTable: "Groups",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PharmacyProfiles_Groups_GroupId",
                table: "PharmacyProfiles");

            migrationBuilder.DropTable(
                name: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_PharmacyProfiles_GroupId",
                table: "PharmacyProfiles");

            migrationBuilder.DropColumn(
                name: "GroupId",
                table: "PharmacyProfiles");

            migrationBuilder.RenameColumn(
                name: "Address",
                table: "PharmacyProfiles",
                newName: "PostalCode");

            migrationBuilder.AddColumn<string>(
                name: "Address1",
                table: "PharmacyProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Address2",
                table: "PharmacyProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Admins",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash" },
                values: new object[] { new DateTime(2025, 11, 21, 22, 9, 23, 549, DateTimeKind.Utc).AddTicks(1721), "$2a$11$3lc9ytM6Kx/HbAM0vKx0Y.qylKSzaN50YXnY9cUKQf45rjjozc7Dm" });
        }
    }
}
