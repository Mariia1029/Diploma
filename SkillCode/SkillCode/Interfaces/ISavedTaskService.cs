using SkillCode.DTOs;

namespace SkillCode.Interfaces;

public interface ISavedTaskService
{
    Task SaveAsync(Guid userId, Guid taskId, CancellationToken ct);
    Task UnsaveAsync(Guid userId, Guid taskId, CancellationToken ct);
    Task<List<TaskDetailResponse>> GetSavedAsync(Guid userId, CancellationToken ct);
}
