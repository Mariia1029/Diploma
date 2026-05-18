namespace SkillCode.Exceptions;

public class EmailAlreadyExistsException : Exception
{
    public EmailAlreadyExistsException(string email)
        : base($"Користувач із електронною поштою '{email}' вже існує")
    {
    }
}
