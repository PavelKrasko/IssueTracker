using IssueTracker.Server.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
[ApiController]
[Route("api/auth")]
public class RegistrationController(AppDbContext context) : ControllerBase
{

    [HttpPost("register")] 
    public async Task<IActionResult> Register([FromBody] User user)
    {
        bool exists = await context.Users.AnyAsync(u => u.Login == user.Login);
        if (exists)
        {
            return Conflict("Этот логин уже занят!");
        }
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return Ok(new { message = "Зарегистрирован!" });
    }
}