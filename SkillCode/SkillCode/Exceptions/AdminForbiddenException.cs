namespace SkillCode.Exceptions;

public class AdminForbiddenException : Exception
{
    public AdminForbiddenException() : base("Доступ дозволено лише адміністраторам.") { }
}
