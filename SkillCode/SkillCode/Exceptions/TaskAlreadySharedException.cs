namespace SkillCode.Exceptions;

public class TaskAlreadySharedException : Exception
{
    public TaskAlreadySharedException(Guid taskId, Guid receiverId)
        : base($"Завдання '{taskId}' вже надіслано користувачу '{receiverId}'")
    {
    }
}
