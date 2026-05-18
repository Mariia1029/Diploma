namespace SkillCode.Exceptions;

public class GroupNotFoundException : Exception
{
    public GroupNotFoundException(Guid id)
        : base($"Групу з ідентифікатором '{id}' не знайдено") { }
}
