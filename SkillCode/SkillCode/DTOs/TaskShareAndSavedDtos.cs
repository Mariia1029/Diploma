using System.Text.Json;

namespace SkillCode.DTOs;

// ── Shared ────────────────────────────────────────────────────────────────────

public record ShareUserInfo(Guid Id, string FirstName, string LastName);

public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount);

// ── GET /api/shares/received ──────────────────────────────────────────────────

public record ReceivedShareResponse(
    Guid ShareId,
    Guid TaskId,
    string TaskTitle,
    ShareUserInfo? Sender,
    DateTimeOffset SentAt,
    bool IsRead,
    bool IsSaved
);

// ── GET /api/shares/sent ──────────────────────────────────────────────────────

public record SentShareResponse(
    Guid ShareId,
    Guid TaskId,
    string TaskTitle,
    ShareUserInfo? Receiver,
    DateTimeOffset SentAt,
    bool IsRead,
    bool IsSaved
);

// ── PATCH /api/shares/{shareId}/read ─────────────────────────────────────────

public record MarkReadRequest(bool IsRead);

public record MarkReadResponse(Guid ShareId, bool IsRead);

// ── Ephemeral attempt (endpoints 4 & 5) ──────────────────────────────────────

public record EphemeralAttemptRequest(IReadOnlyList<EphemeralAnswerDto> Answers);

public record EphemeralAnswerDto(Guid TaskItemId, JsonElement Answer);

public record EphemeralAttemptResult(
    decimal EarnedPoints,
    decimal MaxPoints,
    IReadOnlyList<EphemeralItemResult> Results
);

public record EphemeralItemResult(
    Guid TaskItemId,
    bool? IsCorrect,
    string CorrectAnswer,
    string? Explanation
);

// ── POST /api/shares/{shareId}/save ──────────────────────────────────────────

public record SaveShareResponse(Guid SavedTaskId, Guid TaskId);

// ── POST /api/tasks/{taskId}/share ────────────────────────────────────────────

public record ShareTaskRequest(Guid ReceiverId);
