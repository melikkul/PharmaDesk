using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PharmaDesk.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCarrierGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CarrierId",
                table: "Shipments",
                type: "integer",
                nullable: true);

            /*
            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "PharmacyProfiles",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);
            */

            // Add IsFinalized column to Offers (idempotent with Sql check)
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Offers' AND column_name='IsFinalized') THEN
                        ALTER TABLE ""Offers"" ADD COLUMN ""IsFinalized"" BOOLEAN NOT NULL DEFAULT false;
                    END IF;
                END $$;
            ");

            // Add IsPaymentProcessed column to Offers
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Offers' AND column_name='IsPaymentProcessed') THEN
                        ALTER TABLE ""Offers"" ADD COLUMN ""IsPaymentProcessed"" BOOLEAN NOT NULL DEFAULT false;
                    END IF;
                END $$;
            ");

            // Add IsDepotFulfillment column to CartItems
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='CartItems' AND column_name='IsDepotFulfillment') THEN
                        ALTER TABLE ""CartItems"" ADD COLUMN ""IsDepotFulfillment"" BOOLEAN NOT NULL DEFAULT false;
                    END IF;
                END $$;
            ");

            migrationBuilder.AddColumn<string>(
                name: "Username",
                table: "Carriers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "CarrierGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CarrierId = table.Column<int>(type: "integer", nullable: false),
                    GroupId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CarrierGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CarrierGroups_Carriers_CarrierId",
                        column: x => x.CarrierId,
                        principalTable: "Carriers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CarrierGroups_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Shipments_CarrierId",
                table: "Shipments",
                column: "CarrierId");

            migrationBuilder.CreateIndex(
                name: "IX_Carriers_Username",
                table: "Carriers",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CarrierGroups_CarrierId_GroupId",
                table: "CarrierGroups",
                columns: new[] { "CarrierId", "GroupId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CarrierGroups_GroupId",
                table: "CarrierGroups",
                column: "GroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_Shipments_Carriers_CarrierId",
                table: "Shipments",
                column: "CarrierId",
                principalTable: "Carriers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Shipments_Carriers_CarrierId",
                table: "Shipments");

            migrationBuilder.DropTable(
                name: "CarrierGroups");

            migrationBuilder.DropIndex(
                name: "IX_Shipments_CarrierId",
                table: "Shipments");

            migrationBuilder.DropIndex(
                name: "IX_Carriers_Username",
                table: "Carriers");

            migrationBuilder.DropColumn(
                name: "CarrierId",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "PharmacyProfiles");

            migrationBuilder.DropColumn(
                name: "IsFinalized",
                table: "Offers");

            migrationBuilder.DropColumn(
                name: "IsPaymentProcessed",
                table: "Offers");

            migrationBuilder.DropColumn(
                name: "IsDepotFulfillment",
                table: "CartItems");

            migrationBuilder.DropColumn(
                name: "Username",
                table: "Carriers");
        }
    }
}
