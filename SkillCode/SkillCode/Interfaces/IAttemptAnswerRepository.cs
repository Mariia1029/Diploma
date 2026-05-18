using SkillCode.Models;

namespace SkillCode.Interfaces;

public interface IAttemptAnswerRepository
{
    Task<AttemptAnswer?> GetByIdAsync(Guid answerId, CancellationToken ct);
    Task<AttemptAnswer?> GetByAttemptAndItemAsync(Guid attemptId, Guid taskItemId, CancellationToken ct);
    Task<List<AttemptAnswer>> GetAllByAttemptAsync(Guid attemptId, CancellationToken ct);
    Task<AttemptAnswer> AddAsync(AttemptAnswer answer, CancellationToken ct);
    Task<int> SaveChangesAsync(CancellationToken ct);
}
