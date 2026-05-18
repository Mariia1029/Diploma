using System;
using System.Collections.Generic;
using SkillCode.Enums;
using TaskStatus = SkillCode.Enums.TaskStatus;

namespace SkillCode.Models;

public partial class Task
{
    public Guid Id { get; set; }

    public Guid OwnerId { get; set; }

    public Guid? TemplateId { get; set; }

    public string Title { get; set; } = null!;
    
    public TaskStatus Status { get; set; }
    
    public ProgrammingLanguage Language { get; set; }

    public bool AiGenerated { get; set; }

    public bool IsCopy { get; set; }

    public int? TimeLimitSeconds { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<Attempt> Attempts { get; set; } = new List<Attempt>();

    public virtual ICollection<GroupTask> GroupTasks { get; set; } = new List<GroupTask>();

    public virtual User Owner { get; set; } = null!;

    public virtual ICollection<SavedTask> SavedTasks { get; set; } = new List<SavedTask>();

    public virtual ICollection<TaskItem> TaskItems { get; set; } = new List<TaskItem>();

    public virtual ICollection<TaskShare> TaskShares { get; set; } = new List<TaskShare>();

    public virtual Template? Template { get; set; }
}
