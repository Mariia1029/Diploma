using AutoMapper;
using Microsoft.EntityFrameworkCore;
using SkillCode.Data;
using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Exceptions;
using SkillCode.Interfaces;
using SkillCode.Models;
using AttemptStatus = SkillCode.Enums.AttemptStatus;

namespace SkillCode.Services;

public class AttemptService : IAttemptService
{
    private readonly IAttemptRepository _attemptRepository;
    private readonly IAttemptAnswerRepository _attemptAnswerRepository;
    private readonly IAnswerCheckerService _checker;
    private readonly ICodeService _codeService;
    private readonly IMapper _mapper;
    private readonly AppDbContext _db;

    public AttemptService(
        IAttemptRepository attemptRepository,
        IAttemptAnswerRepository attemptAnswerRepository,
        IAnswerCheckerService checker,
        ICodeService codeService,
        IMapper mapper,
        AppDbContext db)
    {
        _attemptRepository = attemptRepository;
        _attemptAnswerRepository = attemptAnswerRepository;
        _checker = checker;
        _codeService = codeService;
        _mapper = mapper;
        _db = db;
    }

    public async Task<AttemptResponse> StartAsync(Guid userId, StartAttemptRequest request, CancellationToken ct)
    {
        var task = await _db.Tasks
            .Include(t => t.TaskItems)
            .FirstOrDefaultAsync(t => t.Id == request.TaskId, ct)
            ?? throw new TaskNotFoundException(request.TaskId);

        var maxPoints = task.TaskItems.Sum(i => i.Points);

        var attempt = new Attempt
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TaskId = request.TaskId,
            ContextType = request.ContextType,
            ContextId = request.ContextId,
            EarnedPoints = 0m,
            MaxPoints = maxPoints,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
            Task = task
        };

        await _attemptRepository.AddAsync(attempt, ct);
        await _attemptRepository.SaveChangesAsync(ct);

        return _mapper.Map<AttemptResponse>(attempt);
    }

    public async Task<AttemptAnswerResponse> SaveAnswerAsync(
        Guid userId, Guid attemptId, SaveAnswerRequest request, CancellationToken ct)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId, ct)
            ?? throw new AttemptNotFoundException(attemptId);

        if (attempt.UserId != userId)
            throw new AttemptForbiddenException();

        if (attempt.Status == AttemptStatus.Finished)
            throw new AttemptAlreadyFinishedException(attemptId);

        if (attempt.Task.TimeLimitSeconds.HasValue &&
            attempt.StartedAt.AddSeconds(attempt.Task.TimeLimitSeconds.Value) < DateTime.UtcNow)
            throw new AttemptTimeLimitExceededException(attemptId);

        var taskItem = await _db.TaskItems.FirstOrDefaultAsync(
            ti => ti.Id == request.TaskItemId, ct)
            ?? throw new TaskItemNotInTaskException(request.TaskItemId, attempt.TaskId);

        if (taskItem.TaskId != attempt.TaskId)
            throw new TaskItemNotInTaskException(request.TaskItemId, attempt.TaskId);

        var userAnswerJson = request.UserAnswer.GetRawText();

        var existing = await _attemptAnswerRepository
            .GetByAttemptAndItemAsync(attemptId, request.TaskItemId, ct);

        if (existing is null)
        {
            existing = new AttemptAnswer
            {
                Id         = Guid.NewGuid(),
                AttemptId  = attemptId,
                TaskItemId = request.TaskItemId,
                UserAnswer = userAnswerJson,
                AnsweredAt = request.AnsweredAt
            };
            await _attemptAnswerRepository.AddAsync(existing, ct);
        }
        else
        {
            existing.UserAnswer = userAnswerJson;
            existing.AnsweredAt = request.AnsweredAt;
        }

        await _attemptAnswerRepository.SaveChangesAsync(ct);
        return _mapper.Map<AttemptAnswerResponse>(existing);
    }

    public async Task<AttemptAnswerResponse> UpdateAnswerGradeAsync(
        Guid userId, Guid attemptId, Guid answerId, UpdateAnswerGradeRequest request, CancellationToken ct)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId, ct)
            ?? throw new AttemptNotFoundException(attemptId);

        if (attempt.UserId != userId)
            throw new AttemptForbiddenException();

        var answer = await _attemptAnswerRepository.GetByIdAsync(answerId, ct)
            ?? throw new AttemptAnswerNotFoundException(answerId);

        if (answer.AttemptId != attemptId)
            throw new AttemptForbiddenException();

        answer.EarnedPoints  = request.EarnedPoints;
        answer.AiExplanation = request.AiExplanation;

        await _attemptAnswerRepository.SaveChangesAsync(ct);
        return _mapper.Map<AttemptAnswerResponse>(answer);
    }

    public async Task<AttemptResponse> FinishAsync(Guid userId, Guid attemptId, CancellationToken ct)
    {
        var attempt = await _attemptRepository.GetByIdWithAnswersAsync(attemptId, ct)
            ?? throw new AttemptNotFoundException(attemptId);

        if (attempt.UserId != userId)
            throw new AttemptForbiddenException();

        if (attempt.Status == AttemptStatus.Finished)
            throw new AttemptAlreadyFinishedException(attemptId);

        await FinishCoreAsync(attempt, ct);
        await _attemptRepository.SaveChangesAsync(ct);
        return _mapper.Map<AttemptResponse>(attempt);
    }

    public async System.Threading.Tasks.Task ForceFinishExpiredAsync(CancellationToken ct)
    {
        var expired = await _attemptRepository.GetExpiredInProgressAsync(ct);
        foreach (var attempt in expired)
            await FinishCoreAsync(attempt, ct);

        if (expired.Count > 0)
            await _attemptRepository.SaveChangesAsync(ct);
    }

    private async System.Threading.Tasks.Task FinishCoreAsync(Attempt attempt, CancellationToken ct)
    {
        foreach (var answer in attempt.AttemptAnswers)
        {
            if (answer.UserAnswer is null) continue;

            var taskItem = answer.TaskItem;
            if (taskItem is null) continue;

            var checkResult = await _checker.CheckAsync(taskItem, answer.UserAnswer, ct);

            if (taskItem.Type == TaskType.Coding)
            {
                var userCode = System.Text.Json.JsonSerializer.Deserialize<string>(answer.UserAnswer) ?? "";
                var testResult = await _codeService.TestAsync(
                    new TestCodeRequest
                    {
                        TaskItemId = answer.TaskItemId,
                        Code       = userCode,
                        Language   = attempt.Task.Language.ToString()
                    }, ct);

                var codingPoints = testResult.TotalCount > 0
                    ? Math.Round((decimal)testResult.PassedCount / testResult.TotalCount * taskItem.Points, 2)
                    : 0m;

                checkResult = checkResult with { EarnedPoints = codingPoints };
            }

            answer.IsCorrect     = checkResult.IsCorrect;
            answer.EarnedPoints  = checkResult.EarnedPoints;
            answer.AiExplanation = checkResult.AiExplanation;
        }

        attempt.EarnedPoints    = attempt.AttemptAnswers.Sum(a => a.EarnedPoints ?? 0m);
        attempt.Status          = AttemptStatus.Finished;
        attempt.FinishedAt      = DateTime.UtcNow;
        attempt.DurationSeconds = (int)(attempt.FinishedAt.Value - attempt.StartedAt).TotalSeconds;
    }

    public async Task<AttemptDetailResponse> GetByIdAsync(Guid userId, Guid attemptId, CancellationToken ct)
    {
        var attempt = await _attemptRepository.GetByIdWithAnswersAsync(attemptId, ct)
            ?? throw new AttemptNotFoundException(attemptId);

        if (attempt.UserId != userId)
            throw new AttemptForbiddenException();

        return _mapper.Map<AttemptDetailResponse>(attempt);
    }

    public async Task<List<AttemptAnswerResponse>> GetAnswersAsync(Guid userId, Guid attemptId, CancellationToken ct)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId, ct)
            ?? throw new AttemptNotFoundException(attemptId);

        if (attempt.UserId != userId)
            throw new AttemptForbiddenException();

        var answers = await _attemptAnswerRepository.GetAllByAttemptAsync(attemptId, ct);
        return _mapper.Map<List<AttemptAnswerResponse>>(answers);
    }

    public async Task<List<AttemptResponse>> GetByTaskAsync(
        Guid userId, Guid taskId, AttemptType? contextType, Guid? contextId, CancellationToken ct)
    {
        var attempts = await _attemptRepository.GetAllByUserAndTaskAsync(userId, taskId, contextType, contextId, ct);
        return _mapper.Map<List<AttemptResponse>>(attempts);
    }

    public async System.Threading.Tasks.Task DeleteAsync(Guid userId, Guid attemptId, CancellationToken ct)
    {
        var attempt = await _attemptRepository.GetByIdAsync(attemptId, ct)
            ?? throw new AttemptNotFoundException(attemptId);

        if (attempt.UserId != userId)
            throw new AttemptForbiddenException();

        _attemptRepository.Remove(attempt);
        await _attemptRepository.SaveChangesAsync(ct);
    }
}
