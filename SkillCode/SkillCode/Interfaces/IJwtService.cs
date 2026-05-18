using SkillCode.Models;

namespace SkillCode.Interfaces;

public interface IJwtService
{
    string GenerateAccessToken(User user);
    (string raw, string hash) GenerateRefreshToken();
}
