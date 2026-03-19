using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
[Table("Investment")]
public class Investment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ID_Вложения", TypeName = "integer")]
    public int Id { get; set; }
    [Required]
    [Column("Тип_Вложения", TypeName = "varchar(255)")]
    public string Type { get; set; } = string.Empty;
    [Required]
    [Column("Путь_Вложения", TypeName = "varchar(255)")]
    public string Path { get; set; } = string.Empty;
    [Required]
    [Column("ID_Задачи", TypeName = "integer")]
    public int TaskId { get; set; }

    [ForeignKey("TaskId")]
    public Task? Task { get; set; }
}