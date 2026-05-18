using System;
using System.Collections.Generic;

namespace SkillCode.Models;

public partial class AttemptAnswer
{
    public Guid Id { get; set; }

    public Guid AttemptId { get; set; }

    public Guid TaskItemId { get; set; }

    public string? UserAnswer { get; set; }

    public bool? IsCorrect { get; set; }

    public decimal? EarnedPoints { get; set; }

    public string? AiExplanation { get; set; }

    public DateTime AnsweredAt { get; set; }

    public virtual Attempt Attempt { get; set; } = null!;

    public virtual TaskItem TaskItem { get; set; } = null!;
}
