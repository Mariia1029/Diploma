using System.Text.Json;

namespace SkillCode.Services.AnswerStrategies;

internal static class AnswerStrategyHelper
{
    private static readonly JsonSerializerOptions _opts = new() { PropertyNameCaseInsensitive = true };

    internal static T? Deserialize<T>(string json)
    {
        try { return JsonSerializer.Deserialize<T>(json, _opts); }
        catch { return default; }
    }
}
