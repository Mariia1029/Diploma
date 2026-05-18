namespace SkillCode.Exceptions;

public class TaskShareNotFoundException : Exception
{
    public TaskShareNotFoundException(Guid id)
        : base($"Поділення з ідентифікатором '{id}' не знайдено")
    {
    }
}
