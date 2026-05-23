using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Npgsql.NameTranslation;
using SkillCode.BackgroundServices;
using SkillCode.Data;
using SkillCode.Enums;
using SkillCode.Interfaces;
using SkillCode.Middleware;
using SkillCode.Options;
using SkillCode.Repositories;
using SkillCode.Services;
using SkillCode.Services.AnswerStrategies;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
var snakeCase = new NpgsqlSnakeCaseNameTranslator();
dataSourceBuilder.MapEnum<UserRole>("user_role", snakeCase);
dataSourceBuilder.MapEnum<GroupRole>("group_role", snakeCase);
dataSourceBuilder.MapEnum<SkillCode.Enums.TaskStatus>("task_status", snakeCase);
dataSourceBuilder.MapEnum<TaskType>("task_type", snakeCase);
dataSourceBuilder.MapEnum<AttemptType>("type_attempts", snakeCase);
dataSourceBuilder.MapEnum<AttemptStatus>("attempt_status", snakeCase);
dataSourceBuilder.MapEnum<ProgrammingLanguage>("programming_language", new PgProgrammingLanguageTranslator());
var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(dataSource));

// AutoMapper — scans all profiles in this assembly
builder.Services.AddAutoMapper(typeof(Program).Assembly);

// JWT authentication
var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSection["Key"]!))
        };
    });

// Repository and service registrations (Scoped to match AppDbContext lifetime)
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ITemplateRepository, TemplateRepository>();
builder.Services.AddScoped<ITemplateService, TemplateService>();
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IAttemptRepository, AttemptRepository>();
builder.Services.AddScoped<IAttemptAnswerRepository, AttemptAnswerRepository>();
builder.Services.AddScoped<IAnswerCheckStrategy, SingleChoiceStrategy>();
builder.Services.AddScoped<IAnswerCheckStrategy, TrueFalseStrategy>();
builder.Services.AddScoped<IAnswerCheckStrategy, MultiChoiceStrategy>();
builder.Services.AddScoped<IAnswerCheckStrategy, OrderingStrategy>();
builder.Services.AddScoped<IAnswerCheckStrategy, MatchingStrategy>();
builder.Services.AddScoped<IAnswerCheckStrategy, FlashCardsStrategy>();
builder.Services.AddScoped<IAnswerCheckStrategy, FillBlankStrategy>();
builder.Services.AddScoped<IAnswerCheckStrategy, OpenAnswerStrategy>();
builder.Services.AddScoped<IAnswerCheckStrategy, CodingStrategy>();
builder.Services.AddScoped<IAnswerCheckerService, AnswerCheckerService>();
builder.Services.AddScoped<IAttemptService, AttemptService>();
builder.Services.AddScoped<ISavedTaskRepository, SavedTaskRepository>();
builder.Services.AddScoped<ISavedTaskService, SavedTaskService>();
builder.Services.AddScoped<ITaskShareRepository, TaskShareRepository>();
builder.Services.AddScoped<ITaskShareService, TaskShareService>();
builder.Services.AddScoped<IGroupRepository, GroupRepository>();
builder.Services.AddScoped<IGroupService, GroupService>();

// JwtService is stateless — Singleton is appropriate
builder.Services.AddSingleton<IJwtService, JwtService>();

// PasswordResetStore is Singleton so the in-memory codes survive across requests
builder.Services.AddSingleton<IPasswordResetStore, PasswordResetStore>();
builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.Configure<OpenAiOptions>(builder.Configuration.GetSection("OpenAI"));

builder.Services.AddHttpClient("openai", (sp, client) =>
{
    var options = sp.GetRequiredService<IOptions<OpenAiOptions>>().Value;
    client.BaseAddress = new Uri("https://api.openai.com/");
    client.DefaultRequestHeaders.Authorization =
        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", options.ApiKey);
});
builder.Services.AddScoped<IAiService, AiService>();

builder.Services.AddHttpClient("piston", client =>
{
    client.BaseAddress = new Uri(
        builder.Configuration["Piston:BaseUrl"] ?? "http://localhost:2000/");
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddScoped<ICodeService, CodeService>();
builder.Services.AddHostedService<PistonWarmupService>();
builder.Services.AddHostedService<AttemptTimeoutWorker>();


builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend",
        policy =>
        {
            policy.WithOrigins("https://localhost:5173")
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});

var app = builder.Build();

// Exception handling middleware — must be first so it wraps all subsequent middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseCors("frontend");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

// ProgrammingLanguage has two PG values that can't be derived from PascalCase: "c#" and "c++"
sealed class PgProgrammingLanguageTranslator : INpgsqlNameTranslator
{
    private static readonly NpgsqlSnakeCaseNameTranslator _snake = new();
    public string TranslateTypeName(string clrName) => "programming_language";
    public string TranslateMemberName(string clrName) => clrName switch
    {
        "CSharp" => "c#",
        "Cpp" => "c++",
        _ => _snake.TranslateMemberName(clrName)
    };
}
