using SkillCode.Models;

namespace SkillCode.Interfaces;

public interface ISavedTaskRepository
{
    Task<SavedTask?> GetByUserAndTaskAsync(Guid userId, Guid taskId, CancellationToken ct);
    Task<SavedTask> AddAsync(SavedTask savedTask, CancellationToken ct);
    void Remove(SavedTask savedTask);
    Task<List<SavedTask>> GetAllByUserAsync(Guid userId, CancellationToken ct);
    Task<HashSet<Guid>> GetSavedTaskIdsAsync(Guid userId, IReadOnlyList<Guid> taskIds, CancellationToken ct);
    Task<int> SaveChangesAsync(CancellationToken ct);
}
