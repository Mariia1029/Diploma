using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using SkillCode.Services;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Services.AnswerStrategies;

public class CodingStrategy : IAnswerCheckStrategy
{
    public TaskType TaskType => TaskType.Coding;

    public Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct)
        => Task.FromResult(new AnswerCheckResult(null, 0m));
}
