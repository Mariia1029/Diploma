using System.ComponentModel.DataAnnotations;
using SkillCode.Enums;

namespace SkillCode.DTOs;

// ── GroupMember ───────────────────────────────────────────────────────────────

public class GroupMemberResponse
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public UserSummaryResponse User { get; set; } = null!;
    public GroupRole Role { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class AddGroupMemberRequest
{
    [Required(ErrorMessage = "Ідентифікатор користувача є обов'язковим")]
    public Guid UserId { get; set; }

    [Required(ErrorMessage = "Роль є обов'язковою")]
    public GroupRole Role { get; set; }
}

public class UpdateGroupMemberRoleRequest
{
    public GroupRole Role { get; set; }
}

// ── GroupTask ─────────────────────────────────────────────────────────────────

public class GroupTaskResponse
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public TaskResponse Task { get; set; } = null!;
    public UserSummaryResponse? SharedByUser { get; set; }
    public bool CollectResults { get; set; }
    public DateTime AddedAt { get; set; }
}

public class AddGroupTaskRequest
{
    [Required(ErrorMessage = "Ідентифікатор завдання є обов'язковим")]
    public Guid TaskId { get; set; }

    public bool CollectResults { get; set; }
}

// ── Group ─────────────────────────────────────────────────────────────────────

public class GroupResponse
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class GroupDetailResponse : GroupResponse
{
    public UserSummaryResponse Owner { get; set; } = null!;
    public List<GroupMemberResponse> Members { get; set; } = new();
    public List<GroupTaskResponse> Tasks { get; set; } = new();
}

public class CreateGroupRequest
{
    [Required(ErrorMessage = "Назва групи є обов'язковою")]
    [StringLength(100, ErrorMessage = "Назва групи не може перевищувати 100 символів")]
    public string Name { get; set; } = null!;

    [StringLength(500, ErrorMessage = "Опис не може перевищувати 500 символів")]
    public string? Description { get; set; }
}

public class UpdateGroupRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
}

public class GroupSummaryResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public int MemberCount { get; set; }
}