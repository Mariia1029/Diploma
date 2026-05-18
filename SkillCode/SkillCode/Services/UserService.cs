using AutoMapper;
using SkillCode.DTOs;
using SkillCode.Enums;
using SkillCode.Exceptions;
using SkillCode.Interfaces;
using SkillCode.Models;
using Task = System.Threading.Tasks.Task;

namespace SkillCode.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;
    private readonly IJwtService _jwtService;
    private readonly IPasswordResetStore _resetStore;
    private readonly IEmailService _emailService;

    public UserService(
        IUserRepository userRepository,
        IMapper mapper,
        IJwtService jwtService,
        IPasswordResetStore resetStore,
        IEmailService emailService)
    {
        _userRepository = userRepository;
        _mapper = mapper;
        _jwtService = jwtService;
        _resetStore = resetStore;
        _emailService = emailService;
    }

    public async Task<UserResponse> CreateAsync(RegisterUserRequest request, CancellationToken ct)
    {
        if (await _userRepository.EmailExistsAsync(request.Email, ct))
            throw new EmailAlreadyExistsException(request.Email);

        var user = _mapper.Map<User>(request);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        user.Role = UserRole.User;

        await _userRepository.AddAsync(user, ct);
        await _userRepository.SaveChangesAsync(ct);

        return _mapper.Map<UserResponse>(user);
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var user = await _userRepository.GetByEmailIncludeDeletedAsync(request.Email, ct)
                   ?? throw new InvalidCredentialsException();

        // Check active lockout
        if (user.IsBlocked && user.BlockedUntil > DateTime.UtcNow)
            throw new AccountBlockedException(user.BlockedUntil.Value);

        // Auto-unblock if lockout has expired
        if (user.IsBlocked && user.BlockedUntil <= DateTime.UtcNow)
        {
            user.IsBlocked = false;
            user.FailedLoginCount = 0;
            user.BlockedUntil = null;
        }

        // Verify password
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= 5)
            {
                user.IsBlocked = true;
                user.BlockedUntil = DateTime.UtcNow.AddMinutes(15);
                user.FailedLoginCount = 0;
            }
            await _userRepository.SaveChangesAsync(ct);
            throw new InvalidCredentialsException();
        }

        // Successful login — reset lockout state and record login time
        user.FailedLoginCount = 0;
        user.IsBlocked = false;
        user.BlockedUntil = null;
        user.LastLoginAt = DateTime.UtcNow;

        var accessToken = _jwtService.GenerateAccessToken(user);
        var (rawToken, hash) = _jwtService.GenerateRefreshToken();

        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = hash,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.AddRefreshTokenAsync(refreshTokenEntity, ct);
        await _userRepository.SaveChangesAsync(ct);

        return new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = rawToken,
            User = _mapper.Map<UserResponse>(user)
        };
    }

    public async Task DeactivateAsync(Guid userId, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct)
                   ?? throw new UserNotFoundException();

        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.SaveChangesAsync(ct);
    }

    public async Task RestoreAsync(Guid userId, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdIncludeDeletedAsync(userId, ct)
                   ?? throw new UserNotFoundException();

        user.IsDeleted = false;
        user.DeletedAt = null;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.SaveChangesAsync(ct);
    }

    public async Task DeleteAccountAsync(Guid userId, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdIncludeDeletedAsync(userId, ct)
                   ?? throw new UserNotFoundException();

        await _userRepository.RemoveAsync(user, ct);
        await _userRepository.SaveChangesAsync(ct);
    }

    public async Task<UserResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct)
                   ?? throw new UserNotFoundException();

        if (!string.Equals(user.Email, request.Email, StringComparison.OrdinalIgnoreCase)
            && await _userRepository.EmailExistsByAnotherUserAsync(request.Email, userId, ct))
            throw new EmailConflictException();

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Email = request.Email;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.SaveChangesAsync(ct);

        return _mapper.Map<UserResponse>(user);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct)
                   ?? throw new UserNotFoundException();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new WrongPasswordException();

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.SaveChangesAsync(ct);
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct)
    {
        _ = await _userRepository.GetByEmailAsync(request.Email, ct)
            ?? throw new UserNotFoundException();

        var code = Random.Shared.Next(100_000, 1_000_000).ToString();
        _resetStore.Set(request.Email, code, DateTime.UtcNow.AddMinutes(2));

        await _emailService.SendAsync(
            request.Email,
            "Відновлення паролю — SkillCode",
            EmailTemplates.PasswordReset(code, request.Email),
            ct,
            isHtml: true);
    }

    public Task VerifyResetCodeAsync(VerifyResetCodeRequest request, CancellationToken ct)
    {
        var entry = _resetStore.Get(request.Email);
        if (entry is null || entry.ExpiresAt < DateTime.UtcNow || entry.Code != request.Code)
            throw new InvalidResetCodeException("code", "Невірний або прострочений код підтвердження.");

        _resetStore.MarkVerified(request.Email);
        return Task.CompletedTask;
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct)
    {
        var entry = _resetStore.Get(request.Email);
        if (entry is null || !entry.Verified || entry.ExpiresAt < DateTime.UtcNow || entry.Code != request.Code)
            throw new InvalidResetCodeException("code", "Невірний або прострочений код підтвердження.");

        var user = await _userRepository.GetByEmailAsync(request.Email, ct)
                   ?? throw new UserNotFoundException();

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _userRepository.SaveChangesAsync(ct);

        _resetStore.Remove(request.Email);
    }

    public Task<int> GetCountAsync(CancellationToken ct)
        => _userRepository.CountAsync(ct);

    public async Task<List<UserSummaryResponse>> SearchAsync(string query, Guid currentUserId, CancellationToken ct)
    {
        var users = await _userRepository.SearchAsync(query, currentUserId, ct);
        return users.Select(u => _mapper.Map<UserSummaryResponse>(u)).ToList();
    }

    public async Task BlockUserAsync(Guid requesterId, Guid targetId, DateTime? blockedUntil, CancellationToken ct)
    {
        var requester = await _userRepository.GetByIdAsync(requesterId, ct)
                        ?? throw new UserNotFoundException();
        if (requester.Role != UserRole.Admin)
            throw new AdminForbiddenException();

        var target = await _userRepository.GetByIdAsync(targetId, ct)
                     ?? throw new UserNotFoundException();
        if (target.Role == UserRole.Admin)
            throw new CannotBlockAdminException();

        target.IsBlocked = true;
        target.BlockedUntil = blockedUntil;
        target.FailedLoginCount = 0;
        target.UpdatedAt = DateTime.UtcNow;

        await _userRepository.SaveChangesAsync(ct);
    }

    public async Task UnblockUserAsync(Guid requesterId, Guid targetId, CancellationToken ct)
    {
        var requester = await _userRepository.GetByIdAsync(requesterId, ct)
                        ?? throw new UserNotFoundException();
        if (requester.Role != UserRole.Admin)
            throw new AdminForbiddenException();

        var target = await _userRepository.GetByIdAsync(targetId, ct)
                     ?? throw new UserNotFoundException();

        target.IsBlocked = false;
        target.BlockedUntil = null;
        target.FailedLoginCount = 0;
        target.UpdatedAt = DateTime.UtcNow;

        await _userRepository.SaveChangesAsync(ct);
    }

    public async Task ChangeRoleAsync(Guid requesterId, Guid targetId, UserRole newRole, CancellationToken ct)
    {
        var requester = await _userRepository.GetByIdAsync(requesterId, ct)
                        ?? throw new UserNotFoundException();
        if (requester.Role != UserRole.Admin)
            throw new AdminForbiddenException();

        var target = await _userRepository.GetByIdAsync(targetId, ct)
                     ?? throw new UserNotFoundException();

        target.Role = newRole;
        target.UpdatedAt = DateTime.UtcNow;

        await _userRepository.SaveChangesAsync(ct);
    }

    public async Task<List<UserResponse>> GetBlockedUsersAsync(Guid requesterId, CancellationToken ct)
    {
        var requester = await _userRepository.GetByIdAsync(requesterId, ct)
                        ?? throw new UserNotFoundException();
        if (requester.Role != UserRole.Admin)
            throw new AdminForbiddenException();

        var users = await _userRepository.GetBlockedAsync(ct);
        return users.Select(u => _mapper.Map<UserResponse>(u)).ToList();
    }

    public async Task<List<UserResponse>> GetAdministratorsAsync(Guid requesterId, CancellationToken ct)
    {
        var requester = await _userRepository.GetByIdAsync(requesterId, ct)
                        ?? throw new UserNotFoundException();
        if (requester.Role != UserRole.Admin)
            throw new AdminForbiddenException();

        var admins = await _userRepository.GetByRoleAsync(UserRole.Admin, ct);
        return admins.Select(u => _mapper.Map<UserResponse>(u)).ToList();
    }
}
