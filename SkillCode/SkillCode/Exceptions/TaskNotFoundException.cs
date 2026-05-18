namespace SkillCode.Exceptions;

public class TaskNotFoundException : Exception
{
    public TaskNotFoundException(Guid id)
        : base($"Завдання з ідентифікатором '{id}' не знайдено")
    {
    }
}
