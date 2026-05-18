namespace SkillCode.Exceptions;

public class SavedTaskForbiddenException : Exception
{
    public SavedTaskForbiddenException()
        : base("Не можна зберегти власне завдання")
    {
    }
}
