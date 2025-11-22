using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.App
{
    /// <inheritdoc />
    public partial class RefactorDatabaseSchema_v2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Admins",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash" },
                values: new object[] { new DateTime(2025, 11, 22, 14, 12, 42, 21, DateTimeKind.Utc).AddTicks(5326), "$2a$11$IufeEjcTk8mEWw35FVfTg.6utm1WwYssb4SIfwFk/2dV3zkZiMaq2" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Admins",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "PasswordHash" },
                values: new object[] { new DateTime(2025, 11, 22, 14, 10, 57, 988, DateTimeKind.Utc).AddTicks(9118), "$2a$11$vgnBDDyuWM1nFkAxgj/rPuadrEkVp.r/nVLnZ5yg0gyqsX/JCGuKO" });
        }
    }
}
