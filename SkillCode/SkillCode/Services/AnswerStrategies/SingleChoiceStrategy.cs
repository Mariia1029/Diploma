using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using SkillCode.Services;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Services.AnswerStrategies;

public class SingleChoiceStrategy : IAnswerCheckStrategy
{
    public TaskType TaskType => TaskType.SingleChoice;

    public Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct)
    {
        var correct   = AnswerStrategyHelper.Deserialize<string>(item.CorrectAnswer);
        var user      = AnswerStrategyHelper.Deserialize<string>(userAnswerJson);
        var isCorrect = string.Equals(correct, user, StringComparison.OrdinalIgnoreCase);
        return Task.FromResult(new AnswerCheckResult(isCorrect, isCorrect ? item.Points : 0m));
    }
}
