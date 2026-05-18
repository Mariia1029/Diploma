namespace SkillCode.Exceptions;

public class SavedTaskNotFoundException : Exception
{
    public SavedTaskNotFoundException(Guid taskId)
        : base($"Збережене завдання з ідентифікатором '{taskId}' не знайдено")
    {
    }
}
