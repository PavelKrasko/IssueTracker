using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IssueTracker.Server.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Role",
                columns: table => new
                {
                    Наименование_Роли = table.Column<string>(type: "varchar(20)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Role", x => x.Наименование_Роли);
                });

            migrationBuilder.CreateTable(
                name: "Type_of_defect",
                columns: table => new
                {
                    Наименование_Типа_дефекта = table.Column<string>(type: "varchar(20)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Type_of_defect", x => x.Наименование_Типа_дефекта);
                });

            migrationBuilder.CreateTable(
                name: "Task",
                columns: table => new
                {
                    ID_Задачи = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ID_Проекта = table.Column<int>(type: "integer", nullable: false),
                    Описание_задачи = table.Column<string>(type: "varchar(50)", nullable: false),
                    Приоритет_задачи = table.Column<string>(type: "varchar(10)", nullable: false),
                    Статус_задачи = table.Column<string>(type: "varchar(10)", nullable: false),
                    Дата_регистрации = table.Column<DateTime>(type: "datetime", nullable: false),
                    Тест_кейс_дефекта = table.Column<string>(type: "varchar(20)", nullable: false),
                    Дата_последнего_изменения = table.Column<DateTime>(type: "datetime", nullable: true),
                    Наименование_модуля = table.Column<string>(type: "varchar(20)", nullable: false),
                    Наименование_компонента = table.Column<string>(type: "varchar(20)", nullable: false),
                    Комментарий_к_задачи = table.Column<string>(type: "varchar(50)", nullable: false),
                    Наименование_Типа_дефекта = table.Column<string>(type: "varchar(20)", nullable: false),
                    Наименование_Роли = table.Column<string>(type: "varchar(20)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Task", x => x.ID_Задачи);
                    table.ForeignKey(
                        name: "FK_Task_Project_ID_Проекта",
                        column: x => x.ID_Проекта,
                        principalTable: "Project",
                        principalColumn: "ID_Проекта",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Task_Role_Наименование_Роли",
                        column: x => x.Наименование_Роли,
                        principalTable: "Role",
                        principalColumn: "Наименование_Роли",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Task_Type_of_defect_Наименование_Типа_дефекта",
                        column: x => x.Наименование_Типа_дефекта,
                        principalTable: "Type_of_defect",
                        principalColumn: "Наименование_Типа_дефекта",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Investment",
                columns: table => new
                {
                    ID_Вложения = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Тип_Вложения = table.Column<string>(type: "varchar(20)", nullable: false),
                    Путь_Вложения = table.Column<string>(type: "varchar(20)", nullable: false),
                    ID_Задачи = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Investment", x => x.ID_Вложения);
                    table.ForeignKey(
                        name: "FK_Investment_Task_ID_Задачи",
                        column: x => x.ID_Задачи,
                        principalTable: "Task",
                        principalColumn: "ID_Задачи",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Investment_ID_Задачи",
                table: "Investment",
                column: "ID_Задачи");

            migrationBuilder.CreateIndex(
                name: "IX_Task_Наименование_Роли",
                table: "Task",
                column: "Наименование_Роли");

            migrationBuilder.CreateIndex(
                name: "IX_Task_Наименование_Типа_дефекта",
                table: "Task",
                column: "Наименование_Типа_дефекта");

            migrationBuilder.CreateIndex(
                name: "IX_Task_ID_Проекта",
                table: "Task",
                column: "ID_Проекта");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Investment");

            migrationBuilder.DropTable(
                name: "Task");

            migrationBuilder.DropTable(
                name: "Role");

            migrationBuilder.DropTable(
                name: "Type_of_defect");
        }
    }
}
