namespace SkillCode.Exceptions;

public class GroupForbiddenException : Exception
{
    public GroupForbiddenException(string message = "Недостатньо прав для цієї дії в групі")
        : base(message) { }
}
