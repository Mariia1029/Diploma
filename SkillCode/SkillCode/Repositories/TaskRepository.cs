using Microsoft.EntityFrameworkCore;
using SkillCode.Data;
using TaskStatus = SkillCode.Enums.TaskStatus;
using SkillCode.Interfaces;
using SkillCode.Models;
using ModelTask = SkillCode.Models.Task;

namespace SkillCode.Repositories;

public class TaskRepository : ITaskRepository
{
    private readonly AppDbContext _db;

    public TaskRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ModelTask> AddAsync(ModelTask task, CancellationToken ct)
    {
        await _db.Tasks.AddAsync(task, ct);
        return task;
    }

    public Task<ModelTask?> GetByIdAsync(Guid id, CancellationToken ct)
        => _db.Tasks
            .Include(t => t.Owner)
            .Include(t => t.TaskItems)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<List<ModelTask>> GetAllByOwnerAsync(Guid ownerId, CancellationToken ct)
        => _db.Tasks
            .Where(t => t.OwnerId == ownerId)
            .Include(t => t.Owner)
            .Include(t => t.TaskItems.OrderBy(ti => ti.OrderIndex))
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

    public Task<List<ModelTask>> GetAllPublicAsync(CancellationToken ct)
        => _db.Tasks
            .Where(t => t.Status == TaskStatus.Public)
            .Include(t => t.Owner)
            .Include(t => t.TaskItems.OrderBy(ti => ti.OrderIndex))
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

    public System.Threading.Tasks.Task DeleteAsync(ModelTask task, CancellationToken ct)
    {
        _db.Tasks.Remove(task);
        return System.Threading.Tasks.Task.CompletedTask;
    }

    public Task<int> SaveChangesAsync(CancellationToken ct)
        => _db.SaveChangesAsync(ct);
}
