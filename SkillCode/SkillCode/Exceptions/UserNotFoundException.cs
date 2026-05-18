namespace SkillCode.Exceptions;

public class UserNotFoundException : Exception
{
    public UserNotFoundException() : base("Користувача не знайдено.") { }
}
