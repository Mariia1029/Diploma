using AutoMapper;
using SkillCode.DTOs;
using SkillCode.Models;

namespace SkillCode.Mapping;

public class AttemptProfile : Profile
{
    public AttemptProfile()
    {
        CreateMap<Attempt, AttemptResponse>()
            .ForMember(dest => dest.TimeLimitSeconds,
                opt => opt.MapFrom(src => src.Task != null ? src.Task.TimeLimitSeconds : (int?)null));
        CreateMap<Attempt, AttemptDetailResponse>()
            .ForMember(dest => dest.TimeLimitSeconds,
                opt => opt.MapFrom(src => src.Task != null ? src.Task.TimeLimitSeconds : (int?)null))
            .ForMember(dest => dest.Answers, opt => opt.MapFrom(src => src.AttemptAnswers));
        CreateMap<AttemptAnswer, AttemptAnswerResponse>();
    }
}
