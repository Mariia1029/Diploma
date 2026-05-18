using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using SkillCode.Enums;
using TaskStatus = SkillCode.Enums.TaskStatus;

namespace SkillCode.DTOs;

// ── TaskItem ────────────────────────────────────────────────────────────────
 
public class TaskItemResponse
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public Guid? TemplateItemId { get; set; }
    public int OrderIndex { get; set; }
    public TaskType Type { get; set; }
    public string Question { get; set; } = null!;
    public string? Options { get; set; }
    public bool MultiAnswer { get; set; }
    public string? Explanation { get; set; }
    public decimal Points { get; set; }
}
 
/// <summary>Same as TaskItemResponse but includes the correct answer — for owners/admins only.</summary>
public class TaskItemDetailResponse : TaskItemResponse
{
    public string CorrectAnswer { get; set; } = null!;
}
 
public class CreateTaskItemRequest
{
    public int OrderIndex { get; set; }

    [Required(ErrorMessage = "Тип елемента є обов'язковим")]
    public TaskType Type { get; set; }

    [Required(ErrorMessage = "Питання є обов'язковим")]
    public string Question { get; set; } = null!;

    public string? Options { get; set; }

    [Required(ErrorMessage = "Правильна відповідь є обов'язковою")]
    public string CorrectAnswer { get; set; } = null!;

    public bool MultiAnswer { get; set; }
    public string? Explanation { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Кількість балів не може бути від'ємною")]
    public decimal Points { get; set; }
}
 
public class UpdateTaskItemRequest
{
    public int? OrderIndex { get; set; }
    public string? Question { get; set; }
    public string? Options { get; set; }
    public string? CorrectAnswer { get; set; }
    public bool? MultiAnswer { get; set; }
    public string? Explanation { get; set; }
    public decimal? Points { get; set; }
}
 
// ── Task ────────────────────────────────────────────────────────────────────
 
public class TaskResponse
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public Guid? TemplateId { get; set; }
    public string Title { get; set; } = null!;
    public string Status { get; set; } = null!;
    public ProgrammingLanguage Language { get; set; }
    public bool AiGenerated { get; set; }
    public bool IsCopy { get; set; }
    public int? TimeLimitSeconds { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
 
public class TaskDetailResponse : TaskResponse
{
    public UserSummaryResponse Owner { get; set; } = null!;
    public List<TaskItemDetailResponse> TaskItems { get; set; } = new();
}
 
public class CreateTaskRequest
{
    [Required(ErrorMessage = "Назва завдання є обов'язковою")]
    [MaxLength(255, ErrorMessage = "Назва завдання не може перевищувати 255 символів")]
    public string Title { get; set; } = null!;

    [Required(ErrorMessage = "Мова програмування є обов'язковою")]
    public ProgrammingLanguage Language { get; set; }

    public Guid? TemplateId { get; set; }
    public int? TimeLimitSeconds { get; set; }
    public bool AiGenerated { get; set; }

    [MinLength(1, ErrorMessage = "Завдання повинне містити хоча б один елемент")]
    public List<CreateTaskItemRequest> TaskItems { get; set; } = new();
}
 
public class UpdateTaskRequest
{
    public string? Title { get; set; }
    public ProgrammingLanguage? Language { get; set; }
    public int? TimeLimitSeconds { get; set; }
}

public class SetTaskStatusRequest
{
    [Required(ErrorMessage = "Статус є обов'язковим")]
    public TaskStatus Status { get; set; }
}

public class PublicTaskDetailResponse : TaskResponse
{
    public UserSummaryResponse Owner { get; set; } = null!;
    public List<TaskItemResponse> TaskItems { get; set; } = new();
}

// ── AI Generation ────────────────────────────────────────────────────────────

public class GenerateTaskTemplateItem
{
    [JsonPropertyName("order_index")]
    public int OrderIndex { get; set; }

    [Required(ErrorMessage = "Тип елемента є обов'язковим")]
    public TaskType Type { get; set; }

    public string Content { get; set; } = "";
}

public class GenerateTaskTemplate
{
    [Required(ErrorMessage = "Назва шаблону є обов'язковою")]
    public string Title { get; set; } = null!;

    public string Description { get; set; } = "";

    [JsonPropertyName("is_public")]
    public bool IsPublic { get; set; }

    [MinLength(1, ErrorMessage = "Необхідно вказати хоча б один елемент завдання")]
    public List<GenerateTaskTemplateItem> Items { get; set; } = new();
}

public class GenerateTaskRequest
{
    [Required(ErrorMessage = "Тема є обов'язковою")]
    public string Topic { get; set; } = null!;

    [Required(ErrorMessage = "Мова програмування є обов'язковою")]
    public string Language { get; set; } = null!;

    [Required(ErrorMessage = "Складність є обов'язковою")]
    public string Difficulty { get; set; } = null!;

    [Required(ErrorMessage = "Шаблон є обов'язковим")]
    public GenerateTaskTemplate Template { get; set; } = null!;
}

public class GenerateTaskItemResponse
{
    public int OrderIndex { get; set; }
    public TaskType Type { get; set; }
    public string Question { get; set; } = null!;
    public string? Options { get; set; }
    public string CorrectAnswer { get; set; } = null!;
    public bool MultiAnswer { get; set; }
    public string? Explanation { get; set; }
    public decimal Points { get; set; }
}

public class GenerateTaskResponse
{
    public string Title { get; set; } = null!;
    public ProgrammingLanguage Language { get; set; }
    public List<GenerateTaskItemResponse> TaskItems { get; set; } = new();
}

// ── AI Answer Grading ─────────────────────────────────────────────────────────

public record GradeAnswerRequest(string Question, string UserAnswer, decimal MaxScore);
public record GradeAnswerResponse(decimal Score, string Feedback);

public record GradeFillBlankRequest(
    string  Question,
    string  CorrectAnswer,
    string  UserAnswer,
    decimal MaxScore);