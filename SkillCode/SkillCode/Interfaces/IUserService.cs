using SkillCode.DTOs;
using SkillCode.Enums;

namespace SkillCode.Interfaces;

public interface IUserService
{
    Task<UserResponse> CreateAsync(RegisterUserRequest request, CancellationToken ct);
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct);
    Task<UserResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct);
    Task DeactivateAsync(Guid userId, CancellationToken ct);
    Task RestoreAsync(Guid userId, CancellationToken ct);
    Task DeleteAccountAsync(Guid userId, CancellationToken ct);
    Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct);
    Task VerifyResetCodeAsync(VerifyResetCodeRequest request, CancellationToken ct);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct);
    Task<List<UserSummaryResponse>> SearchAsync(string query, Guid currentUserId, CancellationToken ct);
    Task<int> GetCountAsync(CancellationToken ct);

    // Admin actions
    Task BlockUserAsync(Guid requesterId, Guid targetId, DateTime? blockedUntil, CancellationToken ct);
    Task UnblockUserAsync(Guid requesterId, Guid targetId, CancellationToken ct);
    Task ChangeRoleAsync(Guid requesterId, Guid targetId, UserRole newRole, CancellationToken ct);
    Task<List<UserResponse>> GetBlockedUsersAsync(Guid requesterId, CancellationToken ct);
    Task<List<UserResponse>> GetAdministratorsAsync(Guid requesterId, CancellationToken ct);
}
