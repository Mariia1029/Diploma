using AutoMapper;
using SkillCode.DTOs;
using SkillCode.Models;
using ModelTask = SkillCode.Models.Task;

namespace SkillCode.Mapping;

public class TaskProfile : Profile
{
    public TaskProfile()
    {
        CreateMap<CreateTaskItemRequest, TaskItem>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.TaskId, opt => opt.Ignore())
            .ForMember(dest => dest.TemplateItemId, opt => opt.Ignore())
            .ForMember(dest => dest.Task, opt => opt.Ignore())
            .ForMember(dest => dest.TemplateItem, opt => opt.Ignore())
            .ForMember(dest => dest.AttemptAnswers, opt => opt.Ignore());

        CreateMap<TaskItem, TaskItemResponse>();
        CreateMap<TaskItem, TaskItemDetailResponse>();

        CreateMap<CreateTaskRequest, ModelTask>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.OwnerId, opt => opt.Ignore())
            .ForMember(dest => dest.Status, opt => opt.Ignore())
            .ForMember(dest => dest.IsCopy, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Owner, opt => opt.Ignore())
            .ForMember(dest => dest.TaskItems, opt => opt.Ignore())
            .ForMember(dest => dest.Attempts, opt => opt.Ignore())
            .ForMember(dest => dest.GroupTasks, opt => opt.Ignore())
            .ForMember(dest => dest.SavedTasks, opt => opt.Ignore())
            .ForMember(dest => dest.TaskShares, opt => opt.Ignore())
            .ForMember(dest => dest.Template, opt => opt.Ignore());

        CreateMap<ModelTask, TaskResponse>()
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));

        CreateMap<ModelTask, TaskDetailResponse>()
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(dest => dest.TaskItems, opt => opt.MapFrom(src => src.TaskItems));

        CreateMap<ModelTask, PublicTaskDetailResponse>()
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(dest => dest.TaskItems, opt => opt.MapFrom(src => src.TaskItems));
    }
}
