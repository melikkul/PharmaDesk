using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.App
{
    /// <inheritdoc />
    public partial class AddOfferTypesAndEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AcceptingCounterOffers",
                table: "Offers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "BiddingDeadline",
                table: "Offers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CampaignBonusMultiplier",
                table: "Offers",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "CampaignEndDate",
                table: "Offers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CampaignStartDate",
                table: "Offers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinimumOrderQuantity",
                table: "Offers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Offers",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AcceptingCounterOffers",
                table: "Offers");

            migrationBuilder.DropColumn(
                name: "BiddingDeadline",
                table: "Offers");

            migrationBuilder.DropColumn(
                name: "CampaignBonusMultiplier",
                table: "Offers");

            migrationBuilder.DropColumn(
                name: "CampaignEndDate",
                table: "Offers");

            migrationBuilder.DropColumn(
                name: "CampaignStartDate",
                table: "Offers");

            migrationBuilder.DropColumn(
                name: "MinimumOrderQuantity",
                table: "Offers");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Offers");
        }
    }
}
