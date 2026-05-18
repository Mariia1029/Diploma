namespace SkillCode.Exceptions;

public class TemplateNotFoundException : Exception
{
    public TemplateNotFoundException(Guid id)
        : base($"Шаблон із ідентифікатором '{id}' не знайдено")
    {
    }
}
