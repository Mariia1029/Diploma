using AutoMapper;
using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Exceptions;
using SkillCode.Interfaces;
using SkillCode.Models;
using TaskStatus = SkillCode.Enums.TaskStatus;

namespace SkillCode.Services;

public class GroupService : IGroupService
{
    private readonly IGroupRepository _groupRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IUserRepository _userRepository;
    private readonly IAttemptRepository _attemptRepository;
    private readonly IMapper _mapper;

    public GroupService(
        IGroupRepository groupRepository,
        ITaskRepository taskRepository,
        IUserRepository userRepository,
        IAttemptRepository attemptRepository,
        IMapper mapper)
    {
        _groupRepository = groupRepository;
        _taskRepository = taskRepository;
        _userRepository = userRepository;
        _attemptRepository = attemptRepository;
        _mapper = mapper;
    }

    public async Task<List<GroupSummaryResponse>> GetMyGroupsAsync(
        Guid userId, string? query, CancellationToken ct)
    {
        var groups = await _groupRepository.GetUserGroupsAsync(userId, query, ct);
        return groups
            .Select(x => new GroupSummaryResponse
            {
                Id = x.Group.Id,
                Name = x.Group.Name,
                MemberCount = x.MemberCount
            })
            .ToList();
    }

    public async Task<GroupDetailResponse> GetGroupAsync(
        Guid groupId, Guid currentUserId, CancellationToken ct)
    {
        var group = await _groupRepository.GetByIdWithDetailsAsync(groupId, ct)
            ?? throw new GroupNotFoundException(groupId);

        if (!group.GroupMembers.Any(m => m.UserId == currentUserId))
            throw new GroupForbiddenException();

        return _mapper.Map<GroupDetailResponse>(group);
    }

    public async Task<GroupResponse> CreateGroupAsync(
        CreateGroupRequest request, Guid ownerId, CancellationToken ct)
    {
        var group = new Group
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            Name = request.Name,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _groupRepository.CreateAsync(group, ct);

        var ownerMember = new GroupMember
        {
            Id = Guid.NewGuid(),
            GroupId = group.Id,
            UserId = ownerId,
            Role = GroupRole.Owner,
            JoinedAt = DateTime.UtcNow
        };

        await _groupRepository.AddMemberAsync(ownerMember, ct);

        return _mapper.Map<GroupResponse>(group);
    }

    public async Task<GroupResponse> UpdateGroupAsync(
        Guid groupId, UpdateGroupRequest request, Guid currentUserId, CancellationToken ct)
    {
        var group = await _groupRepository.GetByIdAsync(groupId, ct)
            ?? throw new GroupNotFoundException(groupId);

        var caller = await _groupRepository.GetMemberAsync(groupId, currentUserId, ct);
        if (caller == null || (caller.Role != GroupRole.Owner && caller.Role != GroupRole.Admin))
            throw new GroupForbiddenException();

        if (request.Name != null) group.Name = request.Name;
        if (request.Description != null) group.Description = request.Description;
        group.UpdatedAt = DateTime.UtcNow;

        await _groupRepository.UpdateAsync(group, ct);

        return _mapper.Map<GroupResponse>(group);
    }

    public async System.Threading.Tasks.Task DeleteGroupAsync(
        Guid groupId, Guid currentUserId, CancellationToken ct)
    {
        var group = await _groupRepository.GetByIdAsync(groupId, ct)
            ?? throw new GroupNotFoundException(groupId);

        var caller = await _groupRepository.GetMemberAsync(groupId, currentUserId, ct);
        if (caller == null || caller.Role != GroupRole.Owner)
            throw new GroupForbiddenException();

        await _groupRepository.DeleteAsync(group, ct);
    }

    public async Task<List<GroupMemberResponse>> GetMembersAsync(
        Guid groupId, Guid currentUserId, CancellationToken ct)
    {
        var group = await _groupRepository.GetByIdWithDetailsAsync(groupId, ct)
            ?? throw new GroupNotFoundException(groupId);

        if (!group.GroupMembers.Any(m => m.UserId == currentUserId))
            throw new GroupForbiddenException();

        return _mapper.Map<List<GroupMemberResponse>>(group.GroupMembers);
    }

    public async Task<GroupMemberResponse> AddMemberAsync(
        Guid groupId, AddGroupMemberRequest request, Guid currentUserId, CancellationToken ct)
    {
        _ = await _groupRepository.GetByIdAsync(groupId, ct)
            ?? throw new GroupNotFoundException(groupId);

        var caller = await _groupRepository.GetMemberAsync(groupId, currentUserId, ct);
        if (caller == null || (caller.Role != GroupRole.Owner && caller.Role != GroupRole.Admin))
            throw new GroupForbiddenException();

        var targetUser = await _userRepository.GetByIdAsync(request.UserId, ct)
            ?? throw new UserNotFoundException();

        var existing = await _groupRepository.GetMemberAsync(groupId, request.UserId, ct);
        if (existing != null)
            throw new GroupMemberAlreadyExistsException();

        if (request.Role == GroupRole.Owner)
            throw new GroupForbiddenException("Неможливо призначити роль власника");

        if (caller.Role == GroupRole.Admin && request.Role != GroupRole.Member)
            throw new GroupForbiddenException("Адміністратор може додавати лише учасників");

        var member = new GroupMember
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            UserId = request.UserId,
            Role = request.Role,
            JoinedAt = DateTime.UtcNow
        };
        member.User = targetUser;

        await _groupRepository.AddMemberAsync(member, ct);

        return _mapper.Map<GroupMemberResponse>(member);
    }

    public async System.Threading.Tasks.Task RemoveMemberAsync(
        Guid groupId, Guid memberId, Guid currentUserId, CancellationToken ct)
    {
        _ = await _groupRepository.GetByIdAsync(groupId, ct)
            ?? throw new GroupNotFoundException(groupId);

        var target = await _groupRepository.GetMemberByIdAsync(memberId, ct)
            ?? throw new GroupMemberNotFoundException();

        if (target.GroupId != groupId)
            throw new GroupMemberNotFoundException();

        var caller = await _groupRepository.GetMemberAsync(groupId, currentUserId, ct)
            ?? throw new GroupForbiddenException();

        if (target.Role == GroupRole.Owner)
            throw new GroupForbiddenException("Неможливо видалити власника групи");

        if (caller.Role == GroupRole.Member)
            throw new GroupForbiddenException();

        if (caller.Role == GroupRole.Admin && target.Role != GroupRole.Member)
            throw new GroupForbiddenException("Адміністратор може видаляти лише учасників");

        await _groupRepository.RemoveMemberAsync(target, ct);
    }

    public async Task<GroupMemberResponse> UpdateMemberRoleAsync(
        Guid groupId, Guid memberId, UpdateGroupMemberRoleRequest request, Guid currentUserId, CancellationToken ct)
    {
        _ = await _groupRepository.GetByIdAsync(groupId, ct)
            ?? throw new GroupNotFoundException(groupId);

        var target = await _groupRepository.GetMemberByIdAsync(memberId, ct)
            ?? throw new GroupMemberNotFoundException();

        if (target.GroupId != groupId)
            throw new GroupMemberNotFoundException();

        var caller = await _groupRepository.GetMemberAsync(groupId, currentUserId, ct)
            ?? throw new GroupForbiddenException();

        if (caller.Role != GroupRole.Owner)
            throw new GroupForbiddenException("Тільки власник може змінювати ролі учасників");

        if (target.Role == GroupRole.Owner)
            throw new GroupForbiddenException("Неможливо змінити роль власника");

        if (request.Role == GroupRole.Owner)
            throw new GroupForbiddenException("Неможливо призначити роль власника через цю дію");

        target.Role = request.Role;
        await _groupRepository.UpdateMemberAsync(target, ct);

        return _mapper.Map<GroupMemberResponse>(target);
    }

    public async System.Threading.Tasks.Task LeaveGroupAsync(
        Guid groupId, Guid currentUserId, CancellationToken ct)
    {
        _ = await _groupRepository.GetByIdAsync(groupId, ct)
            ?? throw new GroupNotFoundException(groupId);

        var caller = await _groupRepository.GetMemberAsync(groupId, currentUserId, ct)
            ?? throw new GroupForbiddenException();

        if (caller.Role == GroupRole.Owner)
            throw new GroupForbiddenException("Власник не може покинути групу. Спочатку передайте права власника.");

        await _groupRepository.RemoveMemberAsync(caller, ct);
    }

    public async Task<List<GroupTaskResponse>> GetGroupTasksAsync(
        Guid groupId, Guid currentUserId, CancellationToken ct)
    {
        var group = await _groupRepository.GetByIdWithDetailsAsync(groupId, ct)
            ?? throw new GroupNotFoundException(groupId);

        if (!group.GroupMembers.Any(m => m.UserId == currentUserId))
            throw new GroupForbiddenException();

        return _mapper.Map<List<GroupTaskResponse>>(group.GroupTasks);
    }

    public async Task<GroupTaskResponse> AddGroupTaskAsync(
        Guid groupId, AddGroupTaskRequest request, Guid currentUserId, CancellationToken ct)
    {
        _ = await _groupRepository.GetByIdAsync(groupId, ct)
            ?? throw new GroupNotFoundException(groupId);

        var caller = await _groupRepository.GetMemberAsync(groupId, currentUserId, ct)
            ?? throw new GroupForbiddenException();

        var task = await _taskRepository.GetByIdAsync(request.TaskId, ct)
            ?? throw new TaskNotFoundException(request.TaskId);

        if (task.OwnerId != currentUserId && task.Status != TaskStatus.Public)
            throw new GroupForbiddenException("До групи можна додавати лише власні або публічні завдання");

        var existing = await _groupRepository.GetGroupTaskAsync(groupId, request.TaskId, ct);
        if (existing != null)
            throw new GroupTaskAlreadyExistsException();

        var groupTask = new GroupTask
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            TaskId = request.TaskId,
            SharedByUserId = currentUserId,
            CollectResults = request.CollectResults,
            AddedAt = DateTime.UtcNow
        };
        groupTask.Task = task;

        var sharer = await _userRepository.GetByIdAsync(currentUserId, ct);
        groupTask.SharedByUser = sharer;

        await _groupRepository.AddGroupTaskAsync(groupTask, ct);

        return _mapper.Map<GroupTaskResponse>(groupTask);
    }

    public async System.Threading.Tasks.Task RemoveGroupTaskAsync(
        Guid groupId, Guid groupTaskId, Guid currentUserId, CancellationToken ct)
    {
        var groupTask = await _groupRepository.GetGroupTaskByIdAsync(groupTaskId, ct)
            ?? throw new GroupTaskNotFoundException();

        if (groupTask.GroupId != groupId)
            throw new GroupTaskNotFoundException();

        var caller = await _groupRepository.GetMemberAsync(groupId, currentUserId, ct)
            ?? throw new GroupForbiddenException();

        var isOwnerOrAdmin = caller.Role == GroupRole.Owner || caller.Role == GroupRole.Admin;
        var isSharer = groupTask.SharedByUserId == currentUserId;

        if (!isOwnerOrAdmin && !isSharer)
            throw new GroupForbiddenException();

        await _groupRepository.RemoveGroupTaskAsync(groupTask, ct);
    }

    public async Task<List<AttemptResponse>> GetGroupTaskResultsAsync(
        Guid groupId, Guid groupTaskId, Guid currentUserId, CancellationToken ct)
    {
        var groupTask = await _groupRepository.GetGroupTaskByIdAsync(groupTaskId, ct)
            ?? throw new GroupTaskNotFoundException();

        if (groupTask.GroupId != groupId)
            throw new GroupTaskNotFoundException();

        _ = await _groupRepository.GetMemberAsync(groupId, currentUserId, ct)
            ?? throw new GroupForbiddenException("Ви не є учасником цієї групи");

        List<Attempt> attempts;

        if (currentUserId == groupTask.SharedByUserId && groupTask.CollectResults)
            attempts = await _groupRepository.GetGroupTaskAttemptsAsync(groupId, groupTask.TaskId, ct);
        else
            attempts = await _groupRepository.GetGroupTaskAttemptsForUserAsync(groupId, groupTask.TaskId, currentUserId, ct);

        return _mapper.Map<List<AttemptResponse>>(attempts);
    }

    public async Task<AttemptDetailResponse> GetGroupTaskAttemptDetailAsync(
        Guid groupId, Guid groupTaskId, Guid attemptId, Guid currentUserId, CancellationToken ct)
    {
        var groupTask = await _groupRepository.GetGroupTaskByIdAsync(groupTaskId, ct)
            ?? throw new GroupTaskNotFoundException();

        if (groupTask.GroupId != groupId)
            throw new GroupTaskNotFoundException();

        _ = await _groupRepository.GetMemberAsync(groupId, currentUserId, ct)
            ?? throw new GroupForbiddenException("Ви не є учасником цієї групи");

        if (currentUserId != groupTask.SharedByUserId || !groupTask.CollectResults)
            throw new GroupForbiddenException("Перегляд деталей спроби доступний лише автору завдання з увімкненим збором результатів");

        var attempt = await _attemptRepository.GetByIdWithAnswersAsync(attemptId, ct)
            ?? throw new AttemptNotFoundException(attemptId);

        if (attempt.ContextType != Enums.AttemptType.Group
            || attempt.ContextId != groupId
            || attempt.TaskId != groupTask.TaskId)
            throw new AttemptNotFoundException(attemptId);

        return _mapper.Map<AttemptDetailResponse>(attempt);
    }
}
