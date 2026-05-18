using AutoMapper;
using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Exceptions;
using SkillCode.Interfaces;
using SkillCode.Models;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Services;

public class TemplateService : ITemplateService
{
    private readonly ITemplateRepository _templateRepository;
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;

    public TemplateService(ITemplateRepository templateRepository, IUserRepository userRepository, IMapper mapper)
    {
        _templateRepository = templateRepository;
        _userRepository = userRepository;
        _mapper = mapper;
    }

    public async Task<TemplateDetailResponse> CreateAsync(Guid ownerId, CreateTemplateRequest request, CancellationToken ct)
    {
        var template = _mapper.Map<Template>(request);
        template.OwnerId = ownerId;
        template.IsSystem = false;
        template.TemplateItems = _mapper.Map<List<TemplateItem>>(request.Items);

        await _templateRepository.AddAsync(template, ct);
        await _templateRepository.SaveChangesAsync(ct);

        var created = await _templateRepository.GetByIdAsync(template.Id, ct)
                      ?? throw new TemplateNotFoundException(template.Id);

        return _mapper.Map<TemplateDetailResponse>(created);
    }

    public async Task<List<TemplateDetailResponse>> GetAllAsync(Guid ownerId, CancellationToken ct)
    {
        var templates = await _templateRepository.GetSystemAndUserAsync(ownerId, ct);
        return _mapper.Map<List<TemplateDetailResponse>>(templates);
    }

    public async Task DeleteAsync(Guid templateId, Guid requesterId, bool isAdmin, CancellationToken ct)
    {
        var template = await _templateRepository.GetByIdAsync(templateId, ct)
                       ?? throw new TemplateNotFoundException(templateId);

        if (template.IsSystem && !isAdmin)
            throw new TemplateForbiddenException();

        if (!template.IsSystem && template.OwnerId != requesterId)
            throw new TemplateForbiddenException();

        _templateRepository.Delete(template);
        await _templateRepository.SaveChangesAsync(ct);
    }

    public async Task<TemplateDetailResponse> CreateSystemTemplateAsync(Guid requesterId, CreateTemplateRequest request, CancellationToken ct)
    {
        var requester = await _userRepository.GetByIdAsync(requesterId, ct)
                        ?? throw new UserNotFoundException();
        if (requester.Role != UserRole.Admin)
            throw new AdminForbiddenException();

        var template = _mapper.Map<Template>(request);
        template.OwnerId = null;
        template.IsSystem = true;
        template.IsPublic = true;
        template.TemplateItems = _mapper.Map<List<TemplateItem>>(request.Items);

        await _templateRepository.AddAsync(template, ct);
        await _templateRepository.SaveChangesAsync(ct);

        var created = await _templateRepository.GetByIdAsync(template.Id, ct)
                      ?? throw new TemplateNotFoundException(template.Id);

        return _mapper.Map<TemplateDetailResponse>(created);
    }

    public async Task<List<TemplateDetailResponse>> GetSystemTemplatesAsync(Guid requesterId, CancellationToken ct)
    {
        var requester = await _userRepository.GetByIdAsync(requesterId, ct)
                        ?? throw new UserNotFoundException();
        if (requester.Role != UserRole.Admin)
            throw new AdminForbiddenException();

        var templates = await _templateRepository.GetSystemAsync(ct);
        return _mapper.Map<List<TemplateDetailResponse>>(templates);
    }
}
