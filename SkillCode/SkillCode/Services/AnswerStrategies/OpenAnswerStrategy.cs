using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using SkillCode.Services;

namespace SkillCode.Services.AnswerStrategies;

public class OpenAnswerStrategy : IAnswerCheckStrategy
{
    private readonly IAiService _ai;

    public OpenAnswerStrategy(IAiService ai) => _ai = ai;

    public TaskType TaskType => TaskType.Open;

    public async Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct)
    {
        var user = AnswerStrategyHelper.Deserialize<string>(userAnswerJson);

        if (string.IsNullOrWhiteSpace(user))
            return new AnswerCheckResult(false, 0m, "// відповідь не надано");

        var gradeResult = await _ai.GradeAnswerAsync(
            new GradeAnswerRequest(item.Question, user, item.Points), ct);

        var isCorrect = gradeResult.Score > item.Points / 2m;
        return new AnswerCheckResult(isCorrect, gradeResult.Score, gradeResult.Feedback);
    }
}
