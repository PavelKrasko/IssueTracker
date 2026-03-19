using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IssueTracker.Server.Migrations
{
    /// <inheritdoc />
    public partial class IncreaseInvestmentPathLength : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Тип_Вложения",
                table: "Investment",
                type: "varchar(255)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(20)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Тип_Вложения",
                table: "Investment",
                type: "varchar(20)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)");
        }
    }
}
