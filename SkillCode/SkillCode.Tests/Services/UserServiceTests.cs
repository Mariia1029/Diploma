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
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Tests.Services;

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IJwtService> _jwt = new();
    private readonly Mock<IPasswordResetStore> _resetStore = new();
    private readonly Mock<IEmailService> _email = new();
    private readonly IMapper _mapper;
    private readonly UserService _sut;

    public UserServiceTests()
    {
        var config = new MapperConfiguration(cfg => cfg.AddProfile<UserProfile>());
        _mapper = config.CreateMapper();
        _sut = new UserService(_userRepo.Object, _mapper, _jwt.Object, _resetStore.Object, _email.Object);
    }

    // ── CreateAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_NewEmail_ReturnsUserResponse()
    {
        var request = new RegisterUserRequest
        {
            Email = "new@test.com",
            Password = "Password1",
            FirstName = "John",
            LastName = "Doe"
        };

        _userRepo.Setup(r => r.EmailExistsAsync(request.Email, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _userRepo.Setup(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var result = await _sut.CreateAsync(request, CancellationToken.None);

        result.Email.Should().Be("new@test.com");
        result.FirstName.Should().Be("John");
        result.Role.Should().Be(UserRole.User);
    }

    [Fact]
    public async Task CreateAsync_DuplicateEmail_ThrowsEmailAlreadyExistsException()
    {
        var request = new RegisterUserRequest
        {
            Email = "existing@test.com",
            Password = "Password1",
            FirstName = "Jane",
            LastName = "Doe"
        };

        _userRepo.Setup(r => r.EmailExistsAsync(request.Email, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await _sut.Invoking(s => s.CreateAsync(request, CancellationToken.None))
            .Should().ThrowAsync<EmailAlreadyExistsException>();
    }

    // ── LoginAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsLoginResponse()
    {
        var password = "Correct1Pass";
        var user = MakeUser(email: "user@test.com", password: password);

        _userRepo.Setup(r => r.GetByEmailIncludeDeletedAsync("user@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _userRepo.Setup(r => r.AddRefreshTokenAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _jwt.Setup(j => j.GenerateAccessToken(user)).Returns("access-token");
        _jwt.Setup(j => j.GenerateRefreshToken()).Returns(("raw-token", "hash"));

        var result = await _sut.LoginAsync(
            new LoginRequest { Email = "user@test.com", Password = password },
            CancellationToken.None);

        result.AccessToken.Should().Be("access-token");
        result.RefreshToken.Should().Be("raw-token");
        result.User.Email.Should().Be("user@test.com");
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_IncrementsFailedCount()
    {
        var user = MakeUser(password: "CorrectPass1");
        user.FailedLoginCount = 2;

        _userRepo.Setup(r => r.GetByEmailIncludeDeletedAsync(user.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        await _sut.Invoking(s => s.LoginAsync(
                new LoginRequest { Email = user.Email, Password = "WrongPass1" },
                CancellationToken.None))
            .Should().ThrowAsync<InvalidCredentialsException>();

        user.FailedLoginCount.Should().Be(3);
        user.IsBlocked.Should().BeFalse();
    }

    [Fact]
    public async Task LoginAsync_FifthWrongPassword_BlocksAccount()
    {
        var user = MakeUser(password: "CorrectPass1");
        user.FailedLoginCount = 4;

        _userRepo.Setup(r => r.GetByEmailIncludeDeletedAsync(user.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        await _sut.Invoking(s => s.LoginAsync(
                new LoginRequest { Email = user.Email, Password = "WrongPass1" },
                CancellationToken.None))
            .Should().ThrowAsync<InvalidCredentialsException>();

        user.IsBlocked.Should().BeTrue();
        user.BlockedUntil.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(15), TimeSpan.FromSeconds(5));
        user.FailedLoginCount.Should().Be(0);
    }

    [Fact]
    public async Task LoginAsync_AccountBlockedWithinWindow_ThrowsAccountBlockedException()
    {
        var user = MakeUser(password: "CorrectPass1");
        user.IsBlocked = true;
        user.BlockedUntil = DateTime.UtcNow.AddMinutes(10);

        _userRepo.Setup(r => r.GetByEmailIncludeDeletedAsync(user.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        await _sut.Invoking(s => s.LoginAsync(
                new LoginRequest { Email = user.Email, Password = "CorrectPass1" },
                CancellationToken.None))
            .Should().ThrowAsync<AccountBlockedException>();
    }

    [Fact]
    public async Task LoginAsync_BlockExpired_ClearsLockoutAndSucceeds()
    {
        var password = "CorrectPass1";
        var user = MakeUser(password: password);
        user.IsBlocked = true;
        user.BlockedUntil = DateTime.UtcNow.AddMinutes(-1);
        user.FailedLoginCount = 0;

        _userRepo.Setup(r => r.GetByEmailIncludeDeletedAsync(user.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _userRepo.Setup(r => r.AddRefreshTokenAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _jwt.Setup(j => j.GenerateAccessToken(user)).Returns("access-token");
        _jwt.Setup(j => j.GenerateRefreshToken()).Returns(("raw", "hash"));

        var result = await _sut.LoginAsync(
            new LoginRequest { Email = user.Email, Password = password },
            CancellationToken.None);

        result.Should().NotBeNull();
        user.IsBlocked.Should().BeFalse();
    }

    // ── ChangePasswordAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task ChangePasswordAsync_WrongCurrentPassword_ThrowsWrongPasswordException()
    {
        var user = MakeUser(password: "CurrentPass1");
        _userRepo.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        await _sut.Invoking(s => s.ChangePasswordAsync(
                user.Id,
                new ChangePasswordRequest { CurrentPassword = "WrongPass1", NewPassword = "NewPass1Valid" },
                CancellationToken.None))
            .Should().ThrowAsync<WrongPasswordException>();
    }

    // ── DeactivateAsync / RestoreAsync ───────────────────────────────────────

    [Fact]
    public async Task DeactivateAsync_ExistingUser_SetsIsDeleted()
    {
        var user = MakeUser();
        _userRepo.Setup(r => r.GetByIdAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        await _sut.DeactivateAsync(user.Id, CancellationToken.None);

        user.IsDeleted.Should().BeTrue();
        user.DeletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task RestoreAsync_DeletedUser_ClearsIsDeleted()
    {
        var user = MakeUser();
        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow.AddDays(-1);

        _userRepo.Setup(r => r.GetByIdIncludeDeletedAsync(user.Id, It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        await _sut.RestoreAsync(user.Id, CancellationToken.None);

        user.IsDeleted.Should().BeFalse();
        user.DeletedAt.Should().BeNull();
    }

    // ── BlockUserAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task BlockUserAsync_AdminBlocksRegularUser_SetsIsBlocked()
    {
        var admin = MakeUser(role: UserRole.Admin);
        var target = MakeUser();

        _userRepo.Setup(r => r.GetByIdAsync(admin.Id, It.IsAny<CancellationToken>())).ReturnsAsync(admin);
        _userRepo.Setup(r => r.GetByIdAsync(target.Id, It.IsAny<CancellationToken>())).ReturnsAsync(target);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var until = DateTime.UtcNow.AddHours(1);
        await _sut.BlockUserAsync(admin.Id, target.Id, until, CancellationToken.None);

        target.IsBlocked.Should().BeTrue();
        target.BlockedUntil.Should().Be(until);
    }

    [Fact]
    public async Task BlockUserAsync_AdminBlocksAdmin_ThrowsCannotBlockAdminException()
    {
        var admin = MakeUser(role: UserRole.Admin);
        var otherAdmin = MakeUser(role: UserRole.Admin);

        _userRepo.Setup(r => r.GetByIdAsync(admin.Id, It.IsAny<CancellationToken>())).ReturnsAsync(admin);
        _userRepo.Setup(r => r.GetByIdAsync(otherAdmin.Id, It.IsAny<CancellationToken>())).ReturnsAsync(otherAdmin);

        await _sut.Invoking(s => s.BlockUserAsync(admin.Id, otherAdmin.Id, null, CancellationToken.None))
            .Should().ThrowAsync<CannotBlockAdminException>();
    }

    [Fact]
    public async Task ChangeRoleAsync_NonAdminRequester_ThrowsAdminForbiddenException()
    {
        var requester = MakeUser(role: UserRole.User);
        var target = MakeUser();

        _userRepo.Setup(r => r.GetByIdAsync(requester.Id, It.IsAny<CancellationToken>())).ReturnsAsync(requester);

        await _sut.Invoking(s => s.ChangeRoleAsync(
                requester.Id, target.Id, UserRole.Admin, CancellationToken.None))
            .Should().ThrowAsync<AdminForbiddenException>();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static User MakeUser(
        string email = "user@example.com",
        string password = "Password1",
        UserRole role = UserRole.User) => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
        FirstName = "Test",
        LastName = "User",
        Role = role
    };
}
