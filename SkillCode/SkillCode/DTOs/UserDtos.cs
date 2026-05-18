using System.ComponentModel.DataAnnotations;
using SkillCode.Enums;

namespace SkillCode.DTOs;

public class UserResponse
{
    public Guid Id { get; set; }
    public string Email { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public UserRole Role { get; set; }
    public bool IsBlocked { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? BlockedUntil { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
 
public class UserSummaryResponse
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
}
 
public class RegisterUserRequest
{
    [Required(ErrorMessage = "Електронна пошта обов'язкова")]
    [EmailAddress(ErrorMessage = "Невірний формат електронної пошти")]
    [MaxLength(255, ErrorMessage = "Електронна пошта не може перевищувати 255 символів")]
    public string Email { get; set; } = null!;

    [Required(ErrorMessage = "Пароль обов'язковий")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Пароль повинен містити від 8 до 100 символів")]
    [RegularExpression(@"^(?=.*[A-Z])(?=.*\d).+$", ErrorMessage = "Пароль повинен містити мінімум одну велику літеру та одну цифру")]
    public string Password { get; set; } = null!;

    [Required(ErrorMessage = "Ім'я обов'язкове")]
    [MaxLength(100, ErrorMessage = "Ім'я не може перевищувати 100 символів")]
    public string FirstName { get; set; } = null!;

    [Required(ErrorMessage = "Прізвище обов'язкове")]
    [MaxLength(100, ErrorMessage = "Прізвище не може перевищувати 100 символів")]
    public string LastName { get; set; } = null!;
}
 
public record UpdateProfileRequest
{
    [Required(ErrorMessage = "Ім'я обов'язкове")]
    [MaxLength(100, ErrorMessage = "Ім'я не може перевищувати 100 символів")]
    public string FirstName { get; init; } = string.Empty;

    [Required(ErrorMessage = "Прізвище обов'язкове")]
    [MaxLength(100, ErrorMessage = "Прізвище не може перевищувати 100 символів")]
    public string LastName { get; init; } = string.Empty;

    [Required(ErrorMessage = "Електронна пошта обов'язкова")]
    [EmailAddress(ErrorMessage = "Невірний формат електронної пошти")]
    [MaxLength(256, ErrorMessage = "Електронна пошта не може перевищувати 256 символів")]
    public string Email { get; init; } = string.Empty;
}

public record ChangePasswordRequest
{
    [Required(ErrorMessage = "Поточний пароль обов'язковий")]
    public string CurrentPassword { get; init; } = string.Empty;

    [Required(ErrorMessage = "Новий пароль обов'язковий")]
    [MinLength(8, ErrorMessage = "Пароль повинен містити щонайменше 8 символів")]
    public string NewPassword { get; init; } = string.Empty;
}

public class BlockUserRequest
{
    public DateTime? BlockedUntil { get; set; }
    public string? Reason { get; set; }
}

public class ChangeRoleRequest
{
    [Required(ErrorMessage = "Нова роль є обов'язковою")]
    public UserRole NewRole { get; set; }
}