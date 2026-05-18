using AutoMapper;
using Microsoft.EntityFrameworkCore;
using SkillCode.Data;
using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Exceptions;
using SkillCode.Interfaces;
using SkillCode.Models;
using ModelTask = SkillCode.Models.Task;
using TaskStatus = SkillCode.Enums.TaskStatus;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Services;

public class SavedTaskService : ISavedTaskService
{
    private readonly ISavedTaskRepository _savedTaskRepository;
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;

    public SavedTaskService(ISavedTaskRepository savedTaskRepository, AppDbContext db, IMapper mapper)
    {
        _savedTaskRepository = savedTaskRepository;
        _db = db;
        _mapper = mapper;
    }

    public async Task SaveAsync(Guid userId, Guid taskId, CancellationToken ct)
    {
        var task = await _db.Tasks
            .FirstOrDefaultAsync(t => t.Id == taskId && t.Status == TaskStatus.Public, ct)
            ?? throw new TaskNotFoundException(taskId);

        if (task.OwnerId == userId)
            throw new SavedTaskForbiddenException();

        var existing = await _savedTaskRepository.GetByUserAndTaskAsync(userId, taskId, ct);
        if (existing is not null)
            throw new SavedTaskAlreadyExistsException(taskId);

        var savedTask = new SavedTask
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TaskId = taskId,
            SavedAt = DateTime.UtcNow
        };

        await _savedTaskRepository.AddAsync(savedTask, ct);
        await _savedTaskRepository.SaveChangesAsync(ct);
    }

    public async Task UnsaveAsync(Guid userId, Guid taskId, CancellationToken ct)
    {
        var savedTask = await _savedTaskRepository.GetByUserAndTaskAsync(userId, taskId, ct)
            ?? throw new SavedTaskNotFoundException(taskId);

        _savedTaskRepository.Remove(savedTask);
        await _savedTaskRepository.SaveChangesAsync(ct);
    }

    public async Task<List<TaskDetailResponse>> GetSavedAsync(Guid userId, CancellationToken ct)
    {
        var savedTasks = await _savedTaskRepository.GetAllByUserAsync(userId, ct);
        return savedTasks.Select(s => _mapper.Map<TaskDetailResponse>(s.Task)).ToList();
    }
}
