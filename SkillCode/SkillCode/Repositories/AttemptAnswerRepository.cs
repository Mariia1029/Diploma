using Microsoft.EntityFrameworkCore;
using SkillCode.Data;
using SkillCode.Interfaces;
using SkillCode.Models;

namespace SkillCode.Repositories;

public class AttemptAnswerRepository : IAttemptAnswerRepository
{
    private readonly AppDbContext _db;

    public AttemptAnswerRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<AttemptAnswer?> GetByIdAsync(Guid answerId, CancellationToken ct)
        => _db.AttemptAnswers.FirstOrDefaultAsync(a => a.Id == answerId, ct);

    public Task<AttemptAnswer?> GetByAttemptAndItemAsync(Guid attemptId, Guid taskItemId, CancellationToken ct)
        => _db.AttemptAnswers
            .FirstOrDefaultAsync(a => a.AttemptId == attemptId && a.TaskItemId == taskItemId, ct);

    public Task<List<AttemptAnswer>> GetAllByAttemptAsync(Guid attemptId, CancellationToken ct)
        => _db.AttemptAnswers
            .Where(a => a.AttemptId == attemptId)
            .ToListAsync(ct);

    public async Task<AttemptAnswer> AddAsync(AttemptAnswer answer, CancellationToken ct)
    {
        await _db.AttemptAnswers.AddAsync(answer, ct);
        return answer;
    }

    public Task<int> SaveChangesAsync(CancellationToken ct)
        => _db.SaveChangesAsync(ct);
}
