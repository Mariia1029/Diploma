namespace SkillCode.Exceptions;

public class AttemptForbiddenException : Exception
{
    public AttemptForbiddenException()
        : base("У вас немає доступу до цієї спроби")
    {
    }
}
