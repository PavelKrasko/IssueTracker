using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Users")]
public class User
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ID_Пользователя", TypeName = "integer")]
    public int Id { get; set; }
    [Required]
    [Column("Логин", TypeName = "varchar(50)")]
    [MaxLength(50)]
    public string Login { get; set; } = string.Empty;
    [Required]
    [Column("Пароль", TypeName = "varchar(50)")]
    [MaxLength(50)]
    public string Password { get; set; } = string.Empty;
}
