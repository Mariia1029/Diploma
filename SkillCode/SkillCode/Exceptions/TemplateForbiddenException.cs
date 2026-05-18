namespace SkillCode.Exceptions;

public class TemplateForbiddenException : Exception
{
    public TemplateForbiddenException()
        : base("Доступ до шаблону заборонено.") { }
}
