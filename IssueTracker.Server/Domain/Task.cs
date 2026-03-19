using IssueTracker.Server.Domain;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
[Table("Task")]
public class Task
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ID_Задачи", TypeName = "integer")]
    public int Id { get; set; }
    [Required]
    [Column("ID_Проекта", TypeName = "integer")]
    public int ProjectId { get; set; }
    [ForeignKey("ProjectId")]
    public Project? Project { get; set; }
    [Required]
    [Column("Описание_задачи", TypeName = "varchar(50)")]
    public string Description { get; set; } = string.Empty;
    [Required]
    [Column("Приоритет_задачи", TypeName = "varchar(10)")]
    public string Priority { get; set; } = string.Empty;
    [Required]
    [Column("Статус_задачи", TypeName = "varchar(10)")]
    public string Status { get; set; } = string.Empty;
    [Required]
    [Column("Дата_регистрации", TypeName = "datetime")]
    public DateTime RegistrationDate { get; set; }
    [Required]
    [Column("Тест_кейс_дефекта", TypeName = "varchar(20)")]
    public string TestCase { get; set; } = string.Empty;
    [Column("Дата_последнего_изменения", TypeName = "datetime")]
    public DateTime? LastModifiedDate { get; set; }
    [Required]
    [Column("Наименование_модуля", TypeName = "varchar(20)")]
    public string ModuleName { get; set; } = string.Empty;
    [Required]
    [Column("Наименование_компонента", TypeName = "varchar(20)")]
    public string ComponentName { get; set; } = string.Empty;
    [Column("Комментарий_к_задачи", TypeName = "varchar(50)")]
    public string? Comment { get; set; } = string.Empty;
    [Required]
    [Column("Наименование_Типа_дефекта", TypeName = "varchar(20)")]
    public string DefectTypeName { get; set; } = string.Empty;
    [ForeignKey("DefectTypeName")]
    public Type_of_defect? DefectType { get; set; }
    [Required]
    [Column("Наименование_Роли", TypeName = "varchar(20)")]
    public string RoleName { get; set; } = string.Empty;
    [ForeignKey("RoleName")]
    public Role? Role { get; set; }
    public List<Investment> Investments { get; set; } = new();
}