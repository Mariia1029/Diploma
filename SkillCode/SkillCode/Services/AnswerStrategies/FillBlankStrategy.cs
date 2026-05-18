using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using SkillCode.Services;

namespace SkillCode.Services.AnswerStrategies;

public class FillBlankStrategy : IAnswerCheckStrategy
{
    private readonly IAiService _ai;

    public FillBlankStrategy(IAiService ai) => _ai = ai;

    public TaskType TaskType => TaskType.FillBlank;

    public async Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct)
    {
        var user = AnswerStrategyHelper.Deserialize<string>(userAnswerJson);

        if (string.IsNullOrWhiteSpace(user))
            return new AnswerCheckResult(false, 0m);

        var gradeResult = await _ai.GradeFillBlankAsync(
            new GradeFillBlankRequest(item.Question, item.CorrectAnswer, user, item.Points), ct);

        var isCorrect = gradeResult.Score > item.Points / 2m;
        return new AnswerCheckResult(isCorrect, gradeResult.Score, gradeResult.Feedback);
    }
}
