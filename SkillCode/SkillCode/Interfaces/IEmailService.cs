namespace SkillCode.Interfaces;

public interface IEmailService
{
    Task SendAsync(string to, string subject, string body, CancellationToken ct, bool isHtml = false);
}
