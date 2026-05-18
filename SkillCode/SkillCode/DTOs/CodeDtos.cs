namespace SkillCode.DTOs;

public record ExecuteCodeRequest
{
    public required string Language { get; init; }
    public required string Code { get; init; }
    public required string CallCode { get; init; }
}

public record ExecuteCodeResponse(string Stdout, string Stderr, int ExitCode);

public record TestCodeRequest
{
    public required Guid TaskItemId { get; init; }
    public required string Code { get; init; }
    public required string Language { get; init; }
}

public record TestCaseResult(int Index, bool Passed);

public record TestCodeResponse(bool Passed, int PassedCount, int TotalCount, List<TestCaseResult> TestResults);
