using System.ComponentModel.DataAnnotations;
using SkillCode.Enums;

namespace SkillCode.DTOs;

// ── TemplateItem ──────────────────────────────────────────────────────────────

public class TemplateItemResponse
{
    public Guid Id { get; set; }
    public Guid TemplateId { get; set; }
    public TaskType Type { get; set; }
    public string Content { get; set; } = null!;
    public int OrderIndex { get; set; }
}

public class CreateTemplateItemRequest
{
    [Required(ErrorMessage = "Тип елемента є обов'язковим")]
    public TaskType Type { get; set; }

    [Required(ErrorMessage = "Вміст елемента є обов'язковим")]
    public string Content { get; set; } = null!;

    [Range(0, int.MaxValue, ErrorMessage = "Порядковий індекс не може бути від'ємним")]
    public int OrderIndex { get; set; }
}

public class UpdateTemplateItemRequest
{
    public string? Content { get; set; }
    public int? OrderIndex { get; set; }
}

// ── Template ──────────────────────────────────────────────────────────────────

public class TemplateResponse
{
    public Guid Id { get; set; }
    public Guid? OwnerId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsSystem { get; set; }
    public bool IsPublic { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TemplateDetailResponse : TemplateResponse
{
    public UserSummaryResponse? Owner { get; set; }
    public List<TemplateItemResponse> Items { get; set; } = new();
}

public class CreateTemplateRequest
{
    [Required(ErrorMessage = "Назва шаблону є обов'язковою")]
    [MaxLength(255, ErrorMessage = "Назва шаблону не може перевищувати 255 символів")]
    public string Title { get; set; } = null!;

    public string? Description { get; set; }
    public bool IsPublic { get; set; }
    public bool IsSystem { get; set; }

    [MinLength(1, ErrorMessage = "Шаблон повинен містити хоча б один елемент")]
    public List<CreateTemplateItemRequest> Items { get; set; } = new();
}

public class UpdateTemplateRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public bool? IsPublic { get; set; }
}