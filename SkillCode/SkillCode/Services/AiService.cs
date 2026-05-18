using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Exceptions;
using SkillCode.Interfaces;

namespace SkillCode.Services;

public class AiService : IAiService
{
    private readonly HttpClient _http;
    private readonly string _model;

    public AiService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _http = httpClientFactory.CreateClient("openai");
        _model = configuration["OpenAI:Model"] ?? "gpt-4o";
    }

    public async Task<GenerateTaskResponse> GenerateTaskAsync(GenerateTaskRequest request, CancellationToken ct)
    {
        var language = ParseLanguage(request.Language);
        var templateJson = BuildTemplateObject(request).ToJsonString(new JsonSerializerOptions { WriteIndented = true });

        var openAiRequest = new
        {
            model = _model,
            response_format = new { type = "json_object" },
            temperature = 0.7,
            messages = new[]
            {
                new { role = "system", content = BuildSystemPrompt() },
                new { role = "user", content = BuildUserPrompt(request, language, templateJson) }
            }
        };

        HttpResponseMessage httpResponse;
        try
        {
            httpResponse = await _http.PostAsJsonAsync("v1/chat/completions", openAiRequest, ct);
            httpResponse.EnsureSuccessStatusCode();
        }
        catch (HttpRequestException ex)
        {
            throw new AiGenerationException($"Помилка зв'язку з OpenAI: {ex.Message}");
        }

        var completion = JsonNode.Parse(await httpResponse.Content.ReadAsStringAsync(ct));
        var aiContent = completion?["choices"]?[0]?["message"]?["content"]?.GetValue<string>()
            ?? throw new AiGenerationException("Некоректна структура відповіді від OpenAI");

        return ParseAiResponse(aiContent, language);
    }

    public async Task<bool> CheckFillBlankAsync(
        string question, string correctAnswer, string userAnswer, CancellationToken ct)
    {
        var openAiRequest = new
        {
            model = _model,
            response_format = new { type = "json_object" },
            temperature = 0,
            messages = new[]
            {
                new
                {
                    role = "system",
                    content = "You are an answer checker. Decide if the student's answer means the same as the correct answer, allowing for spelling variants, singular/plural differences, and minor morphological changes. Return ONLY a valid JSON object: {\"correct\": true} or {\"correct\": false}. No other text."
                },
                new
                {
                    role = "user",
                    content = $"Question: {question}\nCorrect answer: {correctAnswer}\nStudent answer: {userAnswer}"
                }
            }
        };

        HttpResponseMessage httpResponse;
        try
        {
            httpResponse = await _http.PostAsJsonAsync("v1/chat/completions", openAiRequest, ct);
            httpResponse.EnsureSuccessStatusCode();
        }
        catch (HttpRequestException ex)
        {
            throw new AiGenerationException($"Помилка зв'язку з OpenAI: {ex.Message}");
        }

        var completion = JsonNode.Parse(await httpResponse.Content.ReadAsStringAsync(ct));
        var aiContent = completion?["choices"]?[0]?["message"]?["content"]?.GetValue<string>()
            ?? throw new AiGenerationException("Некоректна структура відповіді від OpenAI");

        JsonNode result;
        try { result = JsonNode.Parse(aiContent) ?? throw new AiGenerationException("AI повернув порожній JSON"); }
        catch (JsonException) { throw new AiGenerationException("AI повернув некоректний JSON"); }

        return result["correct"]?.GetValue<bool>() ?? false;
    }

    public async Task<GradeAnswerResponse> GradeFillBlankAsync(GradeFillBlankRequest request, CancellationToken ct)
    {
        var openAiRequest = new
        {
            model = _model,
            response_format = new { type = "json_object" },
            temperature = 0.1,
            messages = new[]
            {
                new
                {
                    role = "system",
                    content =
                        "You are grading a fill-in-the-blank exercise. " +
                        "The student must supply a specific word or short phrase that belongs in a blank. " +
                        "Compare the student's answer to the correct answer: accept minor spelling variants, " +
                        "singular/plural differences, and equivalent morphological forms as fully correct. " +
                        "Award partial credit only when the answer is partially correct in meaning. " +
                        "Return ONLY a valid JSON object with two fields: " +
                        "{\"score\": number, \"feedback\": \"string\"}. " +
                        "Score must be between 0 and maxScore inclusive. Feedback: 1–2 sentences."
                },
                new
                {
                    role = "user",
                    content =
                        $"Question: {request.Question}\n" +
                        $"Correct answer: {request.CorrectAnswer}\n" +
                        $"Student answer: {request.UserAnswer}\n" +
                        $"Maximum score: {request.MaxScore}\n\n" +
                        "Respond ONLY with JSON: { \"score\": number, \"feedback\": \"string\" }"
                }
            }
        };

        HttpResponseMessage httpResponse;
        try
        {
            httpResponse = await _http.PostAsJsonAsync("v1/chat/completions", openAiRequest, ct);
            httpResponse.EnsureSuccessStatusCode();
        }
        catch (HttpRequestException ex)
        {
            throw new AiGenerationException($"Помилка зв'язку з OpenAI: {ex.Message}");
        }

        var completion = JsonNode.Parse(await httpResponse.Content.ReadAsStringAsync(ct));
        var aiContent  = completion?["choices"]?[0]?["message"]?["content"]?.GetValue<string>()
            ?? throw new AiGenerationException("Некоректна структура відповіді від OpenAI");

        JsonNode result;
        try { result = JsonNode.Parse(aiContent) ?? throw new AiGenerationException("AI повернув порожній JSON"); }
        catch (JsonException) { throw new AiGenerationException("AI повернув некоректний JSON"); }

        var score    = result["score"]?.GetValue<decimal>() ?? 0m;
        var feedback = result["feedback"]?.GetValue<string>() ?? "";

        score = Math.Clamp(score, 0m, request.MaxScore);

        return new GradeAnswerResponse(score, feedback);
    }

    public async Task<GradeAnswerResponse> GradeAnswerAsync(GradeAnswerRequest request, CancellationToken ct)
    {
        var openAiRequest = new
        {
            model = _model,
            response_format = new { type = "json_object" },
            temperature = 0.3,
            messages = new[]
            {
                new
                {
                    role = "system",
                    content = "You are a strict but fair teacher grading student answers. Return ONLY a valid JSON object with exactly two fields: \"score\" (a number) and \"feedback\" (a string of 1–2 sentences explaining the grade). No extra text, no markdown."
                },
                new
                {
                    role = "user",
                    content = $"Grade the following answer.\nQuestion: {request.Question}\nStudent answer: {request.UserAnswer}\nMaximum score: {request.MaxScore}\n\nRespond ONLY with JSON: {{ \"score\": number, \"feedback\": \"string\" }}"
                }
            }
        };

        HttpResponseMessage httpResponse;
        try
        {
            httpResponse = await _http.PostAsJsonAsync("v1/chat/completions", openAiRequest, ct);
            httpResponse.EnsureSuccessStatusCode();
        }
        catch (HttpRequestException ex)
        {
            throw new AiGenerationException($"Помилка зв'язку з OpenAI: {ex.Message}");
        }

        var completion = JsonNode.Parse(await httpResponse.Content.ReadAsStringAsync(ct));
        var aiContent = completion?["choices"]?[0]?["message"]?["content"]?.GetValue<string>()
            ?? throw new AiGenerationException("Некоректна структура відповіді від OpenAI");

        JsonNode result;
        try { result = JsonNode.Parse(aiContent) ?? throw new AiGenerationException("AI повернув порожній JSON"); }
        catch (JsonException) { throw new AiGenerationException("AI повернув некоректний JSON"); }

        var score    = result["score"]?.GetValue<decimal>() ?? 0m;
        var feedback = result["feedback"]?.GetValue<string>() ?? "";

        score = Math.Clamp(score, 0m, request.MaxScore);

        return new GradeAnswerResponse(score, feedback);
    }

    private static ProgrammingLanguage ParseLanguage(string raw) => raw.ToLowerInvariant() switch
    {
        "python"      => ProgrammingLanguage.Python,
        "java"        => ProgrammingLanguage.Java,
        "c#"          => ProgrammingLanguage.CSharp,
        "c++"         => ProgrammingLanguage.Cpp,
        "c"           => ProgrammingLanguage.C,
        "java_script" => ProgrammingLanguage.JavaScript,
        "javascript"  => ProgrammingLanguage.JavaScript,
        "type_script" => ProgrammingLanguage.TypeScript,
        "typescript"  => ProgrammingLanguage.TypeScript,
        "go"          => ProgrammingLanguage.Go,
        "rust"        => ProgrammingLanguage.Rust,
        _ => throw new AiGenerationException($"Невідома мова програмування: '{raw}'")
    };

    private static string LanguageDisplayName(ProgrammingLanguage language) => language switch
    {
        ProgrammingLanguage.CSharp     => "C#",
        ProgrammingLanguage.Cpp        => "C++",
        ProgrammingLanguage.JavaScript => "JavaScript",
        ProgrammingLanguage.TypeScript => "TypeScript",
        _ => language.ToString()
    };

    private static string BuildSystemPrompt() => """
        You are a programming task generator. You must return ONLY a valid JSON object — no explanations, no markdown, no extra text of any kind. The response must start with { and end with }.

        ABSOLUTE RULES — violations will break the system:
        - The function in every Coding task MUST be named exactly "solution" — no exceptions, no matter the topic or language
        - ALL question text, task descriptions, option labels, and explanation fields MUST be written in Ukrainian — never in English or any other language
        - All code identifiers, function names, variable names, and keywords remain in English
        - Return ONLY the JSON structure provided — do not add any fields, do not remove any fields
        - For every task item, always fill in the explanation field with a short explanation of why the correct answer is correct (2-3 sentences maximum)

        Content rules per task type:
        - SingleChoice / MultiChoice: balance the correct answer across all labels (A, B, C, D) — do not always use A or B as correct. For MultiChoice balance which combination is correct across different questions
        - TrueFalse: balance correct_answer between "true" and "false" — do not always use the same value
        - FillBlank: the question field must contain a full sentence with ___ where the missing word should be. The correct_answer must contain ONLY the missing word or phrase, nothing else
        - Ordering: options must be logically meaningful steps or items that can be ordered. correct_answer must be the correct sequence of labels
        - Matching: left and right sides must be meaningful pairs. correct_answer must correctly map left labels to right labels
        - Coding — read every rule carefully:
          * The function MUST be named exactly "solution"
          * options.signature is the complete starter template shown to the user in the code editor — it must compile and run as-is (with the body replaced by real code)
          * options.signature MUST include every import/include/package declaration needed for the code to compile without the user adding anything — examples: "#include <stdio.h>\n#include <stdlib.h>" for C, "#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;" for C++, "package main\n\nimport \"fmt\"" for Go, "import sys" / "from collections import defaultdict" etc. for Python, "import java.util.*;\nimport java.util.stream.*;" for Java
          * For C# and Java: include ONLY the method body (no class wrapper, no using/import lines — those are injected by the backend). The method MUST be declared "public static"
          * For Go: options.signature MUST start with "package main" followed by the import block, then the function — no main() function
          * For Rust: options.signature MUST include any required "use" declarations at the top, then the function — no main() function
          * For C and C++: options.signature MUST start with all required #include directives, then the function — no main() function
          * The function body in options.signature must contain only "// your code here" (or "# your code here" for Python) as placeholder
          * correct_answer contains test cases as [{"input": [...], "expected": value}] where expected is a JSON value (number, string, or boolean) matching the exact output the function should print
        - Open: correct_answer can be empty string
        - FlashCards: question is the front side of the card, correct_answer is the back side
        """;

    private static string BuildUserPrompt(GenerateTaskRequest request, ProgrammingLanguage language, string templateJson) => $"""
        Topic: {request.Topic}
        Programming language: {LanguageDisplayName(language)}
        Difficulty: {request.Difficulty}

        Fill in the following JSON template. Keep the exact structure, only fill in the content fields:

        {templateJson}
        """;

    private static JsonObject BuildTemplateObject(GenerateTaskRequest request)
    {
        var itemsArray = new JsonArray();
        foreach (var item in request.Template.Items)
        {
            itemsArray.Add(new JsonObject
            {
                ["order_index"] = item.OrderIndex,
                ["type"] = item.Type.ToString(),
                ["content"] = BuildContentTemplate(item.Type)
            });
        }

        return new JsonObject
        {
            ["title"] = request.Template.Title,
            ["items"] = itemsArray
        };
    }

    private static JsonObject BuildContentTemplate(TaskType type) => type switch
    {
        TaskType.SingleChoice => new JsonObject
        {
            ["question"] = "",
            ["options"] = new JsonObject { ["A"] = "", ["B"] = "", ["C"] = "", ["D"] = "" },
            ["correct_answer"] = "",
            ["explanation"] = ""
        },
        TaskType.MultiChoice => new JsonObject
        {
            ["question"] = "",
            ["options"] = new JsonObject { ["A"] = "", ["B"] = "", ["C"] = "", ["D"] = "" },
            ["correct_answer"] = new JsonArray(),
            ["explanation"] = ""
        },
        TaskType.TrueFalse => new JsonObject
        {
            ["question"] = "",
            ["correct_answer"] = "",
            ["explanation"] = ""
        },
        TaskType.FillBlank => new JsonObject
        {
            ["question"] = "",
            ["correct_answer"] = "",
            ["explanation"] = ""
        },
        TaskType.Ordering => new JsonObject
        {
            ["question"] = "",
            ["options"] = new JsonObject { ["A"] = "", ["B"] = "", ["C"] = "", ["D"] = "" },
            ["correct_answer"] = new JsonArray(),
            ["explanation"] = ""
        },
        TaskType.Matching => new JsonObject
        {
            ["question"] = "",
            ["options"] = new JsonObject
            {
                ["left"] = new JsonObject { ["A"] = "", ["B"] = "", ["C"] = "" },
                ["right"] = new JsonObject { ["1"] = "", ["2"] = "", ["3"] = "" }
            },
            ["correct_answer"] = new JsonObject { ["A"] = "", ["B"] = "", ["C"] = "" },
            ["explanation"] = ""
        },
        TaskType.Open => new JsonObject
        {
            ["question"] = "",
            ["correct_answer"] = "",
            ["explanation"] = ""
        },
        TaskType.FlashCards => new JsonObject
        {
            ["question"] = "",
            ["correct_answer"] = "",
            ["explanation"] = ""
        },
        TaskType.Coding => new JsonObject
        {
            ["question"] = "",
            ["options"] = new JsonObject { ["signature"] = "" },
            ["correct_answer"] = new JsonArray
            {
                new JsonObject { ["input"] = new JsonArray(), ["expected"] = "" }
            },
            ["explanation"] = ""
        },
        _ => throw new ArgumentOutOfRangeException(nameof(type), $"Unsupported task type: {type}")
    };

    private static GenerateTaskResponse ParseAiResponse(string aiJson, ProgrammingLanguage language)
    {
        JsonNode root;
        try
        {
            root = JsonNode.Parse(aiJson) ?? throw new AiGenerationException("AI повернув порожній JSON");
        }
        catch (JsonException)
        {
            throw new AiGenerationException("AI повернув некоректний JSON");
        }

        var title = root["title"]?.GetValue<string>() ?? "";
        var itemsArray = root["items"]?.AsArray()
            ?? throw new AiGenerationException("AI відповідь не містить поля 'items'");

        var taskItems = new List<GenerateTaskItemResponse>();
        foreach (var itemNode in itemsArray)
        {
            if (itemNode is null) continue;

            var orderIndex = itemNode["order_index"]?.GetValue<int>() ?? 0;
            var typeStr = itemNode["type"]?.GetValue<string>() ?? "";
            var content = itemNode["content"]
                ?? throw new AiGenerationException("Елемент відповіді не містить поля 'content'");

            if (!Enum.TryParse<TaskType>(typeStr, ignoreCase: true, out var taskType))
                throw new AiGenerationException($"AI повернув невідомий тип завдання: '{typeStr}'");

            var optionsNode = content["options"];
            var correctAnswerNode = content["correct_answer"];

            taskItems.Add(new GenerateTaskItemResponse
            {
                OrderIndex = orderIndex,
                Type = taskType,
                Question = content["question"]?.GetValue<string>() ?? "",
                Options = optionsNode?.ToJsonString(),
                CorrectAnswer = correctAnswerNode?.ToJsonString() ?? "\"\"",
                MultiAnswer = taskType == TaskType.MultiChoice,
                Explanation = content["explanation"]?.GetValue<string>(),
                Points = 1
            });
        }

        return new GenerateTaskResponse
        {
            Title = title,
            Language = language,
            TaskItems = taskItems
        };
    }
}
