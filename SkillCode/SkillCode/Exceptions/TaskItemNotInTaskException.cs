namespace SkillCode.Exceptions;

public class TaskItemNotInTaskException : Exception
{
    public TaskItemNotInTaskException(Guid taskItemId, Guid taskId)
        : base($"Елемент завдання '{taskItemId}' не належить до завдання '{taskId}'")
    {
    }
}
