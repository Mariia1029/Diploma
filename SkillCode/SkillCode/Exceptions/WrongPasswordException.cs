namespace SkillCode.Exceptions;

public class WrongPasswordException : Exception
{
    public string Field { get; }

    public WrongPasswordException() : base("Невірний поточний пароль.")
    {
        Field = "currentPassword";
    }
}
