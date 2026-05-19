using IssueTracker.Server.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic;
[ApiController]
[Route("api/projects")]
public class ProjectController(AppDbContext context) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] Project newProject)
    {
        if (string.IsNullOrWhiteSpace(newProject.Name))
        {
            return BadRequest(new { message = "Название пустое" });
        }
        List<User> users = new();
        if (newProject.Emails != null && newProject.Emails.Count > 0)
        {
            users = await context.Users
                .Where(u => newProject.Emails.Contains(u.Login))
                .ToListAsync();

            if (users.Count != newProject.Emails.Count)
            {
                return BadRequest(new { message = "Один или несколько пользователей не найдены" });
            }
        }
        context.Projects.Add(newProject);
        context.ProjectParticipants.Add(new List_Members
        {
            Project = newProject, 
            UserId = newProject.AdminId
        });

        for (int i = 0; i < users.Count; i++)
        {
            if (users[i].Id != newProject.AdminId)
            {
                context.ProjectParticipants.Add(new List_Members
                {
                    Project = newProject, 
                    UserId = users[i].Id
                });
            }
        }

        await context.SaveChangesAsync();

        return Ok(newProject);
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserProjects(int userId)
    {
        var projectIds = context.ProjectParticipants
            .Where(p => p.UserId == userId)
            .Select(p => p.ProjectId)
            .ToList();
        var projects = context.Projects
            .Where(pr => projectIds.Contains(pr.Id))
            .Select(pr => new { pr.Id, pr.Name, pr.AdminId })
            .ToList();

        return Ok(projects);
    }
    [HttpDelete("{projectId}/leave/{userId}")]
    public async Task<IActionResult> LeaveProject(int projectId, int userId)
    {
        var member = await context.ProjectParticipants
            .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.UserId == userId);
        if (member == null)
        {
            return NotFound("Участник не найден в этом проекте");
        }
        context.ProjectParticipants.Remove(member);
        await context.SaveChangesAsync();
        return Ok();
    }
}