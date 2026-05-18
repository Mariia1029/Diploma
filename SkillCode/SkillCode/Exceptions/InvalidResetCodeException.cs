namespace SkillCode.Exceptions;

public class InvalidResetCodeException : Exception
{
    public string Field { get; }

    public InvalidResetCodeException(string field, string message) : base(message)
    {
        Field = field;
    }
}
