namespace SkillCode.Services;

public record AnswerCheckResult(
    bool?   IsCorrect,
    decimal EarnedPoints,
    string? AiExplanation = null);
