using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillCode.DTOs;
using SkillCode.Interfaces;

namespace SkillCode.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;
    private readonly ITaskShareService _shareService;

    public TasksController(ITaskService taskService, ITaskShareService shareService)
    {
        _taskService  = taskService;
        _shareService = shareService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<TaskDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<TaskDetailResponse>>> GetAll(CancellationToken ct)
    {
        var ownerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tasks = await _taskService.GetAllAsync(ownerId, ct);
        return Ok(tasks);
    }

    [HttpPost]
    [ProducesResponseType(typeof(TaskDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<TaskDetailResponse>> Create(
        [FromBody] CreateTaskRequest request, CancellationToken ct)
    {
        var ownerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var task = await _taskService.CreateAsync(ownerId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = task.Id }, task);
    }

    [HttpGet("public")]
    [ProducesResponseType(typeof(List<PublicTaskDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<PublicTaskDetailResponse>>> GetPublicTasks(CancellationToken ct)
    {
        var tasks = await _taskService.GetPublicTasksAsync(ct);
        return Ok(tasks);
    }

    [HttpPatch("{taskId:guid}/status")]
    [ProducesResponseType(typeof(TaskDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskDetailResponse>> SetStatus(
        Guid taskId, [FromBody] SetTaskStatusRequest request, CancellationToken ct)
    {
        var requesterId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var task = await _taskService.SetStatusAsync(requesterId, taskId, request.Status, ct);
        return Ok(task);
    }

    [HttpPost("{taskId:guid}/preview-attempt")]
    [ProducesResponseType(typeof(EphemeralAttemptResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EphemeralAttemptResult>> PreviewAttempt(
        Guid taskId, [FromBody] EphemeralAttemptRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _shareService.EphemeralAttemptPreviewAsync(userId, taskId, request, ct);
        return Ok(result);
    }

    [HttpPost("{taskId:guid}/share")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Share(
        Guid taskId, [FromBody] ShareTaskRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _shareService.ShareTaskAsync(userId, taskId, request.ReceiverId, ct);
        return StatusCode(StatusCodes.Status201Created);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(TaskDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskDetailResponse>> GetById(Guid id, CancellationToken ct)
    {
        var task = await _taskService.GetByIdAsync(id, ct);
        return Ok(task);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var requesterId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _taskService.DeleteAsync(requesterId, id, ct);
        return NoContent();
    }
}
