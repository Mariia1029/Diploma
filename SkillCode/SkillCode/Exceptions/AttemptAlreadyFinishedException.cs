namespace SkillCode.Exceptions;

public class AttemptAlreadyFinishedException : Exception
{
    public AttemptAlreadyFinishedException(Guid id)
        : base($"Спроба '{id}' вже завершена")
    {
    }
}
