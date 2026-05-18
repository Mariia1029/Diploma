using SkillCode.Models;

namespace SkillCode.Interfaces;

public interface ITaskShareRepository
{
    Task<TaskShare?> GetByIdAsync(Guid shareId, CancellationToken ct);
    Task<(List<TaskShare> Items, int Total)> GetReceivedPagedAsync(
        Guid userId, int page, int limit, bool? isRead, CancellationToken ct);
    Task<(List<TaskShare> Items, int Total)> GetSentPagedAsync(
        Guid userId, int page, int limit, CancellationToken ct);
    Task<bool> ExistsAsync(Guid taskId, Guid senderId, Guid receiverId, CancellationToken ct);
    Task<TaskShare> AddAsync(TaskShare share, CancellationToken ct);
    Task<int> SaveChangesAsync(CancellationToken ct);
}
