using SkillCode.DTOs;

namespace SkillCode.Interfaces;

public interface ICodeService
{
    Task<ExecuteCodeResponse> ExecuteAsync(ExecuteCodeRequest request, CancellationToken ct);
    Task<TestCodeResponse> TestAsync(TestCodeRequest request, CancellationToken ct);
}
