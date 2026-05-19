using IssueTracker.Server.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/my-tasks")]
public class MyTaskController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAllTasks()
    {
        var tasks = await context.Tasks.ToListAsync();
        return Ok(tasks);
    }
}