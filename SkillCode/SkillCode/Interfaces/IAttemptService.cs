using SkillCode.DTOs;
using SkillCode.Enums;

namespace SkillCode.Interfaces;

public interface IAttemptService
{
    Task<AttemptResponse> StartAsync(Guid userId, StartAttemptRequest request, CancellationToken ct);
    Task<AttemptAnswerResponse> SaveAnswerAsync(Guid userId, Guid attemptId, SaveAnswerRequest request, CancellationToken ct);
    Task<AttemptAnswerResponse> UpdateAnswerGradeAsync(Guid userId, Guid attemptId, Guid answerId, UpdateAnswerGradeRequest request, CancellationToken ct);
    Task<AttemptResponse> FinishAsync(Guid userId, Guid attemptId, CancellationToken ct);
    Task<AttemptDetailResponse> GetByIdAsync(Guid userId, Guid attemptId, CancellationToken ct);
    Task<List<AttemptAnswerResponse>> GetAnswersAsync(Guid userId, Guid attemptId, CancellationToken ct);
    Task<List<AttemptResponse>> GetByTaskAsync(Guid userId, Guid taskId, AttemptType? contextType, Guid? contextId, CancellationToken ct);
    Task ForceFinishExpiredAsync(CancellationToken ct);
    Task DeleteAsync(Guid userId, Guid attemptId, CancellationToken ct);
}
