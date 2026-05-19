using FluentAssertions;
using Moq;
using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Models;
using SkillCode.Services;
using SkillCode.Services.AnswerStrategies;
using System.Text.Json;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Tests.Services;

public class AnswerCheckerTests
{
    private static TaskItem MakeItem(TaskType type, string correctAnswer, decimal points = 10m) => new()
    {
        Id = Guid.NewGuid(),
        Type = type,
        Question = "Test question",
        CorrectAnswer = correctAnswer,
        Points = points
    };

    // ── SingleChoice ─────────────────────────────────────────────────────────

    [Fact]
    public async Task SingleChoice_CorrectAnswer_ReturnsFullScore()
    {
        var strategy = new SingleChoiceStrategy();
        var item = MakeItem(TaskType.SingleChoice, JsonSerializer.Serialize("B"));

        var result = await strategy.CheckAsync(item, JsonSerializer.Serialize("B"), CancellationToken.None);

        result.IsCorrect.Should().BeTrue();
        result.EarnedPoints.Should().Be(10m);
    }

    [Fact]
    public async Task SingleChoice_WrongAnswer_ReturnsZero()
    {
        var strategy = new SingleChoiceStrategy();
        var item = MakeItem(TaskType.SingleChoice, JsonSerializer.Serialize("B"));

        var result = await strategy.CheckAsync(item, JsonSerializer.Serialize("A"), CancellationToken.None);

        result.IsCorrect.Should().BeFalse();
        result.EarnedPoints.Should().Be(0m);
    }

    // ── MultiChoice ──────────────────────────────────────────────────────────

    [Fact]
    public async Task MultiChoice_AllCorrect_ReturnsFullScore()
    {
        var strategy = new MultiChoiceStrategy();
        var correct = new[] { "A", "B", "C" };
        var item = MakeItem(TaskType.MultiChoice, JsonSerializer.Serialize(correct));

        var result = await strategy.CheckAsync(item, JsonSerializer.Serialize(correct), CancellationToken.None);

        result.IsCorrect.Should().BeTrue();
        result.EarnedPoints.Should().Be(10m);
    }

    [Fact]
    public async Task MultiChoice_PartialCorrect_ReturnsPartialScore()
    {
        var strategy = new MultiChoiceStrategy();
        var correct = new[] { "A", "B", "C", "D" };
        var item = MakeItem(TaskType.MultiChoice, JsonSerializer.Serialize(correct));

        var result = await strategy.CheckAsync(item, JsonSerializer.Serialize(new[] { "A", "B" }), CancellationToken.None);

        result.IsCorrect.Should().BeFalse();
        result.EarnedPoints.Should().Be(5m); // 10 * (2/4)
    }

    // ── TrueFalse ────────────────────────────────────────────────────────────

    [Fact]
    public async Task TrueFalse_CorrectAnswer_ReturnsFullScore()
    {
        var strategy = new TrueFalseStrategy();
        var item = MakeItem(TaskType.TrueFalse, JsonSerializer.Serialize(true));

        var result = await strategy.CheckAsync(item, JsonSerializer.Serialize(true), CancellationToken.None);

        result.IsCorrect.Should().BeTrue();
        result.EarnedPoints.Should().Be(10m);
    }

    // ── Ordering ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Ordering_CorrectOrder_ReturnsFullScore()
    {
        var strategy = new OrderingStrategy();
        var order = new[] { "First", "Second", "Third" };
        var item = MakeItem(TaskType.Ordering, JsonSerializer.Serialize(order));

        var result = await strategy.CheckAsync(item, JsonSerializer.Serialize(order), CancellationToken.None);

        result.IsCorrect.Should().BeTrue();
        result.EarnedPoints.Should().Be(10m);
    }

    [Fact]
    public async Task Ordering_PartialOrder_ReturnsPartialScore()
    {
        var strategy = new OrderingStrategy();
        var correct = new[] { "First", "Second", "Third" };
        // only "First" is in the correct position
        var user = new[] { "First", "Third", "Second" };
        var item = MakeItem(TaskType.Ordering, JsonSerializer.Serialize(correct));

        var result = await strategy.CheckAsync(item, JsonSerializer.Serialize(user), CancellationToken.None);

        result.IsCorrect.Should().BeFalse();
        result.EarnedPoints.Should().BeApproximately(10m / 3m, 0.01m); // 10 * (1/3)
    }

    // ── Matching ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Matching_AllPairsCorrect_ReturnsFullScore()
    {
        var strategy = new MatchingStrategy();
        var pairs = new[] { new { Left = "Cat", Right = "Animal" }, new { Left = "Oak", Right = "Tree" } };
        var json = JsonSerializer.Serialize(pairs);
        var item = MakeItem(TaskType.Matching, json);

        var result = await strategy.CheckAsync(item, json, CancellationToken.None);

        result.IsCorrect.Should().BeTrue();
        result.EarnedPoints.Should().Be(10m);
    }

    // ── FillBlank ────────────────────────────────────────────────────────────

    [Fact]
    public async Task FillBlank_EmptyUserAnswer_ReturnsZeroWithoutCallingAi()
    {
        var aiMock = new Mock<IAiService>();
        var strategy = new FillBlankStrategy(aiMock.Object);
        var item = MakeItem(TaskType.FillBlank, "\"correct\"");

        var result = await strategy.CheckAsync(item, "\"\"", CancellationToken.None);

        result.IsCorrect.Should().BeFalse();
        result.EarnedPoints.Should().Be(0m);
        aiMock.Verify(a => a.GradeFillBlankAsync(It.IsAny<GradeFillBlankRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task FillBlank_AiReturnsHighScore_MarksAsCorrect()
    {
        var aiMock = new Mock<IAiService>();
        aiMock.Setup(a => a.GradeFillBlankAsync(It.IsAny<GradeFillBlankRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GradeAnswerResponse(9m, "Good"));

        var strategy = new FillBlankStrategy(aiMock.Object);
        var item = MakeItem(TaskType.FillBlank, "\"correct answer\"");

        var result = await strategy.CheckAsync(item, "\"correct answer\"", CancellationToken.None);

        result.IsCorrect.Should().BeTrue();
        result.EarnedPoints.Should().Be(9m);
    }

    // ── FlashCards ───────────────────────────────────────────────────────────

    [Fact]
    public async Task FlashCards_KnownTrue_ReturnsFullScore()
    {
        var strategy = new FlashCardsStrategy();
        var item = MakeItem(TaskType.FlashCards, "null");

        var result = await strategy.CheckAsync(item, "true", CancellationToken.None);

        result.IsCorrect.Should().BeTrue();
        result.EarnedPoints.Should().Be(10m);
    }

    // ── AnswerCheckerService fallback ────────────────────────────────────────

    [Fact]
    public async Task AnswerCheckerService_UnknownType_ReturnsNullScore()
    {
        // Provide only SingleChoice strategy so Coding type has no handler
        var checker = new AnswerCheckerService(new[] { new SingleChoiceStrategy() });
        var item = MakeItem(TaskType.Coding, "\"some code\"");

        var result = await checker.CheckAsync(item, "\"answer\"", CancellationToken.None);

        result.IsCorrect.Should().BeNull();
        result.EarnedPoints.Should().Be(0m);
    }
}
