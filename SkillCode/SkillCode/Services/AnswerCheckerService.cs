using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Services;

public class AnswerCheckerService : IAnswerCheckerService
{
    private readonly IReadOnlyDictionary<TaskType, IAnswerCheckStrategy> _strategies;

    public AnswerCheckerService(IEnumerable<IAnswerCheckStrategy> strategies)
    {
        _strategies = strategies.ToDictionary(s => s.TaskType);
    }

    public Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct)
    {
        return _strategies.TryGetValue(item.Type, out var strategy)
            ? strategy.CheckAsync(item, userAnswerJson, ct)
            : Task.FromResult(new AnswerCheckResult(null, 0m));
    }
}
