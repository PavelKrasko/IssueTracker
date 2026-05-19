using IssueTracker.Server.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
[ApiController]
[Route("api/auth")]
public class ProfileController(AppDbContext context) : ControllerBase
{
    [HttpGet("profile/{id}")]
    public async Task<IActionResult> GetProfile( int id)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound(new { message = "Пользователь не найден" });
        }
        return Ok(new
        {
            id = user.Id,
            login = user.Login,
            status = "Пользователь"
        });
    }
}