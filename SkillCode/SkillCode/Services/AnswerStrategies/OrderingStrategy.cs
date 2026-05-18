using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using SkillCode.Services;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Services.AnswerStrategies;

public class OrderingStrategy : IAnswerCheckStrategy
{
    public TaskType TaskType => TaskType.Ordering;

    public Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct)
    {
        var correct         = AnswerStrategyHelper.Deserialize<string[]>(item.CorrectAnswer) ?? [];
        var user            = AnswerStrategyHelper.Deserialize<string[]>(userAnswerJson) ?? [];
        var isCorrect       = correct.SequenceEqual(user, StringComparer.OrdinalIgnoreCase);
        var correctPositions = correct.Where((c, i) => i < user.Length && StringComparer.OrdinalIgnoreCase.Equals(c, user[i])).Count();
        var score           = correct.Length == 0 ? 0m : item.Points * ((decimal)correctPositions / correct.Length);
        return Task.FromResult(new AnswerCheckResult(isCorrect, score));
    }
}
