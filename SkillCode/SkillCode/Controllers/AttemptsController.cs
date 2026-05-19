using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Interfaces;

namespace SkillCode.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttemptsController : ControllerBase
{
    private readonly IAttemptService _attemptService;

    public AttemptsController(IAttemptService attemptService)
    {
        _attemptService = attemptService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(AttemptResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AttemptResponse>> Start(
        [FromBody] StartAttemptRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var attempt = await _attemptService.StartAsync(userId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = attempt.Id }, attempt);
    }

    [HttpPut("{id:guid}/answers")]
    [ProducesResponseType(typeof(AttemptAnswerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AttemptAnswerResponse>> SaveAnswer(
        Guid id, [FromBody] SaveAnswerRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var answer = await _attemptService.SaveAnswerAsync(userId, id, request, ct);
        return Ok(answer);
    }

    [HttpPatch("{attemptId:guid}/answers/{answerId:guid}")]
    [ProducesResponseType(typeof(AttemptAnswerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AttemptAnswerResponse>> UpdateAnswerGrade(
        Guid attemptId, Guid answerId, [FromBody] UpdateAnswerGradeRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var answer = await _attemptService.UpdateAnswerGradeAsync(userId, attemptId, answerId, request, ct);
        return Ok(answer);
    }

    [HttpPost("{id:guid}/finish")]
    [ProducesResponseType(typeof(AttemptResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AttemptResponse>> Finish(Guid id, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var attempt = await _attemptService.FinishAsync(userId, id, ct);
        return Ok(attempt);
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<AttemptResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<AttemptResponse>>> GetByTask(
        [FromQuery] Guid taskId,
        [FromQuery] AttemptType? contextType,
        [FromQuery] Guid? contextId,
        CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var attempts = await _attemptService.GetByTaskAsync(userId, taskId, contextType, contextId, ct);
        return Ok(attempts);
    }

    [HttpGet("{id:guid}/answers")]
    [ProducesResponseType(typeof(List<AttemptAnswerResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<AttemptAnswerResponse>>> GetAnswers(Guid id, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var answers = await _attemptService.GetAnswersAsync(userId, id, ct);
        return Ok(answers);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AttemptDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AttemptDetailResponse>> GetById(Guid id, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var attempt = await _attemptService.GetByIdAsync(userId, id, ct);
        return Ok(attempt);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _attemptService.DeleteAsync(userId, id, ct);
        return NoContent();
    }

    [HttpPost("{attemptId:guid}/answers/{answerId:guid}/explain")]
    [ProducesResponseType(typeof(AttemptAnswerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<AttemptAnswerResponse>> ExplainAnswer(
        Guid attemptId, Guid answerId,
        [FromBody] ExplainAnswerRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var answer = await _attemptService.ExplainAnswerAsync(userId, attemptId, answerId, request, ct);
        return Ok(answer);
    }
}
