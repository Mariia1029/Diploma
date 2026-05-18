using SkillCode.Enums;
using SkillCode.Models;

namespace SkillCode.Interfaces;

public interface IAttemptRepository
{
    Task<Attempt> AddAsync(Attempt attempt, CancellationToken ct);
    Task<Attempt?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Attempt?> GetByIdWithAnswersAsync(Guid id, CancellationToken ct);
    Task<List<Attempt>> GetAllByUserAndTaskAsync(Guid userId, Guid taskId, AttemptType? contextType, Guid? contextId, CancellationToken ct);
    Task<List<Attempt>> GetExpiredInProgressAsync(CancellationToken ct);
    void Remove(Attempt attempt);
    Task<int> SaveChangesAsync(CancellationToken ct);
}
