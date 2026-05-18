using ModelTask = SkillCode.Models.Task;

namespace SkillCode.Interfaces;

public interface ITaskRepository
{
    Task<ModelTask> AddAsync(ModelTask task, CancellationToken ct);
    Task<ModelTask?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<List<ModelTask>> GetAllByOwnerAsync(Guid ownerId, CancellationToken ct);
    Task<List<ModelTask>> GetAllPublicAsync(CancellationToken ct);
    System.Threading.Tasks.Task DeleteAsync(ModelTask task, CancellationToken ct);
    Task<int> SaveChangesAsync(CancellationToken ct);
}
