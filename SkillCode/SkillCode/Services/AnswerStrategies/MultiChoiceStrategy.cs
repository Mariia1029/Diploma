using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using SkillCode.Services;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Services.AnswerStrategies;

public class MultiChoiceStrategy : IAnswerCheckStrategy
{
    public TaskType TaskType => TaskType.MultiChoice;

    public Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct)
    {
        var correct      = AnswerStrategyHelper.Deserialize<string[]>(item.CorrectAnswer) ?? [];
        var user         = AnswerStrategyHelper.Deserialize<string[]>(userAnswerJson) ?? [];
        var correctSet   = new HashSet<string>(correct, StringComparer.OrdinalIgnoreCase);
        var userSet      = new HashSet<string>(user, StringComparer.OrdinalIgnoreCase);
        var isCorrect    = correctSet.SetEquals(userSet);
        var correctHits  = user.Count(a => correctSet.Contains(a));
        var score        = correctSet.Count == 0 ? 0m : item.Points * ((decimal)correctHits / correctSet.Count);
        return Task.FromResult(new AnswerCheckResult(isCorrect, score));
    }
}
