using System;
using System.Collections.Generic;
using SkillCode.Enums;

namespace SkillCode.Models;

public partial class GroupMember
{
    public Guid Id { get; set; }

    public Guid GroupId { get; set; }

    public Guid UserId { get; set; }

    public GroupRole Role { get; set; }
    
    public DateTime JoinedAt { get; set; }

    public virtual Group Group { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
