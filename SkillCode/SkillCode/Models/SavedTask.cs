using System;
using System.Collections.Generic;

namespace SkillCode.Models;

public partial class SavedTask
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid TaskId { get; set; }

    public DateTime SavedAt { get; set; }

    public virtual Task Task { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
