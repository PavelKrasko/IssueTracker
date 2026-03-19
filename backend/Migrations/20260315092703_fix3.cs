using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IssueTracker.Server.Migrations
{
    /// <inheritdoc />
    public partial class fix3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    ID_Пользователя = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Логин = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false),
                    Пароль = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.ID_Пользователя);
                });

            migrationBuilder.CreateTable(
                name: "Project",
                columns: table => new
                {
                    ID_Проекта = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ID_Администратора = table.Column<int>(type: "integer", nullable: false),
                    Наименование = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Project", x => x.ID_Проекта);
                    table.ForeignKey(
                        name: "FK_Project_Users_ID_Администратора",
                        column: x => x.ID_Администратора,
                        principalTable: "Users",
                        principalColumn: "ID_Пользователя",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "List_Members",
                columns: table => new
                {
                    ID_Проекта = table.Column<int>(type: "int", nullable: false),
                    ID_Участника_проекта = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_List_Members", x => new { x.ID_Проекта, x.ID_Участника_проекта });
                    table.ForeignKey(
                        name: "FK_List_Members_Project_ID_Проекта",
                        column: x => x.ID_Проекта,
                        principalTable: "Project",
                        principalColumn: "ID_Проекта",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_List_Members_Users_ID_Участника_проекта",
                        column: x => x.ID_Участника_проекта,
                        principalTable: "Users",
                        principalColumn: "ID_Пользователя",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_List_Members_ID_Участника_проекта",
                table: "List_Members",
                column: "ID_Участника_проекта");

            migrationBuilder.CreateIndex(
                name: "IX_Project_ID_Администратора",
                table: "Project",
                column: "ID_Администратора");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "List_Members");

            migrationBuilder.DropTable(
                name: "Project");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
