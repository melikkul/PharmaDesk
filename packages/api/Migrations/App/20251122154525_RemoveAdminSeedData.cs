using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.App
{
    /// <inheritdoc />
    public partial class RemoveAdminSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Admins",
                keyColumn: "Id",
                keyValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Admins",
                columns: new[] { "Id", "CreatedAt", "Email", "FirstName", "LastName", "PasswordHash" },
                values: new object[] { 1, new DateTime(2025, 11, 22, 15, 29, 6, 340, DateTimeKind.Utc).AddTicks(8344), "melik_kul@outlook.com", "Melik", "Kul", "$2a$11$CFXREGvgZdRmPyBWbQQPCe31AX/EGYaHvJ9eAz.X7LpLmNfsokQdy" });
        }
    }
}
