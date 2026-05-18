using SkillCode.Models;
using SkillCode.Services;

namespace SkillCode.Interfaces;

public interface IAnswerCheckerService
{
    Task<AnswerCheckResult> CheckAsync(TaskItem item, string userAnswerJson, CancellationToken ct);
}
