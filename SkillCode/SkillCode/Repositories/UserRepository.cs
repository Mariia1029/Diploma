using Microsoft.EntityFrameworkCore;
using SkillCode.Data;
using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public UserRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<bool> EmailExistsAsync(string email, CancellationToken ct)
        => _db.Users.AnyAsync(u => u.Email == email && !u.IsDeleted, ct);

    public Task<bool> EmailExistsByAnotherUserAsync(string email, Guid excludeUserId, CancellationToken ct)
        => _db.Users.AnyAsync(u => u.Email == email && u.Id != excludeUserId && !u.IsDeleted, ct);

    public async Task<User> AddAsync(User user, CancellationToken ct)
    {
        await _db.Users.AddAsync(user, ct);
        return user;
    }

    public Task<int> SaveChangesAsync(CancellationToken ct)
        => _db.SaveChangesAsync(ct);

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct)
        => _db.Users.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, ct);

    public Task<User?> GetByEmailIncludeDeletedAsync(string email, CancellationToken ct)
        => _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct)
        => _db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, ct);

    public Task<User?> GetByIdIncludeDeletedAsync(Guid id, CancellationToken ct)
        => _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task RemoveAsync(User user, CancellationToken ct)
    {
        _db.Users.Remove(user);
        return System.Threading.Tasks.Task.CompletedTask;
    }

    public async Task AddRefreshTokenAsync(RefreshToken token, CancellationToken ct)
        => await _db.RefreshTokens.AddAsync(token, ct);

    public Task<List<User>> SearchAsync(string query, Guid excludeUserId, CancellationToken ct)
    {
        var q = query.ToLower();
        return _db.Users
            .Where(u => !u.IsDeleted && u.Id != excludeUserId &&
                (u.FirstName.ToLower().Contains(q) ||
                 u.LastName.ToLower().Contains(q) ||
                 u.Email.ToLower().Contains(q)))
            .Take(10)
            .ToListAsync(ct);
    }

    public Task<List<User>> GetBlockedAsync(CancellationToken ct)
        => _db.Users
            .Where(u => u.IsBlocked && !u.IsDeleted)
            .OrderBy(u => u.BlockedUntil)
            .ToListAsync(ct);

    public Task<List<User>> GetByRoleAsync(UserRole role, CancellationToken ct)
        => _db.Users
            .Where(u => u.Role == role && !u.IsDeleted)
            .OrderBy(u => u.LastName)
            .ToListAsync(ct);

    public Task<int> CountAsync(CancellationToken ct)
        => _db.Users.CountAsync(u => !u.IsDeleted, ct);
}
