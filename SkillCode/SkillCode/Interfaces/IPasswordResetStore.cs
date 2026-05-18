namespace SkillCode.Interfaces;

public record ResetEntry(string Code, DateTime ExpiresAt, bool Verified);

public interface IPasswordResetStore
{
    void Set(string email, string code, DateTime expiresAt);
    ResetEntry? Get(string email);
    void MarkVerified(string email);
    void Remove(string email);
}
