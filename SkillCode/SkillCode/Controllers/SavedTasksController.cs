using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillCode.DTOs;
using SkillCode.Interfaces;

namespace SkillCode.Controllers;

[ApiController]
[Route("api/saved")]
[Authorize]
public class SavedTasksController : ControllerBase
{
    private readonly ISavedTaskService _savedTaskService;

    public SavedTasksController(ISavedTaskService savedTaskService)
    {
        _savedTaskService = savedTaskService;
    }

    [HttpPost("{taskId:guid}")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Save(Guid taskId, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _savedTaskService.SaveAsync(userId, taskId, ct);
        return StatusCode(StatusCodes.Status201Created);
    }

    [HttpDelete("{taskId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unsave(Guid taskId, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _savedTaskService.UnsaveAsync(userId, taskId, ct);
        return NoContent();
    }

    [HttpGet("/api/tasks/saved")]
    [ProducesResponseType(typeof(List<TaskDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<TaskDetailResponse>>> GetSaved(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tasks = await _savedTaskService.GetSavedAsync(userId, ct);
        return Ok(tasks);
    }
}
