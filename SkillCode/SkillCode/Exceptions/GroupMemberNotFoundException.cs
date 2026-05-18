namespace SkillCode.Exceptions;

public class GroupMemberNotFoundException : Exception
{
    public GroupMemberNotFoundException()
        : base("Учасника групи не знайдено") { }
}
