using AutoMapper;
using SkillCode.DTOs;
using SkillCode.Models;

namespace SkillCode.Mapping;

public class TemplateProfile : Profile
{
    public TemplateProfile()
    {
        CreateMap<CreateTemplateItemRequest, TemplateItem>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.TemplateId, opt => opt.Ignore())
            .ForMember(dest => dest.Template, opt => opt.Ignore())
            .ForMember(dest => dest.TaskItems, opt => opt.Ignore());

        CreateMap<TemplateItem, TemplateItemResponse>();

        CreateMap<CreateTemplateRequest, Template>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.OwnerId, opt => opt.Ignore())
            .ForMember(dest => dest.IsSystem, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Owner, opt => opt.Ignore())
            .ForMember(dest => dest.Tasks, opt => opt.Ignore())
            .ForMember(dest => dest.TemplateItems, opt => opt.Ignore());

        CreateMap<Template, TemplateDetailResponse>()
            .ForMember(dest => dest.Items, opt => opt.MapFrom(src => src.TemplateItems));
    }
}
