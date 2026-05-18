using Microsoft.EntityFrameworkCore;
using SkillCode.Data;
using SkillCode.Interfaces;
using SkillCode.Models;

namespace SkillCode.Repositories;

public class TemplateRepository : ITemplateRepository
{
    private readonly AppDbContext _db;

    public TemplateRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Template> AddAsync(Template template, CancellationToken ct)
    {
        await _db.Templates.AddAsync(template, ct);
        return template;
    }

    public Task<Template?> GetByIdAsync(Guid id, CancellationToken ct)
        => _db.Templates
            .Include(t => t.Owner)
            .Include(t => t.TemplateItems)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<List<Template>> GetByOwnerIdAsync(Guid ownerId, CancellationToken ct)
        => _db.Templates
            .Include(t => t.Owner)
            .Include(t => t.TemplateItems)
            .Where(t => t.OwnerId == ownerId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

    public Task<List<Template>> GetSystemAndUserAsync(Guid ownerId, CancellationToken ct)
        => _db.Templates
            .Include(t => t.Owner)
            .Include(t => t.TemplateItems)
            .Where(t => t.IsSystem || t.OwnerId == ownerId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

    public Task<List<Template>> GetSystemAsync(CancellationToken ct)
        => _db.Templates
            .Include(t => t.Owner)
            .Include(t => t.TemplateItems)
            .Where(t => t.IsSystem)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

    public void Delete(Template template) => _db.Templates.Remove(template);

    public Task<int> SaveChangesAsync(CancellationToken ct)
        => _db.SaveChangesAsync(ct);
}
