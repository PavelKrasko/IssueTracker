using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
[Table("Project")]
public class Project
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ID_Проекта", TypeName = "integer")]
    public int Id { get; set; }

    [Required]
    [Column("ID_Администратора_проекта", TypeName = "integer")]
    public int AdminId { get; set; }

    [ForeignKey("AdminId")]
    public User? Admin { get; set; }

    [Required]
    [Column("Наименование", TypeName = "varchar(50)")]
    public string Name { get; set; } = string.Empty;

    [NotMapped]
    public List<string>? Emails { get; set; } = new List<string>();
}