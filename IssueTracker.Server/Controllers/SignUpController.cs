using IssueTracker.Server.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
[ApiController]
[Route("api/auth")]
public class SignUpController(AppDbContext context) : ControllerBase
{

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] User user)
    {
        var found = await context.Users.FirstOrDefaultAsync(u => u.Login == user.Login && u.Password == user.Password);
        if (found is null)
        {
            return Unauthorized();
        }
        return Ok(new
        {
            id = found.Id,
            login = found.Login
        });
    }
}