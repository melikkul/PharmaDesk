using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PharmaDesk.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupAndDirectChat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ═══════════════════════════════════════════════════════════════
            // Step 1: Add new columns BEFORE dropping old ones
            // ═══════════════════════════════════════════════════════════════
            
            migrationBuilder.AddColumn<decimal>(
                name: "BalanceLimit",
                table: "PharmacyProfiles",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ConversationId",
                table: "Messages",
                type: "integer",
                nullable: true); // Temporarily nullable for migration

            migrationBuilder.AddColumn<string>(
                name: "SenderName",
                table: "Messages",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            // ═══════════════════════════════════════════════════════════════
            // Step 2: Create new tables
            // ═══════════════════════════════════════════════════════════════

            migrationBuilder.CreateTable(
                name: "Conversations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    GroupId = table.Column<int>(type: "integer", nullable: true),
                    LastMessageAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastMessagePreview = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Conversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Conversations_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ConversationParticipants",
                columns: table => new
                {
                    ConversationId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    UnreadCount = table.Column<int>(type: "integer", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConversationParticipants", x => new { x.ConversationId, x.UserId });
                    table.ForeignKey(
                        name: "FK_ConversationParticipants_Conversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "Conversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ═══════════════════════════════════════════════════════════════
            // Step 3: DATA MIGRATION - Migrate old messages to new Conversation structure
            // ═══════════════════════════════════════════════════════════════
            
            migrationBuilder.Sql(@"
                -- Create temporary table to track unique conversation pairs
                CREATE TEMP TABLE temp_conversation_pairs AS
                SELECT DISTINCT
                    LEAST(m.""SenderId""::bigint, m.""ReceiverId""::bigint) as user1,
                    GREATEST(m.""SenderId""::bigint, m.""ReceiverId""::bigint) as user2
                FROM ""Messages"" m
                WHERE m.""ReceiverId"" IS NOT NULL AND m.""ReceiverId"" != '';

                -- Create conversations for each unique pair
                INSERT INTO ""Conversations"" (""Type"", ""GroupId"", ""LastMessageAt"", ""LastMessagePreview"", ""CreatedAt"")
                SELECT 
                    0 as ""Type"", -- Direct
                    NULL as ""GroupId"",
                    COALESCE(
                        (SELECT MAX(m2.""SentAt"") FROM ""Messages"" m2 
                         WHERE (m2.""SenderId""::bigint = tcp.user1 AND m2.""ReceiverId""::bigint = tcp.user2)
                            OR (m2.""SenderId""::bigint = tcp.user2 AND m2.""ReceiverId""::bigint = tcp.user1)),
                        NOW()
                    ) as ""LastMessageAt"",
                    (SELECT m3.""Content"" FROM ""Messages"" m3 
                     WHERE (m3.""SenderId""::bigint = tcp.user1 AND m3.""ReceiverId""::bigint = tcp.user2)
                        OR (m3.""SenderId""::bigint = tcp.user2 AND m3.""ReceiverId""::bigint = tcp.user1)
                     ORDER BY m3.""SentAt"" DESC LIMIT 1) as ""LastMessagePreview"",
                    NOW() as ""CreatedAt""
                FROM temp_conversation_pairs tcp;

                -- Create mapping of user pairs to conversation IDs
                CREATE TEMP TABLE temp_conv_mapping AS
                SELECT 
                    c.""Id"" as conv_id,
                    tcp.user1,
                    tcp.user2
                FROM ""Conversations"" c
                CROSS JOIN LATERAL (
                    SELECT DISTINCT
                        LEAST(m.""SenderId""::bigint, m.""ReceiverId""::bigint) as user1,
                        GREATEST(m.""SenderId""::bigint, m.""ReceiverId""::bigint) as user2
                    FROM ""Messages"" m
                    WHERE m.""ReceiverId"" IS NOT NULL AND m.""ReceiverId"" != ''
                ) tcp
                WHERE c.""Type"" = 0
                LIMIT (SELECT COUNT(*) FROM temp_conversation_pairs);

                -- Add participants for each conversation
                INSERT INTO ""ConversationParticipants"" (""ConversationId"", ""UserId"", ""UnreadCount"", ""JoinedAt"")
                SELECT DISTINCT c.""Id"", tcp.user1, 0, NOW()
                FROM ""Conversations"" c
                JOIN temp_conversation_pairs tcp ON TRUE
                WHERE c.""Type"" = 0
                UNION
                SELECT DISTINCT c.""Id"", tcp.user2, 0, NOW()
                FROM ""Conversations"" c
                JOIN temp_conversation_pairs tcp ON TRUE
                WHERE c.""Type"" = 0
                ON CONFLICT DO NOTHING;

                -- Update Messages with ConversationId
                UPDATE ""Messages"" m
                SET ""ConversationId"" = c.""Id"",
                    ""SenderName"" = (SELECT pp.""PharmacyName"" FROM ""PharmacyProfiles"" pp WHERE pp.""Id"" = m.""SenderId""::bigint LIMIT 1)
                FROM ""Conversations"" c
                JOIN ""ConversationParticipants"" cp1 ON cp1.""ConversationId"" = c.""Id""
                JOIN ""ConversationParticipants"" cp2 ON cp2.""ConversationId"" = c.""Id"" AND cp2.""UserId"" != cp1.""UserId""
                WHERE c.""Type"" = 0
                  AND m.""ReceiverId"" IS NOT NULL
                  AND ((m.""SenderId""::bigint = cp1.""UserId"" AND m.""ReceiverId""::bigint = cp2.""UserId"")
                    OR (m.""SenderId""::bigint = cp2.""UserId"" AND m.""ReceiverId""::bigint = cp1.""UserId""));

                -- Clean up temp tables
                DROP TABLE IF EXISTS temp_conversation_pairs;
                DROP TABLE IF EXISTS temp_conv_mapping;
            ");

            // ═══════════════════════════════════════════════════════════════
            // Step 4: Finalize schema - Make ConversationId required, drop old columns
            // ═══════════════════════════════════════════════════════════════
            
            // Delete orphan messages without ConversationId (if any)
            migrationBuilder.Sql(@"DELETE FROM ""Messages"" WHERE ""ConversationId"" IS NULL;");
            
            // Make ConversationId required
            migrationBuilder.AlterColumn<int>(
                name: "ConversationId",
                table: "Messages",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Now drop old index and column
            migrationBuilder.DropIndex(
                name: "IX_Messages_SenderId_ReceiverId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "ReceiverId",
                table: "Messages");

            // ═══════════════════════════════════════════════════════════════
            // Step 5: Create new indexes and foreign keys
            // ═══════════════════════════════════════════════════════════════

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ConversationId_SentAt",
                table: "Messages",
                columns: new[] { "ConversationId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SenderId",
                table: "Messages",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_ConversationParticipants_UserId",
                table: "ConversationParticipants",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_GroupId",
                table: "Conversations",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_LastMessageAt",
                table: "Conversations",
                column: "LastMessageAt",
                descending: new bool[0]);

            migrationBuilder.AddForeignKey(
                name: "FK_Messages_Conversations_ConversationId",
                table: "Messages",
                column: "ConversationId",
                principalTable: "Conversations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Messages_Conversations_ConversationId",
                table: "Messages");

            migrationBuilder.DropTable(
                name: "ConversationParticipants");

            migrationBuilder.DropTable(
                name: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ConversationId_SentAt",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Messages_SenderId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "BalanceLimit",
                table: "PharmacyProfiles");

            migrationBuilder.DropColumn(
                name: "ConversationId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "SenderName",
                table: "Messages");

            migrationBuilder.AddColumn<string>(
                name: "ReceiverId",
                table: "Messages",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SenderId_ReceiverId",
                table: "Messages",
                columns: new[] { "SenderId", "ReceiverId" });
        }
    }
}
