using SkillCode.DTOs;

namespace SkillCode.Interfaces;

public interface IAiService
{
    Task<GenerateTaskResponse> GenerateTaskAsync(GenerateTaskRequest request, CancellationToken ct);
    Task<GradeAnswerResponse> GradeAnswerAsync(GradeAnswerRequest request, CancellationToken ct);
    Task<GradeAnswerResponse> GradeFillBlankAsync(GradeFillBlankRequest request, CancellationToken ct);
    Task<bool> CheckFillBlankAsync(string question, string correctAnswer, string userAnswer, CancellationToken ct);
}
