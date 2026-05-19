using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using SkillCode.Exceptions;
using SkillCode.Middleware;
using Xunit;

namespace SkillCode.Tests.Middleware;

public class ExceptionHandlingMiddlewareTests
{
    private static ExceptionHandlingMiddleware Build(RequestDelegate next)
        => new(next, Mock.Of<ILogger<ExceptionHandlingMiddleware>>());

    private static DefaultHttpContext MakeContext()
    {
        var ctx = new DefaultHttpContext();
        ctx.Response.Body = new MemoryStream();
        return ctx;
    }

    [Fact]
    public async Task UserNotFoundException_Returns404()
    {
        var middleware = Build(_ => throw new UserNotFoundException());
        var ctx = MakeContext();

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task EmailAlreadyExistsException_Returns409()
    {
        var middleware = Build(_ => throw new EmailAlreadyExistsException("test@test.com"));
        var ctx = MakeContext();

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(409);
    }

    [Fact]
    public async Task InvalidCredentialsException_Returns401()
    {
        var middleware = Build(_ => throw new InvalidCredentialsException());
        var ctx = MakeContext();

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(401);
    }

    [Fact]
    public async Task AccountBlockedException_Returns423()
    {
        var middleware = Build(_ => throw new AccountBlockedException(DateTime.UtcNow.AddMinutes(10)));
        var ctx = MakeContext();

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(423);
    }

    [Fact]
    public async Task TaskForbiddenException_Returns403()
    {
        var middleware = Build(_ => throw new TaskForbiddenException());
        var ctx = MakeContext();

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task AttemptAlreadyFinishedException_Returns409()
    {
        var middleware = Build(_ => throw new AttemptAlreadyFinishedException(Guid.NewGuid()));
        var ctx = MakeContext();

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(409);
    }

    [Fact]
    public async Task AiGenerationException_Returns500()
    {
        var middleware = Build(_ => throw new AiGenerationException("AI failed"));
        var ctx = MakeContext();

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task UnhandledException_Returns500()
    {
        var middleware = Build(_ => throw new InvalidOperationException("unexpected"));
        var ctx = MakeContext();

        await middleware.InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(500);
    }
}
