namespace SkillCode.Exceptions;

public class InvalidCredentialsException : Exception
{
    public InvalidCredentialsException()
        : base("Невірна електронна пошта або пароль")
    {
    }
}
