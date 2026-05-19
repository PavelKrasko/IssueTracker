using IssueTracker.Server.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/tasks")]
public class AddTaskController(AppDbContext context) : ControllerBase
{
    [HttpGet("projects/{userId}")]
    public async Task<IActionResult> GetProjects(int userId)
    {
        var projectIds = await context.ProjectParticipants
            .Where(m => m.UserId == userId)
            .Select(m => m.ProjectId)
            .ToListAsync();

        var projects = await context.Projects
            .Where(p => projectIds.Contains(p.Id) || p.AdminId == userId)
            .Select(p => new { p.Id, p.Name })
            .Distinct()
            .ToListAsync();

        return Ok(projects);
    }

    [HttpGet("defect-types")]
    public async Task<IActionResult> GetDefectTypes()
    {
        var types = await context.Type_of_defects
            .Select(t => new { t.Name })
            .ToListAsync();
        return Ok(types);
    }

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await context.Roles
            .Select(r => new { r.Name })
            .ToListAsync();
        return Ok(roles);
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateTask(
      [FromForm] int projectId,
      [FromForm] string description,
      [FromForm] string priority,
      [FromForm] string status,
      [FromForm] string module,
      [FromForm] string component,
      [FromForm] string testCase,
      [FromForm] string defectType,
      [FromForm] string executorRole,
      [FromForm] string? comment,
      [FromForm] List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
        {
            return BadRequest(new { message = "Необходимо прикрепить хотя бы один файл" });
        }

        if (!await context.Roles.AnyAsync(r => r.Name == executorRole))
        {
            context.Roles.Add(new Role { Name = executorRole });
            await context.SaveChangesAsync();
        }

        if (!await context.Type_of_defects.AnyAsync(t => t.Name == defectType))
        {
            context.Type_of_defects.Add(new Type_of_defect { Name = defectType });
            await context.SaveChangesAsync();
        }

        var newTask = new Task
        {
            ProjectId = projectId,
            Description = description,
            Priority = priority,
            Status = status,
            RegistrationDate = DateTime.Now,
            TestCase = testCase,
            ModuleName = module,
            ComponentName = component,
            Comment = comment,
            DefectTypeName = defectType,
            RoleName = executorRole,
            LastModifiedDate = DateTime.Now
        };

        context.Tasks.Add(newTask);
        await context.SaveChangesAsync();

        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        if (!Directory.Exists(uploadsPath)) Directory.Exists(uploadsPath);

 
        for (int i = 0; i < files.Count; i++)
        {
            var file = files[i];
            var uniqueName = Guid.NewGuid() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(uploadsPath, uniqueName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            context.Investments.Add(new Investment
            {
                TaskId = newTask.Id,
                Type = file.ContentType,
                Path = "/uploads/" + uniqueName
            });
        }

        await context.SaveChangesAsync();
        return Ok(new { message = "Успешно создано" });
    }
}