using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillCode.DTOs;
using SkillCode.Interfaces;

namespace SkillCode.Controllers;

[ApiController]
[Route("api/code")]
[Authorize]
public class CodeController : ControllerBase
{
    private readonly ICodeService _codeService;

    public CodeController(ICodeService codeService)
    {
        _codeService = codeService;
    }

    /// <summary>
    /// Combines code + callCode and executes on Piston. Returns stdout/stderr/exitCode.
    /// </summary>
    [HttpPost("execute")]
    [ProducesResponseType(typeof(ExecuteCodeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ExecuteCodeResponse>> Execute(
        [FromBody] ExecuteCodeRequest request, CancellationToken ct)
    {
        var result = await _codeService.ExecuteAsync(request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Runs user code against all stored test cases for a TaskItem and returns pass/fail per case.
    /// </summary>
    [HttpPost("test")]
    [ProducesResponseType(typeof(TestCodeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TestCodeResponse>> Test(
        [FromBody] TestCodeRequest request, CancellationToken ct)
    {
        var result = await _codeService.TestAsync(request, ct);
        return Ok(result);
    }
}
