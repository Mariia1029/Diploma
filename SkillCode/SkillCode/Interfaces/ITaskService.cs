using SkillCode.DTOs;
using TaskStatus = SkillCode.Enums.TaskStatus;

namespace SkillCode.Interfaces;

public interface ITaskService
{
    Task<TaskDetailResponse> CreateAsync(Guid ownerId, CreateTaskRequest request, CancellationToken ct);
    Task<TaskDetailResponse> GetByIdAsync(Guid taskId, CancellationToken ct);
    Task<List<TaskDetailResponse>> GetAllAsync(Guid ownerId, CancellationToken ct);
    Task<List<PublicTaskDetailResponse>> GetPublicTasksAsync(CancellationToken ct);
    Task<TaskDetailResponse> SetStatusAsync(Guid requesterId, Guid taskId, TaskStatus status, CancellationToken ct);
    System.Threading.Tasks.Task DeleteAsync(Guid requesterId, Guid taskId, CancellationToken ct);
}
