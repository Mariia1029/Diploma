using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillCode.DTOs;
using SkillCode.Interfaces;

namespace SkillCode.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TemplatesController : ControllerBase
{
    private readonly ITemplateService _templateService;

    public TemplatesController(ITemplateService templateService)
    {
        _templateService = templateService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(TemplateDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<TemplateDetailResponse>> Create(
        [FromBody] CreateTemplateRequest request, CancellationToken ct)
    {
        var ownerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var template = await _templateService.CreateAsync(ownerId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = template.Id }, template);
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<TemplateDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<TemplateDetailResponse>>> GetAll(CancellationToken ct)
    {
        var ownerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await _templateService.GetAllAsync(ownerId, ct));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public IActionResult GetById(Guid id) => StatusCode(StatusCodes.Status501NotImplemented);

    // ── Admin endpoints ────────────────────────────────────────────────────────

    [HttpPost("system")]
    [ProducesResponseType(typeof(TemplateDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<TemplateDetailResponse>> CreateSystemTemplate(
        [FromBody] CreateTemplateRequest request, CancellationToken ct)
    {
        var requesterId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var template = await _templateService.CreateSystemTemplateAsync(requesterId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = template.Id }, template);
    }

    [HttpGet("system")]
    [ProducesResponseType(typeof(List<TemplateDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<TemplateDetailResponse>>> GetSystemTemplates(CancellationToken ct)
    {
        var requesterId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await _templateService.GetSystemTemplatesAsync(requesterId, ct));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var requesterId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _templateService.DeleteAsync(id, requesterId, User.IsInRole("admin"), ct);
        return NoContent();
    }
}
