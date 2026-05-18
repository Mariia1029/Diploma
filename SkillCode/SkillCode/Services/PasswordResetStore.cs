using System.Collections.Concurrent;
using SkillCode.Interfaces;

namespace SkillCode.Services;

public class PasswordResetStore : IPasswordResetStore
{
    private readonly ConcurrentDictionary<string, ResetEntry> _entries =
        new(StringComparer.OrdinalIgnoreCase);

    public void Set(string email, string code, DateTime expiresAt)
        => _entries[email] = new ResetEntry(code, expiresAt, false);

    public ResetEntry? Get(string email)
        => _entries.TryGetValue(email, out var entry) ? entry : null;

    public void MarkVerified(string email)
    {
        if (_entries.TryGetValue(email, out var entry))
            _entries[email] = entry with { Verified = true };
    }

    public void Remove(string email) => _entries.TryRemove(email, out _);
}
