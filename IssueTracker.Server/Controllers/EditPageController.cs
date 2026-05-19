using IssueTracker.Server.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/tasks-edit")]
public class EditPageController(AppDbContext context) : ControllerBase
{
    [HttpGet("projects")]
    public async Task<IActionResult> GetProjects()
    {
        var projects = await context.Projects.ToListAsync();
        return Ok(projects);
    }

    [HttpGet("defect-types")]
    public async Task<IActionResult> GetDefects()
    {
        var defects = await context.Type_of_defects.ToListAsync();
        return Ok(defects);
    }

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await context.Roles.ToListAsync();
        return Ok(roles);
    }
    [HttpGet]
    public async Task<IActionResult> GetAllTasks() => Ok(await context.Tasks.ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTask(int id)
    {
        var task = await context.Tasks.FindAsync(id);
        return task == null ? NotFound() : Ok(task);
    }

    [HttpPut("update/{id}")]
    public async Task<IActionResult> UpdateTask(int id, [FromForm] TaskUpdateDto dto, [FromForm] List<IFormFile>? files)
    {
        var task = await context.Tasks.FindAsync(id);
        if (task == null) return NotFound();
        var roleExists = await context.Roles.AnyAsync(r => r.Name == dto.ExecutorRole);

        if (!roleExists && !string.IsNullOrEmpty(dto.ExecutorRole))
        {
            context.Roles.Add(new Role { Name = dto.ExecutorRole });
            await context.SaveChangesAsync();
        }
        task.ProjectId = dto.ProjectId;
        task.Description = dto.Description;
        task.Priority = dto.Priority;
        task.Status = dto.Status;
        task.ModuleName = dto.Module;
        task.ComponentName = dto.Component;
        task.TestCase = dto.TestCase;
        task.DefectTypeName = dto.DefectType;
        task.RoleName = dto.ExecutorRole;
        task.Comment = dto.Comment;
        task.LastModifiedDate = DateTime.Now; 

        if (files != null && files.Count > 0)
        {
            var file = files[0];
            var uniqueName = Guid.NewGuid() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", uniqueName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            context.Investments.Add(new Investment
            {
                TaskId = task.Id,
                Type = file.ContentType,
                Path = "/uploads/" + uniqueName
            });
        }

        await context.SaveChangesAsync();
        return Ok(new { message = "Задача обновлена" });
    }
}

public class TaskUpdateDto
{
    public int ProjectId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string Component { get; set; } = string.Empty;
    public string TestCase { get; set; } = string.Empty;
    public string DefectType { get; set; } = string.Empty;
    public string ExecutorRole { get; set; } = string.Empty;
    public string UserLogin { get; set; } = string.Empty;
    public string? Comment { get; set; }
}
