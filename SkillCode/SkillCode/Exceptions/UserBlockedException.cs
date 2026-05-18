namespace SkillCode.Exceptions;

public class UserBlockedException : Exception
{
    public UserBlockedException()
        : base("Ваш обліковий запис заблоковано. Зверніться до адміністратора.")
    {
    }
}
