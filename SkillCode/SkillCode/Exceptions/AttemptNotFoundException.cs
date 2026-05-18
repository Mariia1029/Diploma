namespace SkillCode.Exceptions;

public class AttemptNotFoundException : Exception
{
    public AttemptNotFoundException(Guid id)
        : base($"Спробу з ідентифікатором '{id}' не знайдено")
    {
    }
}
