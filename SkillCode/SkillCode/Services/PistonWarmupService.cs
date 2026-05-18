using System.Net.Http.Json;

namespace SkillCode.Services;

public sealed class PistonWarmupService : BackgroundService
{
    private static readonly (string Name, string PistonLang, string Version, string Script)[] _languages =
    [
        ("Cpp",        "c++",        "10.2.0",  "#include<iostream>\nint main(){std::cout<<\"hello world\"<<std::endl;return 0;}"),
        ("C",          "c",          "10.2.0",  "#include<stdio.h>\nint main(){printf(\"hello world\\n\");return 0;}"),
        ("Python",     "python",     "3.12.0",  "print(\"hello world\")"),
        ("JavaScript", "javascript", "20.11.1", "console.log(\"hello world\")"),
        ("TypeScript", "typescript", "5.0.3",   "console.log(\"hello world\")"),
        ("Java",       "java",       "15.0.2",  "public class Main{public static void main(String[] args){System.out.println(\"hello world\");}}"),
        ("CSharp",     "csharp",     "6.12.0",  "using System;\nclass P{static void Main(){Console.WriteLine(\"hello world\");}}"),
        ("Go",         "go",         "1.16.2",  "package main\nimport \"fmt\"\nfunc main(){fmt.Println(\"hello world\")}"),
        ("Rust",       "rust",       "1.68.2",  "fn main(){println!(\"hello world\");}"),
    ];

    private readonly IHttpClientFactory _factory;
    private readonly ILogger<PistonWarmupService> _logger;
    private readonly IHostApplicationLifetime _lifetime;

    public PistonWarmupService(
        IHttpClientFactory factory,
        ILogger<PistonWarmupService> logger,
        IHostApplicationLifetime lifetime)
    {
        _factory  = factory;
        _logger   = logger;
        _lifetime = lifetime;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait until the server is fully ready before sending warmup requests
        var ready = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        _lifetime.ApplicationStarted.Register(() => ready.TrySetResult());
        await ready.Task.WaitAsync(stoppingToken);

        _logger.LogInformation("Piston warmup: starting for {Count} languages", _languages.Length);

        await Task.WhenAll(_languages.Select(lang => WarmupAsync(lang, stoppingToken)));

        _logger.LogInformation("Piston warmup: all done");
    }

    private async Task WarmupAsync(
        (string Name, string PistonLang, string Version, string Script) lang,
        CancellationToken ct)
    {
        var http = _factory.CreateClient("piston");
        try
        {
            var body = new
            {
                language = lang.PistonLang,
                version  = lang.Version,
                files    = new[] { new { content = lang.Script } },
            };

            using var response = await http.PostAsJsonAsync("api/v2/execute", body, ct);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Piston warmup [{Language}]: success", lang.Name);
        }
        catch (OperationCanceledException)
        {
            throw; // server is stopping — not a warmup failure
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Piston warmup [{Language}]: failed — {Message}", lang.Name, ex.Message);
        }
    }
}
