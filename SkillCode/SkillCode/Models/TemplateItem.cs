using System;
using System.Collections.Generic;
using SkillCode.Enums;

namespace SkillCode.Models;

public partial class TemplateItem
{
    public Guid Id { get; set; }

    public Guid TemplateId { get; set; }
    
    public TaskType Type { get; set; }

    public string Content { get; set; } = null!;

    public int OrderIndex { get; set; }

    public virtual ICollection<TaskItem> TaskItems { get; set; } = new List<TaskItem>();

    public virtual Template Template { get; set; } = null!;
}
