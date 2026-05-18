using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillCode.DTOs;
using SkillCode.Interfaces;

namespace SkillCode.Controllers;

[ApiController]
[Route("api/groups")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly IGroupService _groupService;

    public GroupsController(IGroupService groupService)
    {
        _groupService = groupService;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ── Groups ────────────────────────────────────────────────────────────────

    [HttpGet]
    [ProducesResponseType(typeof(List<GroupSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<GroupSummaryResponse>>> GetMyGroups(
        [FromQuery] string? query, CancellationToken ct) =>
        Ok(await _groupService.GetMyGroupsAsync(CurrentUserId, query, ct));

    [HttpPost]
    [ProducesResponseType(typeof(GroupResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<GroupResponse>> Create(
        [FromBody] CreateGroupRequest request, CancellationToken ct)
    {
        var group = await _groupService.CreateGroupAsync(request, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = group.Id }, group);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(GroupDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GroupDetailResponse>> GetById(Guid id, CancellationToken ct) =>
        Ok(await _groupService.GetGroupAsync(id, CurrentUserId, ct));

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(GroupResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GroupResponse>> Update(
        Guid id, [FromBody] UpdateGroupRequest request, CancellationToken ct) =>
        Ok(await _groupService.UpdateGroupAsync(id, request, CurrentUserId, ct));

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _groupService.DeleteGroupAsync(id, CurrentUserId, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/leave")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Leave(Guid id, CancellationToken ct)
    {
        await _groupService.LeaveGroupAsync(id, CurrentUserId, ct);
        return NoContent();
    }

    // ── Members ───────────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/members")]
    [ProducesResponseType(typeof(List<GroupMemberResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<GroupMemberResponse>>> GetMembers(
        Guid id, CancellationToken ct) =>
        Ok(await _groupService.GetMembersAsync(id, CurrentUserId, ct));

    [HttpPost("{id:guid}/members")]
    [ProducesResponseType(typeof(GroupMemberResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GroupMemberResponse>> AddMember(
        Guid id, [FromBody] AddGroupMemberRequest request, CancellationToken ct)
    {
        var member = await _groupService.AddMemberAsync(id, request, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetMembers), new { id }, member);
    }

    [HttpDelete("{id:guid}/members/{memberId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveMember(
        Guid id, Guid memberId, CancellationToken ct)
    {
        await _groupService.RemoveMemberAsync(id, memberId, CurrentUserId, ct);
        return NoContent();
    }

    [HttpPatch("{id:guid}/members/{memberId:guid}/role")]
    [ProducesResponseType(typeof(GroupMemberResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GroupMemberResponse>> UpdateMemberRole(
        Guid id, Guid memberId, [FromBody] UpdateGroupMemberRoleRequest request, CancellationToken ct) =>
        Ok(await _groupService.UpdateMemberRoleAsync(id, memberId, request, CurrentUserId, ct));

    // ── Group Tasks ───────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/tasks")]
    [ProducesResponseType(typeof(List<GroupTaskResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<GroupTaskResponse>>> GetTasks(
        Guid id, CancellationToken ct) =>
        Ok(await _groupService.GetGroupTasksAsync(id, CurrentUserId, ct));

    [HttpPost("{id:guid}/tasks")]
    [ProducesResponseType(typeof(GroupTaskResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<GroupTaskResponse>> AddTask(
        Guid id, [FromBody] AddGroupTaskRequest request, CancellationToken ct)
    {
        var groupTask = await _groupService.AddGroupTaskAsync(id, request, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetTasks), new { id }, groupTask);
    }

    [HttpDelete("{id:guid}/tasks/{groupTaskId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveTask(
        Guid id, Guid groupTaskId, CancellationToken ct)
    {
        await _groupService.RemoveGroupTaskAsync(id, groupTaskId, CurrentUserId, ct);
        return NoContent();
    }

    [HttpGet("{id:guid}/tasks/{groupTaskId:guid}/results")]
    [ProducesResponseType(typeof(List<AttemptResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<AttemptResponse>>> GetTaskResults(
        Guid id, Guid groupTaskId, CancellationToken ct) =>
        Ok(await _groupService.GetGroupTaskResultsAsync(id, groupTaskId, CurrentUserId, ct));

    [HttpGet("{id:guid}/tasks/{groupTaskId:guid}/attempts/{attemptId:guid}")]
    [ProducesResponseType(typeof(AttemptDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AttemptDetailResponse>> GetTaskAttemptDetail(
        Guid id, Guid groupTaskId, Guid attemptId, CancellationToken ct) =>
        Ok(await _groupService.GetGroupTaskAttemptDetailAsync(id, groupTaskId, attemptId, CurrentUserId, ct));
}
