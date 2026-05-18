namespace SkillCode.Exceptions;

public class AccountBlockedException : Exception
{
    public DateTime BlockedUntil { get; }

    public AccountBlockedException(DateTime blockedUntil)
        : base($"Обліковий запис заблоковано до {blockedUntil:HH:mm dd.MM.yyyy}")
    {
        BlockedUntil = blockedUntil;
    }
}
