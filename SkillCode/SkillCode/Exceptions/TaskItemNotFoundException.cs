namespace SkillCode.Exceptions;

public class TaskItemNotFoundException : Exception
{
    public TaskItemNotFoundException(Guid id)
        : base($"Питання з ідентифікатором '{id}' не знайдено")
    {
    }
}
