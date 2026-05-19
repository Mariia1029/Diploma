using System.IdentityModel.Tokens.Jwt;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SkillCode.Enums;
using SkillCode.Models;
using SkillCode.Services;
using Xunit;

namespace SkillCode.Tests.Services;

public class JwtServiceTests
{
    private const string SecretKey = "super-secret-key-at-least-32-characters-long!!";
    private const string Issuer = "SkillCode";
    private const string Audience = "SkillCodeClient";
    private const int ExpiryMinutes = 60;

    private readonly JwtService _sut;

    public JwtServiceTests()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = SecretKey,
                ["Jwt:Issuer"] = Issuer,
                ["Jwt:Audience"] = Audience,
                ["Jwt:ExpiryMinutes"] = ExpiryMinutes.ToString()
            })
            .Build();

        _sut = new JwtService(config);
    }

    [Fact]
    public void GenerateAccessToken_ContainsExpectedClaims()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            Role = UserRole.User,
            PasswordHash = "hash",
            FirstName = "Test",
            LastName = "User"
        };

        var tokenString = _sut.GenerateAccessToken(user);

        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(tokenString);

        token.Subject.Should().Be(user.Id.ToString());
        token.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Email && c.Value == user.Email);
        token.Claims.Should().Contain(c => c.Type == "role" && c.Value == "user");
    }

    [Fact]
    public void GenerateAccessToken_AdminRole_HasAdminRoleClaim()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "admin@example.com",
            Role = UserRole.Admin,
            PasswordHash = "hash",
            FirstName = "Admin",
            LastName = "User"
        };

        var tokenString = _sut.GenerateAccessToken(user);

        var token = new JwtSecurityTokenHandler().ReadJwtToken(tokenString);
        token.Claims.Should().Contain(c => c.Type == "role" && c.Value == "admin");
    }

    [Fact]
    public void GenerateAccessToken_ExpiryIsApproximately60Minutes()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            Role = UserRole.User,
            PasswordHash = "hash",
            FirstName = "Test",
            LastName = "User"
        };

        var tokenString = _sut.GenerateAccessToken(user);
        var token = new JwtSecurityTokenHandler().ReadJwtToken(tokenString);

        token.ValidTo.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(ExpiryMinutes), TimeSpan.FromSeconds(10));
    }

    [Fact]
    public void GenerateRefreshToken_TwoCallsReturnDifferentTokens()
    {
        var (raw1, hash1) = _sut.GenerateRefreshToken();
        var (raw2, hash2) = _sut.GenerateRefreshToken();

        raw1.Should().NotBe(raw2);
        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void GenerateAccessToken_WrongKeyFailsValidation()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            Role = UserRole.User,
            PasswordHash = "hash",
            FirstName = "Test",
            LastName = "User"
        };

        var tokenString = _sut.GenerateAccessToken(user);

        var wrongKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("wrong-key-totally-different-from-real-one!!"));
        var validationParams = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = wrongKey,
            ValidateIssuer = false,
            ValidateAudience = false
        };

        var handler = new JwtSecurityTokenHandler();
        var act = () => handler.ValidateToken(tokenString, validationParams, out _);

        act.Should().Throw<SecurityTokenSignatureKeyNotFoundException>();
    }
}
