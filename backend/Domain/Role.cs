using IssueTracker.Server.Domain;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
[Table("Role")]
public class Role
{
    [Key]
    [Column("Наименование_Роли", TypeName = "varchar(20)")]
    public string Name { get; set; } = string.Empty;
}