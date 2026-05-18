namespace SkillCode.Exceptions;

public class GroupTaskAlreadyExistsException : Exception
{
    public GroupTaskAlreadyExistsException()
        : base("Завдання вже додано до цієї групи") { }
}
