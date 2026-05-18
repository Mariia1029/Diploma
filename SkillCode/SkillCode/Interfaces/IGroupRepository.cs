using SkillCode.Models;

namespace SkillCode.Interfaces;

public interface IGroupRepository
{
    Task<List<(Group Group, int MemberCount)>> GetUserGroupsAsync(Guid userId, string? query, CancellationToken ct);
    Task<Group?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Group?> GetByIdWithDetailsAsync(Guid id, CancellationToken ct);
    System.Threading.Tasks.Task CreateAsync(Group group, CancellationToken ct);
    System.Threading.Tasks.Task UpdateAsync(Group group, CancellationToken ct);
    System.Threading.Tasks.Task DeleteAsync(Group group, CancellationToken ct);

    Task<GroupMember?> GetMemberAsync(Guid groupId, Guid userId, CancellationToken ct);
    Task<GroupMember?> GetMemberByIdAsync(Guid memberId, CancellationToken ct);
    System.Threading.Tasks.Task AddMemberAsync(GroupMember member, CancellationToken ct);
    System.Threading.Tasks.Task UpdateMemberAsync(GroupMember member, CancellationToken ct);
    System.Threading.Tasks.Task RemoveMemberAsync(GroupMember member, CancellationToken ct);

    Task<GroupTask?> GetGroupTaskAsync(Guid groupId, Guid taskId, CancellationToken ct);
    Task<GroupTask?> GetGroupTaskByIdAsync(Guid groupTaskId, CancellationToken ct);
    System.Threading.Tasks.Task AddGroupTaskAsync(GroupTask groupTask, CancellationToken ct);
    System.Threading.Tasks.Task RemoveGroupTaskAsync(GroupTask groupTask, CancellationToken ct);

    Task<List<Attempt>> GetGroupTaskAttemptsAsync(Guid groupId, Guid taskId, CancellationToken ct);
    Task<List<Attempt>> GetGroupTaskAttemptsForUserAsync(Guid groupId, Guid taskId, Guid userId, CancellationToken ct);
}
