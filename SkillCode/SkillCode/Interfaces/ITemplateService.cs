using SkillCode.DTOs;

namespace SkillCode.Interfaces;

public interface ITemplateService
{
    Task<TemplateDetailResponse> CreateAsync(Guid ownerId, CreateTemplateRequest request, CancellationToken ct);
    Task<List<TemplateDetailResponse>> GetAllAsync(Guid ownerId, CancellationToken ct);
    Task DeleteAsync(Guid templateId, Guid requesterId, bool isAdmin, CancellationToken ct);

    // Admin actions
    Task<TemplateDetailResponse> CreateSystemTemplateAsync(Guid requesterId, CreateTemplateRequest request, CancellationToken ct);
    Task<List<TemplateDetailResponse>> GetSystemTemplatesAsync(Guid requesterId, CancellationToken ct);
}
