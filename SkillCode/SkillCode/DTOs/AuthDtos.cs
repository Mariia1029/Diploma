using System.ComponentModel.DataAnnotations;

namespace SkillCode.DTOs;

public class ForgotPasswordRequest
{
    [Required(ErrorMessage = "Електронна пошта обов'язкова")]
    [EmailAddress(ErrorMessage = "Невірний формат електронної пошти")]
    public string Email { get; set; } = null!;
}

public class VerifyResetCodeRequest
{
    [Required(ErrorMessage = "Електронна пошта обов'язкова")]
    [EmailAddress(ErrorMessage = "Невірний формат електронної пошти")]
    public string Email { get; set; } = null!;

    [Required(ErrorMessage = "Код підтвердження обов'язковий")]
    [StringLength(6, MinimumLength = 6, ErrorMessage = "Код повинен містити рівно 6 символів")]
    public string Code { get; set; } = null!;
}

public class ResetPasswordRequest
{
    [Required(ErrorMessage = "Електронна пошта обов'язкова")]
    [EmailAddress(ErrorMessage = "Невірний формат електронної пошти")]
    public string Email { get; set; } = null!;

    [Required(ErrorMessage = "Код підтвердження обов'язковий")]
    [StringLength(6, MinimumLength = 6, ErrorMessage = "Код повинен містити рівно 6 символів")]
    public string Code { get; set; } = null!;

    [Required(ErrorMessage = "Новий пароль обов'язковий")]
    [MinLength(8, ErrorMessage = "Пароль повинен містити щонайменше 8 символів")]
    public string NewPassword { get; set; } = null!;
}

public class LoginRequest
{
    [Required(ErrorMessage = "Електронна пошта обов'язкова")]
    [EmailAddress(ErrorMessage = "Невірний формат електронної пошти")]
    public string Email { get; set; } = null!;

    [Required(ErrorMessage = "Пароль обов'язковий")]
    public string Password { get; set; } = null!;
}
 
public class LoginResponse
{
    public string AccessToken { get; set; } = null!;
    public string RefreshToken { get; set; } = null!;
    public UserResponse User { get; set; } = null!;
}
 
public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = null!;
}
 
public class RefreshTokenResponse
{
    public string AccessToken { get; set; } = null!;
    public string RefreshToken { get; set; } = null!;
}