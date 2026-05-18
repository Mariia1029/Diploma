using System.Text.Json;
using SkillCode.Enums;

namespace SkillCode.DTOs;

// ── AttemptAnswer ────────────────────────────────────────────────────────────

public class AttemptAnswerResponse
{
    public Guid Id { get; set; }
    public Guid AttemptId { get; set; }
    public Guid TaskItemId { get; set; }
    public string? UserAnswer { get; set; }
    public bool? IsCorrect { get; set; }
    public decimal? EarnedPoints { get; set; }
    public string? AiExplanation { get; set; }
    public DateTime AnsweredAt { get; set; }
}

public class SaveAnswerRequest
{
    public Guid TaskItemId { get; set; }
    public JsonElement UserAnswer { get; set; }
    public DateTime AnsweredAt { get; set; }
}

// ── Attempt ──────────────────────────────────────────────────────────────────

public class AttemptResponse
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
    public int? TimeLimitSeconds { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
}

public class AttemptDetailResponse : AttemptResponse
{
    public List<AttemptAnswerResponse> Answers { get; set; } = new();
}

public class StartAttemptRequest
{
    public Guid TaskId { get; set; }
    public AttemptType ContextType { get; set; }
    public Guid? ContextId { get; set; }
}

public record UpdateAnswerGradeRequest(decimal EarnedPoints, string AiExplanation);