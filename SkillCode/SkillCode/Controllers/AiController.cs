using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillCode.DTOs;
using SkillCode.Interfaces;

namespace SkillCode.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize]
public class AiController : ControllerBase
{
    private readonly IAiService _aiService;

    public AiController(IAiService aiService)
    {
        _aiService = aiService;
    }

    [HttpPost("generate-task")]
    [ProducesResponseType(typeof(GenerateTaskResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<GenerateTaskResponse>> GenerateTask(
        [FromBody] GenerateTaskRequest request, CancellationToken ct)
    {
        var result = await _aiService.GenerateTaskAsync(request, ct);
        return Ok(result);
    }

    [HttpPost("grade-answer")]
    [ProducesResponseType(typeof(GradeAnswerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<GradeAnswerResponse>> GradeAnswer(
        [FromBody] GradeAnswerRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.UserAnswer))
            return Ok(new GradeAnswerResponse(0m, "Відповідь не надано"));

        var result = await _aiService.GradeAnswerAsync(request, ct);
        return Ok(result);
    }
}
