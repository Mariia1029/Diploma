namespace SkillCode.Exceptions;

public class CannotBlockAdminException : Exception
{
    public CannotBlockAdminException() : base("Неможливо заблокувати обліковий запис адміністратора.") { }
}
