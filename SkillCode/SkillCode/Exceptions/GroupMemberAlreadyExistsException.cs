namespace SkillCode.Exceptions;

public class GroupMemberAlreadyExistsException : Exception
{
    public GroupMemberAlreadyExistsException()
        : base("Користувач вже є учасником групи") { }
}
