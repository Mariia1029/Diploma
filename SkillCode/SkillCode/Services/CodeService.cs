using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using SkillCode.Data;
using SkillCode.DTOs;
using SkillCode.Exceptions;
using SkillCode.Interfaces;

namespace SkillCode.Services;

public class CodeService : ICodeService
{
    private readonly HttpClient _piston;
    private readonly AppDbContext _db;

    private static readonly JsonSerializerOptions _camel = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public CodeService(IHttpClientFactory httpClientFactory, AppDbContext db)
    {
        _piston = httpClientFactory.CreateClient("piston");
        _db = db;
    }

    // ── Execute: combine code + callCode and run on Piston ──────────────
    public async Task<ExecuteCodeResponse> ExecuteAsync(ExecuteCodeRequest request, CancellationToken ct)
    {
        var combined = string.IsNullOrWhiteSpace(request.CallCode)
            ? request.Code
            : $"{request.Code}\n{request.CallCode}";

        var result = await RunOnPistonAsync(request.Language, combined, ct);
        return new ExecuteCodeResponse(result.Run.Stdout, result.Run.Stderr, result.Run.Code ?? 0);
    }

    // ── Test: run code against each stored test case ─────────────────────
    public async Task<TestCodeResponse> TestAsync(TestCodeRequest request, CancellationToken ct)
    {
        var item = await _db.TaskItems
            .FirstOrDefaultAsync(ti => ti.Id == request.TaskItemId, ct)
            ?? throw new TaskItemNotFoundException(request.TaskItemId);

        List<CodingTestCase> testCases;
        try
        {
            testCases = JsonSerializer.Deserialize<List<CodingTestCase>>(
                item.CorrectAnswer, _camel) ?? [];
        }
        catch (JsonException)
        {
            testCases = [];
        }

        var results = new List<TestCaseResult>();

        foreach (var tc in testCases)
        {
            var script   = BuildTestScript(request.Language, request.Code, tc.Input);
            if (results.Count == 0)
                Console.WriteLine("=== PISTON SCRIPT ===\n" + script);
            var response = await RunOnPistonAsync(request.Language, script, ct);
            var run      = response.Run;

            Console.WriteLine($"[Piston TC {results.Count + 1}] stdout={run.Stdout.Replace("\n", "\\n")} | stderr={run.Stderr.Replace("\n", "\\n")} | exitCode={run.Code} | compileStderr={response.Compile?.Stderr?.Replace("\n", "\\n") ?? ""}");

            var actual   = run.Stdout.Trim();
            var expected = ToExpectedString(tc.Expected, request.Language);
            var passed   = actual == expected;

            results.Add(new TestCaseResult(results.Count + 1, passed));
        }

        var passedCount = results.Count(r => r.Passed);
        return new TestCodeResponse(
            Passed:      passedCount == results.Count && results.Count > 0,
            PassedCount: passedCount,
            TotalCount:  results.Count,
            TestResults: results
        );
    }

    // ── Piston ───────────────────────────────────────────────────────────
    private async Task<PistonResponse> RunOnPistonAsync(
        string language, string code, CancellationToken ct)
    {
        var pistonLang = ToPistonLanguage(language);
        var body = new PistonRequest(
            Language: pistonLang,
            Version:  ToPistonVersion(pistonLang),
            Files:    [new PistonFile(code)]
        );

        HttpResponseMessage http;
        try
        {
            http = await _piston.PostAsJsonAsync("api/v2/execute", body, _camel, ct);
            http.EnsureSuccessStatusCode();
        }
        catch (HttpRequestException ex)
        {
            return new PistonResponse(
                Run:     new PistonRunResult(Stdout: "", Stderr: $"Piston недоступний: {ex.Message}", Code: -1),
                Compile: null
            );
        }

        return await http.Content.ReadFromJsonAsync<PistonResponse>(_camel, ct)
            ?? throw new InvalidOperationException("Piston повернув порожню відповідь");
    }

    // ── Script builder ───────────────────────────────────────────────────
    // fullCode: the complete function code as submitted by the user
    //           (includes, signature, and body — no reconstruction needed)
    // Only the entry-point caller for the test case is appended.
    private static string BuildTestScript(string language, string fullCode, JsonElement[] inputs)
    {
        var jsInputs = JsonSerializer.Serialize(inputs);

        return language switch
        {
            "Python" =>
                $"{fullCode}\n_input = {ToPythonList(inputs)}\nprint(solution(*_input))",

            "JavaScript" =>
                $"{fullCode}\nconst _input = {jsInputs};\nconsole.log(solution(..._input));",

            "TypeScript" =>
                $"{fullCode}\nconst _input: any[] = {jsInputs};\nconsole.log(solution(..._input));",

            "Cpp" =>
                $"{fullCode}\nint main(){{\nstd::cout << std::boolalpha << solution({string.Join(", ", inputs.Select(ToCppLiteral))}) << std::endl;\nreturn 0;\n}}",

            "C" => BuildCScript(fullCode, inputs),

            "CSharp" =>
                $"using System;\nusing System.Collections.Generic;\nusing System.Linq;\nclass Runner{{\n{fullCode}\nstatic void Main(){{\nConsole.WriteLine(solution({string.Join(", ", inputs.Select(ToCSharpLiteral))}));\n}}\n}}",

            "Java" =>
                $"import java.util.*;\npublic class Main{{\n{fullCode}\npublic static void main(String[] args){{\nSystem.out.println(solution({string.Join(", ", inputs.Select(ToJavaLiteral))}));\n}}\n}}",

            "Go" =>
                $"{fullCode}\nfunc main(){{\nfmt.Println(solution({string.Join(", ", inputs.Select(ToGoLiteral))}))\n}}",

            "Rust" =>
                $"{fullCode}\nfn main(){{\nprintln!(\"{{}}\" , solution({string.Join(", ", inputs.Select(ToRustLiteral))}));\n}}",

            _ =>
                $"{fullCode}\n// auto-test not supported for {language}"
        };
    }

    private static string BuildCScript(string userCode, JsonElement[] inputs)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine(userCode);
        sb.AppendLine("int main(){");
        var callArgs = new List<string>();
        for (int i = 0; i < inputs.Length; i++)
        {
            if (inputs[i].ValueKind == JsonValueKind.Array)
            {
                var elems = inputs[i].EnumerateArray().ToArray();
                sb.AppendLine($"int _a{i}[] = {{{string.Join(", ", elems.Select(e => e.GetRawText()))}}};");
                callArgs.Add($"_a{i}");
                callArgs.Add(elems.Length.ToString());
            }
            else
            {
                callArgs.Add(ToCppLiteral(inputs[i]));
            }
        }
        sb.AppendLine($"printf(\"%d\\n\", solution({string.Join(", ", callArgs)}));");
        sb.AppendLine("return 0;");
        sb.AppendLine("}");
        return sb.ToString();
    }

    // Converts a JsonElement[] to a Python list literal, e.g. [5, "hello", True, None]
    private static string ToPythonList(JsonElement[] elements)
        => $"[{string.Join(", ", elements.Select(ToPythonLiteral))}]";

    private static string ToPythonLiteral(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.True    => "True",
        JsonValueKind.False   => "False",
        JsonValueKind.Null    => "None",
        JsonValueKind.String  => $"\"{el.GetString()}\"",
        JsonValueKind.Array   => $"[{string.Join(", ", el.EnumerateArray().Select(ToPythonLiteral))}]",
        _                     => el.GetRawText()
    };

    // Array → initializer list {1, 2, 3}; works for C++ and as the scalar base for C.
    private static string ToCppLiteral(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.True   => "true",
        JsonValueKind.False  => "false",
        JsonValueKind.Null   => "nullptr",
        JsonValueKind.String => $"\"{el.GetString()}\"",
        JsonValueKind.Array  => $"{{{string.Join(", ", el.EnumerateArray().Select(ToCppLiteral))}}}",
        _                    => el.GetRawText()
    };

    // Array → new[]{1, 2, 3} (implicitly typed, works for homogeneous arrays).
    private static string ToCSharpLiteral(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.True   => "true",
        JsonValueKind.False  => "false",
        JsonValueKind.Null   => "null",
        JsonValueKind.String => $"\"{el.GetString()}\"",
        JsonValueKind.Array  => $"new[]{{{string.Join(", ", el.EnumerateArray().Select(ToCSharpLiteral))}}}",
        _                    => el.GetRawText()
    };

    // Array → new int[]{1, 2, 3}.
    private static string ToJavaLiteral(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.True   => "true",
        JsonValueKind.False  => "false",
        JsonValueKind.Null   => "null",
        JsonValueKind.String => $"\"{el.GetString()}\"",
        JsonValueKind.Array  => $"new int[]{{{string.Join(", ", el.EnumerateArray().Select(ToJavaLiteral))}}}",
        _                    => el.GetRawText()
    };

    // Array → []int{1, 2, 3}.
    private static string ToGoLiteral(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.True   => "true",
        JsonValueKind.False  => "false",
        JsonValueKind.Null   => "nil",
        JsonValueKind.String => $"\"{el.GetString()}\"",
        JsonValueKind.Array  => $"[]int{{{string.Join(", ", el.EnumerateArray().Select(ToGoLiteral))}}}",
        _                    => el.GetRawText()
    };

    // Array → vec![1, 2, 3].
    private static string ToRustLiteral(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.True   => "true",
        JsonValueKind.False  => "false",
        JsonValueKind.Null   => "None",
        JsonValueKind.String => $"\"{el.GetString()}\"",
        JsonValueKind.Array  => $"vec![{string.Join(", ", el.EnumerateArray().Select(ToRustLiteral))}]",
        _                    => el.GetRawText()
    };

    // Converts the expected JsonElement to the string that the script should print.
    // C# Console.WriteLine(bool) prints "True"/"False" (capitalized).
    private static string ToExpectedString(JsonElement expected, string language) => expected.ValueKind switch
    {
        JsonValueKind.String => expected.GetString() ?? "",
        JsonValueKind.True   => language is "Python" or "CSharp" ? "True" : "true",
        JsonValueKind.False  => language is "Python" or "CSharp" ? "False" : "false",
        JsonValueKind.Null   => language == "Python" ? "None" : language == "Go" ? "<nil>" : "null",
        _                    => expected.GetRawText()
    };

    private static string ToPistonVersion(string pistonLanguage) => pistonLanguage switch
    {
        "c++"        => "10.2.0",
        "csharp"     => "6.12.0",
        "javascript" => "20.11.1",
        "typescript" => "5.0.3",
        "python"     => "3.12.0",
        "java"       => "15.0.2",
        "go"         => "1.16.2",
        "rust"       => "1.68.2",
        "c"          => "10.2.0",
        _            => "*"
    };

    // Maps the frontend language string to Piston's language identifier
    private static string ToPistonLanguage(string language) => language switch
    {
        "Python"     => "python",
        "JavaScript" => "javascript",
        "TypeScript" => "typescript",
        "CSharp"     => "csharp",
        "Cpp"        => "c++",
        "C"          => "c",
        "Java"       => "java",
        "Go"         => "go",
        "Rust"       => "rust",
        _            => language.ToLowerInvariant()
    };

    // ── Internal Piston types ────────────────────────────────────────────
    private record PistonFile(
        [property: JsonPropertyName("content")] string Content);

    private record PistonRequest(
        [property: JsonPropertyName("language")] string Language,
        [property: JsonPropertyName("version")]  string Version,
        [property: JsonPropertyName("files")]    PistonFile[] Files);

    private record PistonRunResult(
        [property: JsonPropertyName("stdout")] string Stdout,
        [property: JsonPropertyName("stderr")] string Stderr,
        [property: JsonPropertyName("code")]   int? Code);

    private record PistonResponse(
        [property: JsonPropertyName("run")]     PistonRunResult  Run,
        [property: JsonPropertyName("compile")] PistonRunResult? Compile);

    private record CodingTestCase(
        [property: JsonPropertyName("input")]    JsonElement[] Input,
        [property: JsonPropertyName("expected")] JsonElement Expected);
}
