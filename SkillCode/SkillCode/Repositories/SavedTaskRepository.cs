using Microsoft.EntityFrameworkCore;
using SkillCode.Data;
using SkillCode.Interfaces;
using SkillCode.Models;

namespace SkillCode.Repositories;

public class SavedTaskRepository : ISavedTaskRepository
{
    private readonly AppDbContext _db;

    public SavedTaskRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<SavedTask?> GetByUserAndTaskAsync(Guid userId, Guid taskId, CancellationToken ct)
        => _db.SavedTasks.FirstOrDefaultAsync(s => s.UserId == userId && s.TaskId == taskId, ct);

    public async Task<SavedTask> AddAsync(SavedTask savedTask, CancellationToken ct)
    {
        await _db.SavedTasks.AddAsync(savedTask, ct);
        return savedTask;
    }

    public void Remove(SavedTask savedTask)
    {
        _db.SavedTasks.Remove(savedTask);
    }

    public Task<List<SavedTask>> GetAllByUserAsync(Guid userId, CancellationToken ct)
        => _db.SavedTasks
            .Where(s => s.UserId == userId)
            .Include(s => s.Task)
                .ThenInclude(t => t.Owner)
            .Include(s => s.Task)
                .ThenInclude(t => t.TaskItems.OrderBy(ti => ti.OrderIndex))
            .OrderByDescending(s => s.SavedAt)
            .ToListAsync(ct);

    public async Task<HashSet<Guid>> GetSavedTaskIdsAsync(Guid userId, IReadOnlyList<Guid> taskIds, CancellationToken ct)
    {
        var ids = await _db.SavedTasks
            .Where(s => s.UserId == userId && taskIds.Contains(s.TaskId))
            .Select(s => s.TaskId)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    public Task<int> SaveChangesAsync(CancellationToken ct)
        => _db.SaveChangesAsync(ct);
}
