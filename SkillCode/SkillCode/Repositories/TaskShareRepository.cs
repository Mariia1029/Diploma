using Microsoft.EntityFrameworkCore;
using SkillCode.Data;
using SkillCode.Interfaces;
using SkillCode.Models;

namespace SkillCode.Repositories;

public class TaskShareRepository : ITaskShareRepository
{
    private readonly AppDbContext _db;

    public TaskShareRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<TaskShare?> GetByIdAsync(Guid shareId, CancellationToken ct)
        => _db.TaskShares
            .Include(s => s.Task)
            .Include(s => s.Sender)
            .Include(s => s.Receiver)
            .FirstOrDefaultAsync(s => s.Id == shareId, ct);

    public async Task<(List<TaskShare> Items, int Total)> GetReceivedPagedAsync(
        Guid userId, int page, int limit, bool? isRead, CancellationToken ct)
    {
        var query = _db.TaskShares
            .Where(s => s.ReceiverId == userId)
            .Include(s => s.Task)
            .Include(s => s.Sender)
            .AsQueryable();

        if (isRead.HasValue)
            query = query.Where(s => s.IsRead == isRead.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(s => s.SentAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<(List<TaskShare> Items, int Total)> GetSentPagedAsync(
        Guid userId, int page, int limit, CancellationToken ct)
    {
        var query = _db.TaskShares
            .Where(s => s.SenderId == userId)
            .Include(s => s.Task)
            .Include(s => s.Receiver)
            .AsQueryable();

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(s => s.SentAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(ct);

        return (items, total);
    }

    public Task<bool> ExistsAsync(Guid taskId, Guid senderId, Guid receiverId, CancellationToken ct)
        => _db.TaskShares.AnyAsync(
            s => s.TaskId == taskId && s.SenderId == senderId && s.ReceiverId == receiverId, ct);

    public async Task<TaskShare> AddAsync(TaskShare share, CancellationToken ct)
    {
        await _db.TaskShares.AddAsync(share, ct);
        return share;
    }

    public Task<int> SaveChangesAsync(CancellationToken ct)
        => _db.SaveChangesAsync(ct);
}
