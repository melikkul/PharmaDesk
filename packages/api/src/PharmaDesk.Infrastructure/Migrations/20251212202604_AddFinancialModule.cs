using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PharmaDesk.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFinancialModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Invoices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    InvoiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    OrderId = table.Column<int>(type: "integer", nullable: false),
                    SellerPharmacyId = table.Column<long>(type: "bigint", nullable: false),
                    BuyerPharmacyId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    SubTotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    VATRate = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    VATAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    GIBInvoiceId = table.Column<string>(type: "character varying(36)", maxLength: 36, nullable: true),
                    ETTN = table.Column<string>(type: "character varying(36)", maxLength: 36, nullable: true),
                    EInvoiceXmlPath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    EInvoicePdfPath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsEInvoiceSent = table.Column<bool>(type: "boolean", nullable: false),
                    EInvoiceSentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IssueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaidDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Invoices_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Invoices_PharmacyProfiles_BuyerPharmacyId",
                        column: x => x.BuyerPharmacyId,
                        principalTable: "PharmacyProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Invoices_PharmacyProfiles_SellerPharmacyId",
                        column: x => x.SellerPharmacyId,
                        principalTable: "PharmacyProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReturnRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReturnNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    OrderId = table.Column<int>(type: "integer", nullable: false),
                    OrderItemId = table.Column<int>(type: "integer", nullable: true),
                    RequesterPharmacyId = table.Column<long>(type: "bigint", nullable: false),
                    SellerPharmacyId = table.Column<long>(type: "bigint", nullable: false),
                    MedicationId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    RefundAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    EvidencePhotoPaths = table.Column<List<string>>(type: "jsonb", nullable: true),
                    BatchNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ProductExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedByUserId = table.Column<long>(type: "bigint", nullable: true),
                    ReviewNotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ReviewedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Resolution = table.Column<int>(type: "integer", nullable: true),
                    ActualRefundAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    CreditNoteId = table.Column<int>(type: "integer", nullable: true),
                    ReplacementOrderId = table.Column<int>(type: "integer", nullable: true),
                    RequiresPhysicalReturn = table.Column<bool>(type: "boolean", nullable: false),
                    ReturnShipmentId = table.Column<int>(type: "integer", nullable: true),
                    ReturnTrackingNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ProductReceivedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RequestDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReturnRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReturnRequests_Medications_MedicationId",
                        column: x => x.MedicationId,
                        principalTable: "Medications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReturnRequests_OrderItems_OrderItemId",
                        column: x => x.OrderItemId,
                        principalTable: "OrderItems",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReturnRequests_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReturnRequests_PharmacyProfiles_RequesterPharmacyId",
                        column: x => x.RequesterPharmacyId,
                        principalTable: "PharmacyProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReturnRequests_PharmacyProfiles_SellerPharmacyId",
                        column: x => x.SellerPharmacyId,
                        principalTable: "PharmacyProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReturnRequests_Shipments_ReturnShipmentId",
                        column: x => x.ReturnShipmentId,
                        principalTable: "Shipments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    InvoiceId = table.Column<int>(type: "integer", nullable: false),
                    PayerPharmacyId = table.Column<long>(type: "bigint", nullable: false),
                    Method = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    BankName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BankAccountNumber = table.Column<string>(type: "character varying(34)", maxLength: 34, nullable: true),
                    TransferReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CardLast4 = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    GatewayTransactionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    GatewayResponseCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    BalanceTransactionId = table.Column<int>(type: "integer", nullable: true),
                    PaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConfirmedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReceiptImagePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FailureReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Payments_PharmacyProfiles_PayerPharmacyId",
                        column: x => x.PayerPharmacyId,
                        principalTable: "PharmacyProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Payments_Transactions_BalanceTransactionId",
                        column: x => x.BalanceTransactionId,
                        principalTable: "Transactions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_BuyerPharmacyId",
                table: "Invoices",
                column: "BuyerPharmacyId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_OrderId",
                table: "Invoices",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_SellerPharmacyId",
                table: "Invoices",
                column: "SellerPharmacyId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_BalanceTransactionId",
                table: "Payments",
                column: "BalanceTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_InvoiceId",
                table: "Payments",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_PayerPharmacyId",
                table: "Payments",
                column: "PayerPharmacyId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_MedicationId",
                table: "ReturnRequests",
                column: "MedicationId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_OrderId",
                table: "ReturnRequests",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_OrderItemId",
                table: "ReturnRequests",
                column: "OrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_RequesterPharmacyId",
                table: "ReturnRequests",
                column: "RequesterPharmacyId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_ReturnShipmentId",
                table: "ReturnRequests",
                column: "ReturnShipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_SellerPharmacyId",
                table: "ReturnRequests",
                column: "SellerPharmacyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "ReturnRequests");

            migrationBuilder.DropTable(
                name: "Invoices");
        }
    }
}
