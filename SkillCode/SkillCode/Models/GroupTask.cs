using System;
using System.Collections.Generic;

namespace SkillCode.Models;

public partial class GroupTask
{
    public Guid Id { get; set; }

    public Guid GroupId { get; set; }

    public Guid TaskId { get; set; }

    public Guid? SharedByUserId { get; set; }

    public bool CollectResults { get; set; }

    public DateTime AddedAt { get; set; }

    public virtual Group Group { get; set; } = null!;

    public virtual User? SharedByUser { get; set; }

    public virtual Task Task { get; set; } = null!;
}
