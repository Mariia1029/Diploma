using AutoMapper;
using FluentAssertions;
using Moq;
using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Exceptions;
using SkillCode.Interfaces;
using SkillCode.Mapping;
using SkillCode.Models;
using SkillCode.Services;
using Xunit;
using ModelTask = SkillCode.Models.Task;
using Task = System.Threading.Tasks.Task;
using TaskStatus = SkillCode.Enums.TaskStatus;

namespace SkillCode.Tests.Services;

public class TaskServiceTests
{
    private readonly Mock<ITaskRepository> _taskRepo = new();
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IMapper> _mapper = new();
    private readonly TaskService _sut;

    public TaskServiceTests()
    {
        _sut = new TaskService(_taskRepo.Object, _userRepo.Object, _mapper.Object);
    }

    // ── CreateAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_ReturnsTaskDetailResponse()
    {
        var ownerId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        var request = new CreateTaskRequest { Title = "My Task", TaskItems = [] };
        var mappedTask = new ModelTask { Id = taskId, Title = "My Task", OwnerId = ownerId };
        var createdTask = new ModelTask { Id = taskId, Title = "My Task", OwnerId = ownerId, TaskItems = [] };
        var expected = new TaskDetailResponse { Id = taskId, Title = "My Task" };

        _mapper.Setup(m => m.Map<ModelTask>(request)).Returns(mappedTask);
        _mapper.Setup(m => m.Map<List<TaskItem>>(request.TaskItems)).Returns([]);
        _taskRepo.Setup(r => r.AddAsync(It.IsAny<ModelTask>(), It.IsAny<CancellationToken>())).ReturnsAsync(mappedTask);
        _taskRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _taskRepo.Setup(r => r.GetByIdAsync(taskId, It.IsAny<CancellationToken>())).ReturnsAsync(createdTask);
        _mapper.Setup(m => m.Map<TaskDetailResponse>(createdTask)).Returns(expected);

        var result = await _sut.CreateAsync(ownerId, request, CancellationToken.None);

        result.Should().BeEquivalentTo(expected);
        result.Id.Should().Be(taskId);
    }

    // ── GetByIdAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_NonExistentTask_ThrowsTaskNotFoundException()
    {
        var id = Guid.NewGuid();
        _taskRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync((ModelTask?)null);

        await _sut.Invoking(s => s.GetByIdAsync(id, CancellationToken.None))
            .Should().ThrowAsync<TaskNotFoundException>();
    }

    // ── SetStatusAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task SetStatusAsync_NonOwner_ThrowsTaskForbiddenException()
    {
        var ownerId = Guid.NewGuid();
        var requesterId = Guid.NewGuid();
        var task = new ModelTask { Id = Guid.NewGuid(), OwnerId = ownerId };

        _taskRepo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);

        await _sut.Invoking(s => s.SetStatusAsync(requesterId, task.Id, TaskStatus.Public, CancellationToken.None))
            .Should().ThrowAsync<TaskForbiddenException>();
    }

    [Fact]
    public async Task SetStatusAsync_Owner_UpdatesStatusAndReturnsResponse()
    {
        var ownerId = Guid.NewGuid();
        var task = new ModelTask { Id = Guid.NewGuid(), OwnerId = ownerId, Status = TaskStatus.Private, TaskItems = [] };
        var expected = new TaskDetailResponse { Id = task.Id, Status = "public" };

        _taskRepo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _taskRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _mapper.Setup(m => m.Map<TaskDetailResponse>(task)).Returns(expected);

        var result = await _sut.SetStatusAsync(ownerId, task.Id, TaskStatus.Public, CancellationToken.None);

        task.Status.Should().Be(TaskStatus.Public);
        result.Should().BeEquivalentTo(expected);
    }

    // ── DeleteAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_NonOwner_ThrowsTaskForbiddenException()
    {
        var ownerId = Guid.NewGuid();
        var requesterId = Guid.NewGuid();
        var task = new ModelTask { Id = Guid.NewGuid(), OwnerId = ownerId };

        _taskRepo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);

        await _sut.Invoking(s => s.DeleteAsync(requesterId, task.Id, CancellationToken.None))
            .Should().ThrowAsync<TaskForbiddenException>();
    }

    [Fact]
    public async Task DeleteAsync_Owner_CallsRepositoryDelete()
    {
        var ownerId = Guid.NewGuid();
        var task = new ModelTask { Id = Guid.NewGuid(), OwnerId = ownerId };

        _taskRepo.Setup(r => r.GetByIdAsync(task.Id, It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _taskRepo.Setup(r => r.DeleteAsync(task, It.IsAny<CancellationToken>())).Returns(System.Threading.Tasks.Task.CompletedTask);
        _taskRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        await _sut.DeleteAsync(ownerId, task.Id, CancellationToken.None);

        _taskRepo.Verify(r => r.DeleteAsync(task, It.IsAny<CancellationToken>()), Times.Once);
    }
}
