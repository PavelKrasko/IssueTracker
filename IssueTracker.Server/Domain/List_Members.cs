using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
[Table("List_Members")]
public class List_Members
{
    [Required]
    [Column("ID_Проекта", TypeName = "integer")]
    public int ProjectId { get; set; }

    [ForeignKey("ProjectId")]
    public Project? Project { get; set; }

    [Required]
    [Column("ID_Участника_проекта", TypeName = "integer")]
    public int UserId { get; set; }

    [ForeignKey("UserId")]
    public User? User { get; set; }
}