using Microsoft.EntityFrameworkCore;
using SkillCode.Data;
using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;

namespace SkillCode.Repositories;

public class AttemptRepository : IAttemptRepository
{
    private readonly AppDbContext _db;

    public AttemptRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Attempt> AddAsync(Attempt attempt, CancellationToken ct)
    {
        await _db.Attempts.AddAsync(attempt, ct);
        return attempt;
    }

    public Task<Attempt?> GetByIdAsync(Guid id, CancellationToken ct)
        => _db.Attempts
            .Include(a => a.Task)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

    public Task<Attempt?> GetByIdWithAnswersAsync(Guid id, CancellationToken ct)
        => _db.Attempts
            .Include(a => a.Task)
            .Include(a => a.AttemptAnswers)
                .ThenInclude(aa => aa.TaskItem)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

    public Task<List<Attempt>> GetAllByUserAndTaskAsync(
        Guid userId, Guid taskId, AttemptType? contextType, Guid? contextId, CancellationToken ct)
    {
        var query = _db.Attempts
            .Include(a => a.Task)
            .Where(a => a.UserId == userId && a.TaskId == taskId);

        if (contextType.HasValue)
            query = query.Where(a => a.ContextType == contextType.Value);

        if (contextId.HasValue)
            query = query.Where(a => a.ContextId == contextId.Value);

        return query.OrderByDescending(a => a.StartedAt).ToListAsync(ct);
    }

    public async Task<List<Attempt>> GetExpiredInProgressAsync(CancellationToken ct)
    {
        var candidates = await _db.Attempts
            .Include(a => a.Task)
            .Include(a => a.AttemptAnswers)
                .ThenInclude(aa => aa.TaskItem)
            .Where(a => a.Status == AttemptStatus.InProgress && a.Task.TimeLimitSeconds != null)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        return candidates
            .Where(a => a.StartedAt.AddSeconds(a.Task.TimeLimitSeconds!.Value) <= now)
            .ToList();
    }

    public void Remove(Attempt attempt)
        => _db.Attempts.Remove(attempt);

    public Task<int> SaveChangesAsync(CancellationToken ct)
        => _db.SaveChangesAsync(ct);
}
