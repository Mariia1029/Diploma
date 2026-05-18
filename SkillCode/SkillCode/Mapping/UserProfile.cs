using AutoMapper;
using SkillCode.DTOs;
using SkillCode.Models;

namespace SkillCode.Mapping;

public class UserProfile : Profile
{
    public UserProfile()
    {
        CreateMap<RegisterUserRequest, User>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
            .ForMember(dest => dest.Role, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.FailedLoginCount, opt => opt.Ignore())
            .ForMember(dest => dest.IsBlocked, opt => opt.Ignore())
            .ForMember(dest => dest.BlockedUntil, opt => opt.Ignore())
            .ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
            .ForMember(dest => dest.DeletedAt, opt => opt.Ignore())
            .ForMember(dest => dest.LastLoginAt, opt => opt.Ignore())
            .ForMember(dest => dest.Attempts, opt => opt.Ignore())
            .ForMember(dest => dest.GroupMembers, opt => opt.Ignore())
            .ForMember(dest => dest.GroupTasks, opt => opt.Ignore())
            .ForMember(dest => dest.Groups, opt => opt.Ignore())
            .ForMember(dest => dest.RefreshTokens, opt => opt.Ignore())
            .ForMember(dest => dest.SavedTasks, opt => opt.Ignore())
            .ForMember(dest => dest.TaskShareReceivers, opt => opt.Ignore())
            .ForMember(dest => dest.TaskShareSenders, opt => opt.Ignore())
            .ForMember(dest => dest.Tasks, opt => opt.Ignore())
            .ForMember(dest => dest.Templates, opt => opt.Ignore());

        CreateMap<User, UserResponse>();
        CreateMap<User, UserSummaryResponse>();
    }
}
