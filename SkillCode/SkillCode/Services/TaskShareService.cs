using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Exceptions;
using SkillCode.Interfaces;
using SkillCode.Models;
using ModelTask = SkillCode.Models.Task;
using Task = System.Threading.Tasks.Task;
using TaskStatus = SkillCode.Enums.TaskStatus;

namespace SkillCode.Services;

public class TaskShareService : ITaskShareService
{
    private readonly ITaskShareRepository _shareRepo;
    private readonly ISavedTaskRepository _savedTaskRepo;
    private readonly ITaskRepository _taskRepo;
    private readonly IUserRepository _userRepo;
    private readonly IAnswerCheckerService _checker;

    public TaskShareService(
        ITaskShareRepository shareRepo,
        ISavedTaskRepository savedTaskRepo,
        ITaskRepository taskRepo,
        IUserRepository userRepo,
        IAnswerCheckerService checker)
    {
        _shareRepo     = shareRepo;
        _savedTaskRepo = savedTaskRepo;
        _taskRepo      = taskRepo;
        _userRepo      = userRepo;
        _checker       = checker;
    }

    public async Task<PagedResult<ReceivedShareResponse>> GetReceivedAsync(
        Guid userId, int page, int limit, bool? isRead, CancellationToken ct)
    {
        var (items, total) = await _shareRepo.GetReceivedPagedAsync(userId, page, limit, isRead, ct);

        var taskIds = items.Select(s => s.TaskId).ToList();
        var savedIds = await _savedTaskRepo.GetSavedTaskIdsAsync(userId, taskIds, ct);

        var responses = items.Select(s => new ReceivedShareResponse(
            ShareId:   s.Id,
            TaskId:    s.TaskId,
            TaskTitle: s.Task.Title,
            Sender:    s.Sender is null ? null : new ShareUserInfo(s.Sender.Id, s.Sender.FirstName, s.Sender.LastName),
            SentAt:    new DateTimeOffset(s.SentAt, TimeSpan.Zero),
            IsRead:    s.IsRead,
            IsSaved:   savedIds.Contains(s.TaskId)
        )).ToList();

        return new PagedResult<ReceivedShareResponse>(responses, total);
    }

    public async Task<PagedResult<SentShareResponse>> GetSentAsync(
        Guid userId, int page, int limit, CancellationToken ct)
    {
        var (items, total) = await _shareRepo.GetSentPagedAsync(userId, page, limit, ct);

        var taskIds = items.Select(s => s.TaskId).ToList();
        var savedIds = await _savedTaskRepo.GetSavedTaskIdsAsync(userId, taskIds, ct);

        var responses = items.Select(s => new SentShareResponse(
            ShareId:   s.Id,
            TaskId:    s.TaskId,
            TaskTitle: s.Task.Title,
            Receiver:  s.Receiver is null ? null : new ShareUserInfo(s.Receiver.Id, s.Receiver.FirstName, s.Receiver.LastName),
            SentAt:    new DateTimeOffset(s.SentAt, TimeSpan.Zero),
            IsRead:    s.IsRead,
            IsSaved:   savedIds.Contains(s.TaskId)
        )).ToList();

        return new PagedResult<SentShareResponse>(responses, total);
    }

    public async Task<MarkReadResponse> MarkReadAsync(Guid userId, Guid shareId, bool isRead, CancellationToken ct)
    {
        var share = await _shareRepo.GetByIdAsync(shareId, ct)
            ?? throw new TaskShareNotFoundException(shareId);

        if (share.ReceiverId != userId)
            throw new TaskShareForbiddenException();

        share.IsRead = isRead;
        await _shareRepo.SaveChangesAsync(ct);

        return new MarkReadResponse(share.Id, share.IsRead);
    }

    public async Task<EphemeralAttemptResult> EphemeralAttemptFromShareAsync(
        Guid userId, Guid shareId, EphemeralAttemptRequest request, CancellationToken ct)
    {
        var share = await _shareRepo.GetByIdAsync(shareId, ct)
            ?? throw new TaskShareNotFoundException(shareId);

        if (share.ReceiverId != userId)
            throw new TaskShareForbiddenException();

        var task = await _taskRepo.GetByIdAsync(share.TaskId, ct)
            ?? throw new TaskNotFoundException(share.TaskId);

        return await RunEphemeralAsync(task, request, ct);
    }

    public async Task<EphemeralAttemptResult> EphemeralAttemptPreviewAsync(
        Guid userId, Guid taskId, EphemeralAttemptRequest request, CancellationToken ct)
    {
        var task = await _taskRepo.GetByIdAsync(taskId, ct)
            ?? throw new TaskNotFoundException(taskId);

        if (task.OwnerId != userId)
            throw new TaskForbiddenException();

        return await RunEphemeralAsync(task, request, ct);
    }

    public async Task<SaveShareResponse> SaveFromShareAsync(Guid userId, Guid shareId, CancellationToken ct)
    {
        var share = await _shareRepo.GetByIdAsync(shareId, ct)
            ?? throw new TaskShareNotFoundException(shareId);

        if (share.ReceiverId != userId)
            throw new TaskShareForbiddenException();

        var existing = await _savedTaskRepo.GetByUserAndTaskAsync(userId, share.TaskId, ct);
        if (existing is not null)
            throw new SavedTaskAlreadyExistsException(share.TaskId);

        var savedTask = new SavedTask
        {
            Id      = Guid.NewGuid(),
            UserId  = userId,
            TaskId  = share.TaskId,
            SavedAt = DateTime.UtcNow
        };

        await _savedTaskRepo.AddAsync(savedTask, ct);
        await _savedTaskRepo.SaveChangesAsync(ct);

        return new SaveShareResponse(savedTask.Id, savedTask.TaskId);
    }

    public async Task UnsaveFromShareAsync(Guid userId, Guid shareId, CancellationToken ct)
    {
        var share = await _shareRepo.GetByIdAsync(shareId, ct)
            ?? throw new TaskShareNotFoundException(shareId);

        if (share.ReceiverId != userId)
            throw new TaskShareForbiddenException();

        var savedTask = await _savedTaskRepo.GetByUserAndTaskAsync(userId, share.TaskId, ct)
            ?? throw new SavedTaskNotFoundException(share.TaskId);

        _savedTaskRepo.Remove(savedTask);
        await _savedTaskRepo.SaveChangesAsync(ct);
    }

    public async Task ShareTaskAsync(Guid senderId, Guid taskId, Guid receiverId, CancellationToken ct)
    {
        var task = await _taskRepo.GetByIdAsync(taskId, ct)
            ?? throw new TaskNotFoundException(taskId);

        if (task.Status == TaskStatus.Private && task.OwnerId != senderId)
            throw new TaskForbiddenException();

        _ = await _userRepo.GetByIdAsync(receiverId, ct)
            ?? throw new UserNotFoundException();

        if (await _shareRepo.ExistsAsync(taskId, senderId, receiverId, ct))
            throw new TaskAlreadySharedException(taskId, receiverId);

        var share = new TaskShare
        {
            Id         = Guid.NewGuid(),
            TaskId     = taskId,
            SenderId   = senderId,
            ReceiverId = receiverId,
            IsRead     = false,
            SentAt     = DateTime.UtcNow
        };

        await _shareRepo.AddAsync(share, ct);
        await _shareRepo.SaveChangesAsync(ct);
    }

    private async Task<EphemeralAttemptResult> RunEphemeralAsync(
        ModelTask task, EphemeralAttemptRequest request, CancellationToken ct)
    {
        var itemMap = task.TaskItems.ToDictionary(i => i.Id);
        var results = new List<EphemeralItemResult>(request.Answers.Count);
        var earnedTotal = 0m;

        foreach (var answer in request.Answers)
        {
            if (!itemMap.TryGetValue(answer.TaskItemId, out var item))
                throw new TaskItemNotFoundException(answer.TaskItemId);

            var checkResult = await _checker.CheckAsync(item, answer.Answer.GetRawText(), ct);
            earnedTotal += checkResult.EarnedPoints;

            results.Add(new EphemeralItemResult(
                TaskItemId:    item.Id,
                IsCorrect:     checkResult.IsCorrect,
                CorrectAnswer: item.CorrectAnswer,
                Explanation:   checkResult.AiExplanation ?? item.Explanation
            ));
        }

        var maxPoints = task.TaskItems.Sum(i => i.Points);
        return new EphemeralAttemptResult(
            EarnedPoints: Math.Round(earnedTotal, 2),
            MaxPoints:    maxPoints,
            Results:      results
        );
    }
}
