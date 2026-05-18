using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using SkillCode.Services;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Services.AnswerStrategies;

public class TrueFalseStrategy : IAnswerCheckStrategy
{
    public TaskType TaskType => TaskType.TrueFalse;

    public Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct)
    {
        var correct   = AnswerStrategyHelper.Deserialize<bool>(item.CorrectAnswer);
        var user      = AnswerStrategyHelper.Deserialize<bool>(userAnswerJson);
        var isCorrect = correct == user;
        return Task.FromResult(new AnswerCheckResult(isCorrect, isCorrect ? item.Points : 0m));
    }
}
