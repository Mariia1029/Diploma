using System;
using System.Collections.Generic;

namespace SkillCode.Models;

public partial class Template
{
    public Guid Id { get; set; }

    public Guid? OwnerId { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public bool IsSystem { get; set; }

    public bool IsPublic { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? Owner { get; set; }

    public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();

    public virtual ICollection<TemplateItem> TemplateItems { get; set; } = new List<TemplateItem>();
}
