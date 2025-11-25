using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.Identity
{
    /// <inheritdoc />
    public partial class ConvertIdentityPharmacyIdToLong : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<long>(
                name: "PharmacyId",
                table: "IdentityUsers",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "PharmacyId",
                table: "IdentityUsers",
                type: "integer",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");
        }
    }
}
