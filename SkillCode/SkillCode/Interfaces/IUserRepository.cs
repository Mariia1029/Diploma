using SkillCode.Enums;
using SkillCode.Models;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Interfaces;

public interface IUserRepository
{
    Task<bool> EmailExistsAsync(string email, CancellationToken ct);
    Task<bool> EmailExistsByAnotherUserAsync(string email, Guid excludeUserId, CancellationToken ct);
    Task<User> AddAsync(User user, CancellationToken ct);
    Task<int> SaveChangesAsync(CancellationToken ct);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct);
    Task<User?> GetByEmailIncludeDeletedAsync(string email, CancellationToken ct);
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<User?> GetByIdIncludeDeletedAsync(Guid id, CancellationToken ct);
    Task RemoveAsync(User user, CancellationToken ct);
    Task AddRefreshTokenAsync(RefreshToken token, CancellationToken ct);
    Task<List<User>> SearchAsync(string query, Guid excludeUserId, CancellationToken ct);
    Task<List<User>> GetBlockedAsync(CancellationToken ct);
    Task<List<User>> GetByRoleAsync(UserRole role, CancellationToken ct);
    Task<int> CountAsync(CancellationToken ct);
}
