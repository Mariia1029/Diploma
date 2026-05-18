using AutoMapper;
using SkillCode.DTOs;
using SkillCode.Models;

namespace SkillCode.Mapping;

public class GroupProfile : Profile
{
    public GroupProfile()
    {
        CreateMap<Group, GroupResponse>();

        CreateMap<Group, GroupDetailResponse>()
            .ForMember(dest => dest.Owner, opt => opt.MapFrom(src => src.Owner))
            .ForMember(dest => dest.Members, opt => opt.MapFrom(src => src.GroupMembers))
            .ForMember(dest => dest.Tasks, opt => opt.MapFrom(src => src.GroupTasks));

        CreateMap<GroupMember, GroupMemberResponse>()
            .ForMember(dest => dest.User, opt => opt.MapFrom(src => src.User));

        CreateMap<GroupTask, GroupTaskResponse>()
            .ForMember(dest => dest.Task, opt => opt.MapFrom(src => src.Task))
            .ForMember(dest => dest.SharedByUser, opt => opt.MapFrom(src => src.SharedByUser));
    }
}
