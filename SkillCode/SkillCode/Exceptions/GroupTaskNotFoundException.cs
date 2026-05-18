namespace SkillCode.Exceptions;

public class GroupTaskNotFoundException : Exception
{
    public GroupTaskNotFoundException()
        : base("Завдання не знайдено в групі") { }
}
