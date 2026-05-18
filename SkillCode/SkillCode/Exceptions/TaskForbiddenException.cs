namespace SkillCode.Exceptions;

public class TaskForbiddenException : Exception
{
    public TaskForbiddenException()
        : base("У вас немає прав для виконання цієї дії з завданням")
    {
    }
}
