using IssueTracker.Server.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
[ApiController]
[Route("api/projects")]
public class AdminPanelProjectController(AppDbContext context) : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<IActionResult> GetProject(int id)
    {
        var membersList = await context.ProjectParticipants
            .Include(m => m.User)
            .Where(m => m.ProjectId == id)
            .ToListAsync();

        var membersData = new List<object>();

        for (int i = 0; i < membersList.Count; i++)
        {
            var record = membersList[i];
            if (record.User != null)
            {
                membersData.Add(new
                {
                    id = record.User.Id,
                    login = record.User.Login
                });
            }
        }

        return Ok(new { members = membersData });
    }
    [HttpPut("{id}/rename")]
    public async Task<IActionResult> RenameProject(int id, [FromBody] string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
        {
            return BadRequest("Название проекта не может быть пустым");

        }
        var project = await context.Projects.FindAsync(id);
        if (project == null)
        {
            return NotFound();
        }
        project.Name = newName;
        await context.SaveChangesAsync();
        return Ok();
    }
    [HttpDelete("{id}/kick-member/{userId}")]
    public async Task<IActionResult> RemoveMember(int id, int userId)
    {
        var project = await context.Projects.FindAsync(id);
        if (project == null) return NotFound("Проект не найден");
        if (project.AdminId == userId)
        {
            return BadRequest("Администратор не может быть удален из списка участников");
        }
        var memberEntry = await context.ProjectParticipants
            .FirstOrDefaultAsync(p => p.ProjectId == id && p.UserId == userId);
        if (memberEntry == null) return NotFound("Участник не найден в проекте");
        context.ProjectParticipants.Remove(memberEntry);
        await context.SaveChangesAsync();
        return Ok();
    }
    [HttpPost("{id}/join-by-login")]
    public async Task<IActionResult> AddMemberByLogin(int id, [FromBody] string Login)
    {
        if (string.IsNullOrWhiteSpace(Login))
            return BadRequest("Логин не может быть пустым");
        var user = await context.Users.FirstOrDefaultAsync(u => u.Login == Login);
        if (user == null)
            return NotFound("Такой пользователь не существует");
        bool alreadyExists = await context.ProjectParticipants
            .AnyAsync(p => p.ProjectId == id && p.UserId == user.Id);
        if (alreadyExists)
            return BadRequest("Этот человек уже в команде");
        var newEntry = new List_Members
        {
            ProjectId = id,
            UserId = user.Id
        };
        context.ProjectParticipants.Add(newEntry);
        await context.SaveChangesAsync();
        var members = await context.ProjectParticipants
            .Where(p => p.ProjectId == id)
            .Select(p => new {
                id = p.UserId,
                login = p.User.Login
            })
            .ToListAsync();
        return Ok(new { id, members });
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var project = await context.Projects.FindAsync(id);
        if (project == null) return NotFound();
        var participants = context.ProjectParticipants.Where(p => p.ProjectId == id);
        context.ProjectParticipants.RemoveRange(participants);

        context.Projects.Remove(project);
        await context.SaveChangesAsync();
        return Ok();
    }
}