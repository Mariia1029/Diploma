using System.Net;
using System.Net.Mail;
using SkillCode.Interfaces;

namespace SkillCode.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendAsync(string to, string subject, string body, CancellationToken ct, bool isHtml = false)
    {
        var section = _config.GetSection("Smtp");
        var host = section["Host"]!;
        var port = int.Parse(section["Port"]!);
        var enableSsl = bool.Parse(section["EnableSsl"] ?? "true");
        var username = section["Username"]!;
        var password = section["Password"]!;
        var fromName = section["FromName"] ?? "SkillCode";

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            Credentials = new NetworkCredential(username, password)
        };

        using var message = new MailMessage
        {
            From = new MailAddress(username, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = isHtml
        };
        message.To.Add(to);

        await client.SendMailAsync(message, ct);
    }
}
