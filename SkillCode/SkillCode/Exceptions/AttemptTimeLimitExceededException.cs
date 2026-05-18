namespace SkillCode.Exceptions;

public class AttemptTimeLimitExceededException : Exception
{
    public AttemptTimeLimitExceededException(Guid id)
        : base($"Час виконання спроби '{id}' вичерпано")
    {
    }
}
