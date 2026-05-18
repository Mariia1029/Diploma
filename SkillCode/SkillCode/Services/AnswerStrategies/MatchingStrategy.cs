using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using SkillCode.Services;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Services.AnswerStrategies;

public class MatchingStrategy : IAnswerCheckStrategy
{
    public TaskType TaskType => TaskType.Matching;

    private record MatchPair(string Left, string Right);

    public Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct)
    {
        var correct      = AnswerStrategyHelper.Deserialize<MatchPair[]>(item.CorrectAnswer) ?? [];
        var user         = AnswerStrategyHelper.Deserialize<MatchPair[]>(userAnswerJson) ?? [];
        var correctSet   = new HashSet<string>(correct.Select(p => $"{p.Left}:{p.Right}"), StringComparer.OrdinalIgnoreCase);
        var userSet      = new HashSet<string>(user.Select(p => $"{p.Left}:{p.Right}"), StringComparer.OrdinalIgnoreCase);
        var isCorrect    = correctSet.SetEquals(userSet);
        var correctHits  = userSet.Count(p => correctSet.Contains(p));
        var score        = correctSet.Count == 0 ? 0m : item.Points * ((decimal)correctHits / correctSet.Count);
        return Task.FromResult(new AnswerCheckResult(isCorrect, score));
    }
}
