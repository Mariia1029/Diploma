namespace SkillCode.Exceptions;

public class AttemptAnswerNotFoundException : Exception
{
    public AttemptAnswerNotFoundException(Guid id)
        : base($"Відповідь з ідентифікатором '{id}' не знайдено")
    {
    }
}
