using SkillCode.DTOs;

namespace SkillCode.Interfaces;

public interface IGroupService
{
    Task<List<GroupSummaryResponse>> GetMyGroupsAsync(Guid userId, string? query, CancellationToken ct);
    Task<GroupDetailResponse> GetGroupAsync(Guid groupId, Guid currentUserId, CancellationToken ct);
    Task<GroupResponse> CreateGroupAsync(CreateGroupRequest request, Guid ownerId, CancellationToken ct);
    Task<GroupResponse> UpdateGroupAsync(Guid groupId, UpdateGroupRequest request, Guid currentUserId, CancellationToken ct);
    System.Threading.Tasks.Task DeleteGroupAsync(Guid groupId, Guid currentUserId, CancellationToken ct);

    Task<List<GroupMemberResponse>> GetMembersAsync(Guid groupId, Guid currentUserId, CancellationToken ct);
    Task<GroupMemberResponse> AddMemberAsync(Guid groupId, AddGroupMemberRequest request, Guid currentUserId, CancellationToken ct);
    System.Threading.Tasks.Task RemoveMemberAsync(Guid groupId, Guid memberId, Guid currentUserId, CancellationToken ct);
    Task<GroupMemberResponse> UpdateMemberRoleAsync(Guid groupId, Guid memberId, UpdateGroupMemberRoleRequest request, Guid currentUserId, CancellationToken ct);
    System.Threading.Tasks.Task LeaveGroupAsync(Guid groupId, Guid currentUserId, CancellationToken ct);

    Task<List<GroupTaskResponse>> GetGroupTasksAsync(Guid groupId, Guid currentUserId, CancellationToken ct);
    Task<GroupTaskResponse> AddGroupTaskAsync(Guid groupId, AddGroupTaskRequest request, Guid currentUserId, CancellationToken ct);
    System.Threading.Tasks.Task RemoveGroupTaskAsync(Guid groupId, Guid groupTaskId, Guid currentUserId, CancellationToken ct);
    Task<List<AttemptResponse>> GetGroupTaskResultsAsync(Guid groupId, Guid groupTaskId, Guid currentUserId, CancellationToken ct);
    Task<AttemptDetailResponse> GetGroupTaskAttemptDetailAsync(Guid groupId, Guid groupTaskId, Guid attemptId, Guid currentUserId, CancellationToken ct);
}
