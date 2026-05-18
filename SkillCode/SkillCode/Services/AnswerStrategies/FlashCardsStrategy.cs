using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using SkillCode.Services;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Services.AnswerStrategies;

public class FlashCardsStrategy : IAnswerCheckStrategy
{
    public TaskType TaskType => TaskType.FlashCards;

    public Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct)
    {
        var known = AnswerStrategyHelper.Deserialize<bool>(userAnswerJson);
        return Task.FromResult(new AnswerCheckResult(known, known ? item.Points : 0m));
    }
}
