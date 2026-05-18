using SkillCode.Models;

namespace SkillCode.Interfaces;

public interface ITemplateRepository
{
    Task<Template> AddAsync(Template template, CancellationToken ct);
    Task<Template?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<List<Template>> GetByOwnerIdAsync(Guid ownerId, CancellationToken ct);
    Task<List<Template>> GetSystemAndUserAsync(Guid ownerId, CancellationToken ct);
    Task<List<Template>> GetSystemAsync(CancellationToken ct);
    void Delete(Template template);
    Task<int> SaveChangesAsync(CancellationToken ct);
}
