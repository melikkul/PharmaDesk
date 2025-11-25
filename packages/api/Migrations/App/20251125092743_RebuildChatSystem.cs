using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations.App
{
    /// <inheritdoc />
    public partial class RebuildChatSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_PharmacyProfiles_User1Id",
                table: "Conversations");

            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_PharmacyProfiles_User2Id",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ConversationId",
                table: "Messages");

            migrationBuilder.RenameColumn(
                name: "User2Id",
                table: "Conversations",
                newName: "Participant2Id");

            migrationBuilder.RenameColumn(
                name: "User1Id",
                table: "Conversations",
                newName: "Participant1Id");

            migrationBuilder.RenameIndex(
                name: "IX_Conversations_User2Id",
                table: "Conversations",
                newName: "IX_Conversations_Participant2Id");

            migrationBuilder.RenameIndex(
                name: "IX_Conversations_User1Id_User2Id",
                table: "Conversations",
                newName: "IX_Conversations_Participant1Id_Participant2Id");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ConversationId_CreatedAt",
                table: "Messages",
                columns: new[] { "ConversationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ConversationId_IsRead",
                table: "Messages",
                columns: new[] { "ConversationId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_LastMessageDate",
                table: "Conversations",
                column: "LastMessageDate");

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_PharmacyProfiles_Participant1Id",
                table: "Conversations",
                column: "Participant1Id",
                principalTable: "PharmacyProfiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_PharmacyProfiles_Participant2Id",
                table: "Conversations",
                column: "Participant2Id",
                principalTable: "PharmacyProfiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_PharmacyProfiles_Participant1Id",
                table: "Conversations");

            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_PharmacyProfiles_Participant2Id",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ConversationId_CreatedAt",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ConversationId_IsRead",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_LastMessageDate",
                table: "Conversations");

            migrationBuilder.RenameColumn(
                name: "Participant2Id",
                table: "Conversations",
                newName: "User2Id");

            migrationBuilder.RenameColumn(
                name: "Participant1Id",
                table: "Conversations",
                newName: "User1Id");

            migrationBuilder.RenameIndex(
                name: "IX_Conversations_Participant2Id",
                table: "Conversations",
                newName: "IX_Conversations_User2Id");

            migrationBuilder.RenameIndex(
                name: "IX_Conversations_Participant1Id_Participant2Id",
                table: "Conversations",
                newName: "IX_Conversations_User1Id_User2Id");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ConversationId",
                table: "Messages",
                column: "ConversationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_PharmacyProfiles_User1Id",
                table: "Conversations",
                column: "User1Id",
                principalTable: "PharmacyProfiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_PharmacyProfiles_User2Id",
                table: "Conversations",
                column: "User2Id",
                principalTable: "PharmacyProfiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
