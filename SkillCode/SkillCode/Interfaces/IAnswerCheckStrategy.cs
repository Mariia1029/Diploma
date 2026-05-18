using SkillCode.Enums;
using SkillCode.Models;
using SkillCode.Services;

namespace SkillCode.Interfaces;

public interface IAnswerCheckStrategy
{
    TaskType TaskType { get; }
    Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct);
}
