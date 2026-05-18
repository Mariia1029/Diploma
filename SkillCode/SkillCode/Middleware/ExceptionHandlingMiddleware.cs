using Microsoft.AspNetCore.Mvc;
using SkillCode.Exceptions;
using System.Text.Json;

namespace SkillCode.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (EmailAlreadyExistsException ex)
        {
            _logger.LogWarning(ex, "Duplicate email attempt: {Email}", ex.Message);
            await WriteProblemDetailsAsync(context, StatusCodes.Status409Conflict, "Конфлікт", ex.Message);
        }
        catch (InvalidCredentialsException ex)
        {
            _logger.LogWarning("Invalid credentials attempt");
            await WriteProblemDetailsAsync(context, StatusCodes.Status401Unauthorized, "Не авторизовано", ex.Message);
        }
        catch (AccountBlockedException ex)
        {
            _logger.LogWarning("Blocked account login attempt, blocked until {BlockedUntil}", ex.BlockedUntil);
            await WriteProblemDetailsAsync(context, 423, "Обліковий запис заблоковано", ex.Message);
        }
        catch (UserBlockedException ex)
        {
            _logger.LogWarning("Blocked user attempted to access a resource");
            await WriteProblemDetailsAsync(context, StatusCodes.Status403Forbidden, "Доступ заборонено", ex.Message);
        }
        catch (AdminForbiddenException ex)
        {
            _logger.LogWarning("Non-admin attempted an admin-only action");
            await WriteProblemDetailsAsync(context, StatusCodes.Status403Forbidden, "Доступ заборонено", ex.Message);
        }
        catch (CannotBlockAdminException ex)
        {
            _logger.LogWarning("Attempted to block an admin account");
            await WriteProblemDetailsAsync(context, StatusCodes.Status422UnprocessableEntity, "Неможливо виконати дію", ex.Message);
        }
        catch (UserNotFoundException ex)
        {
            _logger.LogWarning("User not found");
            await WriteProblemDetailsAsync(context, StatusCodes.Status404NotFound, "Не знайдено", ex.Message);
        }
        catch (InvalidResetCodeException ex)
        {
            _logger.LogWarning("Invalid password reset code: field={Field}", ex.Field);
            await WriteValidationProblemAsync(context, StatusCodes.Status400BadRequest, ex.Field, ex.Message);
        }
        catch (EmailConflictException ex)
        {
            _logger.LogWarning("Email conflict during profile update");
            await WriteValidationProblemAsync(context, StatusCodes.Status409Conflict, ex.Field, ex.Message);
        }
        catch (WrongPasswordException ex)
        {
            _logger.LogWarning("Wrong current password during password change");
            await WriteValidationProblemAsync(context, StatusCodes.Status401Unauthorized, ex.Field, ex.Message);
        }
        catch (TemplateNotFoundException ex)
        {
            _logger.LogWarning(ex, "Template not found");
            await WriteProblemDetailsAsync(context, StatusCodes.Status404NotFound, "Не знайдено", ex.Message);
        }
        catch (TemplateForbiddenException ex)
        {
            _logger.LogWarning("Forbidden template action attempt");
            await WriteProblemDetailsAsync(context, StatusCodes.Status403Forbidden, "Доступ заборонено", ex.Message);
        }
        catch (TaskNotFoundException ex)
        {
            _logger.LogWarning(ex, "Task not found");
            await WriteProblemDetailsAsync(context, StatusCodes.Status404NotFound, "Не знайдено", ex.Message);
        }
        catch (TaskForbiddenException ex)
        {
            _logger.LogWarning("Forbidden task action attempt");
            await WriteProblemDetailsAsync(context, StatusCodes.Status403Forbidden, "Доступ заборонено", ex.Message);
        }
        catch (SavedTaskNotFoundException ex)
        {
            _logger.LogWarning(ex, "Saved task not found");
            await WriteProblemDetailsAsync(context, StatusCodes.Status404NotFound, "Не знайдено", ex.Message);
        }
        catch (SavedTaskAlreadyExistsException ex)
        {
            _logger.LogWarning(ex, "Task already saved");
            await WriteProblemDetailsAsync(context, StatusCodes.Status409Conflict, "Конфлікт", ex.Message);
        }
        catch (SavedTaskForbiddenException ex)
        {
            _logger.LogWarning("User attempted to save their own task");
            await WriteProblemDetailsAsync(context, StatusCodes.Status403Forbidden, "Доступ заборонено", ex.Message);
        }
        catch (TaskItemNotFoundException ex)
        {
            _logger.LogWarning(ex, "Task item not found");
            await WriteProblemDetailsAsync(context, StatusCodes.Status404NotFound, "Не знайдено", ex.Message);
        }
        catch (AttemptNotFoundException ex)
        {
            _logger.LogWarning(ex, "Attempt not found");
            await WriteProblemDetailsAsync(context, StatusCodes.Status404NotFound, "Не знайдено", ex.Message);
        }
        catch (AttemptForbiddenException ex)
        {
            _logger.LogWarning("Forbidden attempt access");
            await WriteProblemDetailsAsync(context, StatusCodes.Status403Forbidden, "Доступ заборонено", ex.Message);
        }
        catch (AttemptAlreadyFinishedException ex)
        {
            _logger.LogWarning(ex, "Attempt already finished");
            await WriteProblemDetailsAsync(context, StatusCodes.Status409Conflict, "Конфлікт", ex.Message);
        }
        catch (AttemptTimeLimitExceededException ex)
        {
            _logger.LogWarning(ex, "Attempt time limit exceeded");
            await WriteProblemDetailsAsync(context, StatusCodes.Status409Conflict, "Конфлікт", ex.Message);
        }
        catch (TaskItemNotInTaskException ex)
        {
            _logger.LogWarning(ex, "Task item does not belong to attempt's task");
            await WriteProblemDetailsAsync(context, StatusCodes.Status400BadRequest, "Некоректний запит", ex.Message);
        }
        catch (TaskShareNotFoundException ex)
        {
            _logger.LogWarning(ex, "Task share not found");
            await WriteProblemDetailsAsync(context, StatusCodes.Status404NotFound, "Не знайдено", ex.Message);
        }
        catch (TaskShareForbiddenException ex)
        {
            _logger.LogWarning("Forbidden task share action attempt");
            await WriteProblemDetailsAsync(context, StatusCodes.Status403Forbidden, "Доступ заборонено", ex.Message);
        }
        catch (TaskAlreadySharedException ex)
        {
            _logger.LogWarning(ex, "Task already shared to this receiver");
            await WriteProblemDetailsAsync(context, StatusCodes.Status409Conflict, "Конфлікт", ex.Message);
        }
        catch (GroupNotFoundException ex)
        {
            _logger.LogWarning(ex, "Group not found");
            await WriteProblemDetailsAsync(context, StatusCodes.Status404NotFound, "Не знайдено", ex.Message);
        }
        catch (GroupForbiddenException ex)
        {
            _logger.LogWarning("Forbidden group action attempt");
            await WriteProblemDetailsAsync(context, StatusCodes.Status403Forbidden, "Доступ заборонено", ex.Message);
        }
        catch (GroupMemberNotFoundException ex)
        {
            _logger.LogWarning(ex, "Group member not found");
            await WriteProblemDetailsAsync(context, StatusCodes.Status404NotFound, "Не знайдено", ex.Message);
        }
        catch (GroupMemberAlreadyExistsException ex)
        {
            _logger.LogWarning(ex, "User already a group member");
            await WriteProblemDetailsAsync(context, StatusCodes.Status409Conflict, "Конфлікт", ex.Message);
        }
        catch (GroupTaskNotFoundException ex)
        {
            _logger.LogWarning(ex, "Group task not found");
            await WriteProblemDetailsAsync(context, StatusCodes.Status404NotFound, "Не знайдено", ex.Message);
        }
        catch (GroupTaskAlreadyExistsException ex)
        {
            _logger.LogWarning(ex, "Task already in group");
            await WriteProblemDetailsAsync(context, StatusCodes.Status409Conflict, "Конфлікт", ex.Message);
        }
        catch (AiGenerationException ex)
        {
            _logger.LogError(ex, "AI generation failed");
            await WriteProblemDetailsAsync(context, StatusCodes.Status500InternalServerError, "Помилка генерації", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await WriteProblemDetailsAsync(context, StatusCodes.Status500InternalServerError,
                "Внутрішня помилка сервера", "Сталася неочікувана помилка. Спробуйте пізніше.");
        }
    }

    private static async Task WriteProblemDetailsAsync(HttpContext context, int statusCode, string title, string detail)
    {
        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = statusCode;

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }

    private static async Task WriteValidationProblemAsync(
        HttpContext context, int statusCode, string field, string message)
    {
        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = statusCode;

        var problem = new ValidationProblemDetails(new Dictionary<string, string[]>
        {
            [field] = [message]
        })
        {
            Status = statusCode,
            Title = "Помилка валідації"
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}
