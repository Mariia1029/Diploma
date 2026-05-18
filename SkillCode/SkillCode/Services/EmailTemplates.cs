using System.Net;

namespace SkillCode.Services;

public static class EmailTemplates
{
    public static string PasswordReset(string code, string email)
    {
        var digits = code.PadLeft(6, '0').ToCharArray();

        static string Digit(char d) => $"""
            <td style="width:52px;height:64px;background:#10171d;border:1px solid #4ade80;
                       border-radius:6px;text-align:center;vertical-align:middle;
                       font-size:30px;font-weight:700;color:#4ade80;
                       box-shadow:0 0 18px rgba(74,222,128,0.12);">{d}</td>
            """;

        const string Gap = """<td style="width:8px;"></td>""";
        const string Sep = """<td style="width:24px;text-align:center;vertical-align:middle;font-size:18px;color:#1e2d22;padding-bottom:4px;">·</td>""";

        var digitRow = $"{Digit(digits[0])}{Gap}{Digit(digits[1])}{Gap}{Digit(digits[2])}{Sep}{Digit(digits[3])}{Gap}{Digit(digits[4])}{Gap}{Digit(digits[5])}";
        var safeEmail = WebUtility.HtmlEncode(email);

        return $"""
            <!DOCTYPE html>
            <html lang="uk">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <title>SkillCode &#8212; Відновлення паролю</title>
              <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
            </head>
            <body style="margin:0;padding:0;background:#0d1117;font-family:'JetBrains Mono',Consolas,'Courier New',monospace;-webkit-font-smoothing:antialiased;">

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d1117;padding:48px 24px;">
              <tr><td align="center">
                <table width="520" cellpadding="0" cellspacing="0" border="0">

                  <tr>
                    <td style="padding-bottom:36px;">
                      <span style="font-size:13px;font-weight:600;color:#4ade80;letter-spacing:0.08em;">SkillCode</span>
                      <span style="font-size:13px;color:#1e2d22;margin:0 8px;">/</span>
                      <span style="font-size:13px;color:#243b2a;">auth</span>
                      <span style="font-size:13px;color:#1e2d22;margin:0 8px;">/</span>
                      <span style="font-size:13px;color:#243b2a;">password-reset</span>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:6px;">
                      <span style="font-size:12px;color:#6db88a;font-style:italic;">// Привіт!</span>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:32px;">
                      <p style="margin:0;font-size:13px;line-height:1.8;color:#cdd9e5;">
                        Ми отримали запит на відновлення пароля для <span style="color:#6db88a;">{safeEmail}</span>.<br>
                        Введіть код нижче, щоб продовжити.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:28px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="border-top:1px solid #1e2d22;"></td>
                      </tr></table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:14px;">
                      <span style="font-size:11px;color:#6db88a;letter-spacing:0.12em;font-style:italic;">// reset_code</span>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:10px;">
                      <table cellpadding="0" cellspacing="0" border="0"><tr>
                        {digitRow}
                      </tr></table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:32px;">
                      <span style="font-size:11px;color:#243b2a;">expires_in:&nbsp;</span><span style="font-size:11px;color:#6db88a;">2</span><span style="font-size:11px;color:#243b2a;">&nbsp;minutes</span>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:28px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="border-top:1px solid #1e2d22;"></td>
                      </tr></table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-bottom:40px;">
                      <span style="font-size:12px;color:#6db88a;font-style:italic;">
                        // Якщо ви не надсилали цей запит &#8212; просто проігноруйте лист.<br>
                        // Ваш пароль залишається незмінним.
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <span style="font-size:11px;color:#1e2d22;">SkillCode &copy; 2025</span>
                      <span style="font-size:11px;color:#1e2d22;margin:0 8px;">·</span>
                      <span style="font-size:11px;color:#1e2d22;">Не відповідайте на цей лист</span>
                    </td>
                  </tr>

                </table>
              </td></tr>
            </table>

            </body>
            </html>
            """;
    }
}
