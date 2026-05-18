using AutoMapper;
using SkillCode.DTOs;
using SkillCode.Exceptions;
using SkillCode.Interfaces;
using SkillCode.Models;
using ModelTask = SkillCode.Models.Task;
using TaskStatus = SkillCode.Enums.TaskStatus;

namespace SkillCode.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _taskRepository;
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;

    public TaskService(ITaskRepository taskRepository, IUserRepository userRepository, IMapper mapper)
    {
        _taskRepository = taskRepository;
        _userRepository = userRepository;
        _mapper = mapper;
    }

    public async Task<TaskDetailResponse> CreateAsync(Guid ownerId, CreateTaskRequest request, CancellationToken ct)
    {
        var task = _mapper.Map<ModelTask>(request);
        task.OwnerId = ownerId;
        task.Status = TaskStatus.Private;
        task.IsCopy = false;
        task.TaskItems = _mapper.Map<List<TaskItem>>(request.TaskItems);

        await _taskRepository.AddAsync(task, ct);
        await _taskRepository.SaveChangesAsync(ct);

        var created = await _taskRepository.GetByIdAsync(task.Id, ct)
                      ?? throw new TaskNotFoundException(task.Id);

        return _mapper.Map<TaskDetailResponse>(created);
    }

    public async Task<TaskDetailResponse> GetByIdAsync(Guid taskId, CancellationToken ct)
    {
        var task = await _taskRepository.GetByIdAsync(taskId, ct)
            ?? throw new TaskNotFoundException(taskId);
        return _mapper.Map<TaskDetailResponse>(task);
    }

    public async Task<List<TaskDetailResponse>> GetAllAsync(Guid ownerId, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(ownerId, ct);
        if (user is not null && user.IsBlocked &&
            (user.BlockedUntil is null || user.BlockedUntil > DateTime.UtcNow))
            throw new UserBlockedException();

        var tasks = await _taskRepository.GetAllByOwnerAsync(ownerId, ct);
        return _mapper.Map<List<TaskDetailResponse>>(tasks);
    }

    public async Task<List<PublicTaskDetailResponse>> GetPublicTasksAsync(CancellationToken ct)
    {
        var tasks = await _taskRepository.GetAllPublicAsync(ct);
        return _mapper.Map<List<PublicTaskDetailResponse>>(tasks);
    }

    public async Task<TaskDetailResponse> SetStatusAsync(Guid requesterId, Guid taskId, TaskStatus status, CancellationToken ct)
    {
        var task = await _taskRepository.GetByIdAsync(taskId, ct)
                   ?? throw new TaskNotFoundException(taskId);

        if (task.OwnerId != requesterId)
            throw new TaskForbiddenException();

        task.Status = status;
        await _taskRepository.SaveChangesAsync(ct);

        return _mapper.Map<TaskDetailResponse>(task);
    }

    public async System.Threading.Tasks.Task DeleteAsync(Guid requesterId, Guid taskId, CancellationToken ct)
    {
        var task = await _taskRepository.GetByIdAsync(taskId, ct)
                   ?? throw new TaskNotFoundException(taskId);

        if (task.OwnerId != requesterId)
            throw new TaskForbiddenException();

        await _taskRepository.DeleteAsync(task, ct);
        await _taskRepository.SaveChangesAsync(ct);
    }
}
