namespace SkillCode.Exceptions;

public class TaskShareForbiddenException : Exception
{
    public TaskShareForbiddenException()
        : base("У вас немає прав для виконання цієї дії з поділенням")
    {
    }
}
