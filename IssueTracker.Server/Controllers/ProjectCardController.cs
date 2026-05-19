using IssueTracker.Server.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/tasks")]
public class ProjectCardController(AppDbContext context) : ControllerBase
{
    [HttpGet("project-info/{id}")]
    public async Task<IActionResult> GetProjectInfo(int id)
    {
        var project = await context.Projects
            .Include(p => p.Admin)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null) return NotFound();

        return Ok(new
        {
            id = project.Id,
            name = project.Name,
            adminId = project.AdminId,
            members = new[] { new { id = project.Admin.Id, login = project.Admin.Login } }
        });
    }
    [HttpGet("project/{projectId}")]
    public async Task<IActionResult> GetProjectTasks(int projectId)
    {
        var tasks = await context.Tasks
            .Where(t => t.ProjectId == projectId)
            .OrderByDescending(t => t.RegistrationDate)
            .ToListAsync();

        var result = tasks.Select(t => new
        {
            id = t.Id,
            title = t.Description,
            status = t.Status,
            date = t.RegistrationDate.ToString("dd MMMM"),
            user = t.RoleName
        });

        return Ok(result);
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await context.Tasks.FindAsync(id);
        if (task == null) return NotFound();

        context.Tasks.Remove(task);
        await context.SaveChangesAsync();

        return Ok();
    }
    [HttpGet("{id}")]
    public async Task<IActionResult> GetTaskDetails(int id)
    {
        var task = await context.Tasks
            .Include(t => t.Investments)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task == null) return NotFound();

        return Ok(new
        {
            id = task.Id,
            description = task.Description,
            priority = task.Priority,
            status = task.Status,
            moduleName = task.ModuleName,
            componentName = task.ComponentName,
            comment = task.Comment,
            testCase = task.TestCase,
            Date = task.RegistrationDate,
            defectTypeName = task.DefectTypeName,
            investments = task.Investments.Select(i => new { path = i.Path })
        });
    }
}