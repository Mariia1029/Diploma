namespace SkillCode.Exceptions;

public class SavedTaskAlreadyExistsException : Exception
{
    public SavedTaskAlreadyExistsException(Guid taskId)
        : base($"Завдання '{taskId}' вже збережено")
    {
    }
}
