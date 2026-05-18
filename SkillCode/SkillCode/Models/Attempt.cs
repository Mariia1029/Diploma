using System;
using System.Collections.Generic;
using SkillCode.Enums;

namespace SkillCode.Models;

public partial class Attempt
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid TaskId { get; set; }
    
    public AttemptType ContextType { get; set; }

    public Guid? ContextId { get; set; }

    public decimal EarnedPoints { get; set; }

    public decimal MaxPoints { get; set; }

    public AttemptStatus Status { get; set; } 

    public int? DurationSeconds { get; set; }

    public DateTime StartedAt { get; set; }

    public DateTime? FinishedAt { get; set; }

    public virtual ICollection<AttemptAnswer> AttemptAnswers { get; set; } = new List<AttemptAnswer>();

    public virtual Task Task { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
