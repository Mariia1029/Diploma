using SkillCode.DTOs;

namespace SkillCode.Interfaces;

public interface ITaskShareService
{
    Task<PagedResult<ReceivedShareResponse>> GetReceivedAsync(
        Guid userId, int page, int limit, bool? isRead, CancellationToken ct);
    Task<PagedResult<SentShareResponse>> GetSentAsync(
        Guid userId, int page, int limit, CancellationToken ct);
    Task<MarkReadResponse> MarkReadAsync(Guid userId, Guid shareId, bool isRead, CancellationToken ct);
    Task<EphemeralAttemptResult> EphemeralAttemptFromShareAsync(
        Guid userId, Guid shareId, EphemeralAttemptRequest request, CancellationToken ct);
    Task<EphemeralAttemptResult> EphemeralAttemptPreviewAsync(
        Guid userId, Guid taskId, EphemeralAttemptRequest request, CancellationToken ct);
    Task<SaveShareResponse> SaveFromShareAsync(Guid userId, Guid shareId, CancellationToken ct);
    Task UnsaveFromShareAsync(Guid userId, Guid shareId, CancellationToken ct);
    Task ShareTaskAsync(Guid senderId, Guid taskId, Guid receiverId, CancellationToken ct);
}
