using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillCode.DTOs;
using SkillCode.Interfaces;

namespace SkillCode.Controllers;

[ApiController]
[Route("api/shares")]
[Authorize]
public class SharesController : ControllerBase
{
    private readonly ITaskShareService _shareService;

    public SharesController(ITaskShareService shareService)
    {
        _shareService = shareService;
    }

    [HttpGet("received")]
    [ProducesResponseType(typeof(PagedResult<ReceivedShareResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PagedResult<ReceivedShareResponse>>> GetReceived(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] bool? isRead = null,
        CancellationToken ct = default)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _shareService.GetReceivedAsync(userId, page, limit, isRead, ct);
        return Ok(result);
    }

    [HttpGet("sent")]
    [ProducesResponseType(typeof(PagedResult<SentShareResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PagedResult<SentShareResponse>>> GetSent(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _shareService.GetSentAsync(userId, page, limit, ct);
        return Ok(result);
    }

    [HttpPatch("{shareId:guid}/read")]
    [ProducesResponseType(typeof(MarkReadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MarkReadResponse>> MarkRead(
        Guid shareId, [FromBody] MarkReadRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _shareService.MarkReadAsync(userId, shareId, request.IsRead, ct);
        return Ok(result);
    }

    [HttpPost("{shareId:guid}/attempt")]
    [ProducesResponseType(typeof(EphemeralAttemptResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EphemeralAttemptResult>> EphemeralAttempt(
        Guid shareId, [FromBody] EphemeralAttemptRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _shareService.EphemeralAttemptFromShareAsync(userId, shareId, request, ct);
        return Ok(result);
    }

    [HttpPost("{shareId:guid}/save")]
    [ProducesResponseType(typeof(SaveShareResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SaveShareResponse>> Save(Guid shareId, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _shareService.SaveFromShareAsync(userId, shareId, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpDelete("{shareId:guid}/save")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unsave(Guid shareId, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _shareService.UnsaveFromShareAsync(userId, shareId, ct);
        return NoContent();
    }
}
