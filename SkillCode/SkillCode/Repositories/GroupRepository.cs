using Microsoft.EntityFrameworkCore;
using SkillCode.Data;
using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;

namespace SkillCode.Repositories;

public class GroupRepository : IGroupRepository
{
    private readonly AppDbContext _db;

    public GroupRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<(Group Group, int MemberCount)>> GetUserGroupsAsync(
        Guid userId, string? query, CancellationToken ct)
    {
        var groupIds = await _db.GroupMembers
            .Where(m => m.UserId == userId)
            .Select(m => m.GroupId)
            .ToListAsync(ct);

        var q = _db.Groups.Where(g => groupIds.Contains(g.Id));

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lower = query.ToLower();
            q = q.Where(g => g.Name.ToLower().Contains(lower));
        }

        var groups = await q.ToListAsync(ct);

        var counts = await _db.GroupMembers
            .Where(m => groupIds.Contains(m.GroupId))
            .GroupBy(m => m.GroupId)
            .Select(g => new { GroupId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.GroupId, x => x.Count, ct);

        return groups
            .Select(g => (g, counts.TryGetValue(g.Id, out var c) ? c : 0))
            .ToList();
    }

    public async Task<Group?> GetByIdAsync(Guid id, CancellationToken ct) =>
        await _db.Groups.FirstOrDefaultAsync(g => g.Id == id, ct);

    public async Task<Group?> GetByIdWithDetailsAsync(Guid id, CancellationToken ct) =>
        await _db.Groups
            .Include(g => g.Owner)
            .Include(g => g.GroupMembers).ThenInclude(m => m.User)
            .Include(g => g.GroupTasks).ThenInclude(gt => gt.Task)
            .Include(g => g.GroupTasks).ThenInclude(gt => gt.SharedByUser)
            .FirstOrDefaultAsync(g => g.Id == id, ct);

    public async System.Threading.Tasks.Task CreateAsync(Group group, CancellationToken ct)
    {
        _db.Groups.Add(group);
        await _db.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task UpdateAsync(Group group, CancellationToken ct)
    {
        _db.Groups.Update(group);
        await _db.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task DeleteAsync(Group group, CancellationToken ct)
    {
        _db.Groups.Remove(group);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<GroupMember?> GetMemberAsync(Guid groupId, Guid userId, CancellationToken ct) =>
        await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == userId, ct);

    public async Task<GroupMember?> GetMemberByIdAsync(Guid memberId, CancellationToken ct) =>
        await _db.GroupMembers
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct);

    public async System.Threading.Tasks.Task AddMemberAsync(GroupMember member, CancellationToken ct)
    {
        _db.GroupMembers.Add(member);
        await _db.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task UpdateMemberAsync(GroupMember member, CancellationToken ct)
    {
        _db.GroupMembers.Update(member);
        await _db.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task RemoveMemberAsync(GroupMember member, CancellationToken ct)
    {
        _db.GroupMembers.Remove(member);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<GroupTask?> GetGroupTaskAsync(Guid groupId, Guid taskId, CancellationToken ct) =>
        await _db.GroupTasks
            .FirstOrDefaultAsync(gt => gt.GroupId == groupId && gt.TaskId == taskId, ct);

    public async Task<GroupTask?> GetGroupTaskByIdAsync(Guid groupTaskId, CancellationToken ct) =>
        await _db.GroupTasks
            .Include(gt => gt.Task)
            .Include(gt => gt.SharedByUser)
            .FirstOrDefaultAsync(gt => gt.Id == groupTaskId, ct);

    public async System.Threading.Tasks.Task AddGroupTaskAsync(GroupTask groupTask, CancellationToken ct)
    {
        _db.GroupTasks.Add(groupTask);
        await _db.SaveChangesAsync(ct);
    }

    public async System.Threading.Tasks.Task RemoveGroupTaskAsync(GroupTask groupTask, CancellationToken ct)
    {
        _db.GroupTasks.Remove(groupTask);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<List<Attempt>> GetGroupTaskAttemptsAsync(Guid groupId, Guid taskId, CancellationToken ct) =>
        await _db.Attempts
            .Include(a => a.Task)
            .Where(a => a.ContextType == AttemptType.Group && a.ContextId == groupId && a.TaskId == taskId)
            .ToListAsync(ct);

    public async Task<List<Attempt>> GetGroupTaskAttemptsForUserAsync(
        Guid groupId, Guid taskId, Guid userId, CancellationToken ct) =>
        await _db.Attempts
            .Include(a => a.Task)
            .Where(a => a.ContextType == AttemptType.Group
                     && a.ContextId == groupId
                     && a.TaskId == taskId
                     && a.UserId == userId)
            .ToListAsync(ct);
}
