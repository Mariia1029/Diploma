using System;
using System.Collections.Generic;
using SkillCode.Enums;

namespace SkillCode.Models;

public partial class TaskItem
{
    public Guid Id { get; set; }

    public Guid TaskId { get; set; }

    public Guid? TemplateItemId { get; set; }

    public int OrderIndex { get; set; }
    
    public TaskType Type { get; set; }

    public string Question { get; set; } = null!;

    public string? Options { get; set; }

    public string CorrectAnswer { get; set; } = null!;

    public bool MultiAnswer { get; set; }

    public string? Explanation { get; set; }

    public decimal Points { get; set; }

    public virtual ICollection<AttemptAnswer> AttemptAnswers { get; set; } = new List<AttemptAnswer>();

    public virtual Task Task { get; set; } = null!;

    public virtual TemplateItem? TemplateItem { get; set; }
}
