namespace SkillCode.Exceptions;

public class EmailConflictException : Exception
{
    public string Field { get; }

    public EmailConflictException() : base("Електронна пошта вже використовується іншим користувачем.")
    {
        Field = "email";
    }
}
