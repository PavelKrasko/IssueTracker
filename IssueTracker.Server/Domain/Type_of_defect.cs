using IssueTracker.Server.Domain;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
[Table("Type_of_defect")]
public class Type_of_defect
{
    [Key]
    [Column("Наименование_Типа_дефекта", TypeName = "varchar(20)")]
    public string Name { get; set; } = string.Empty;
}