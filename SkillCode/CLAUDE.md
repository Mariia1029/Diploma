# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SkillCode is an ASP.NET Core Web API for an interactive learning trainer platform — users create programming-related tasks (9 task types: SingleChoice, MultiChoice, Matching, Ordering, FillBlank, TrueFalse, Open, FlashCards, CardMatch) manually or via OpenAI GPT-4, share them privately or publicly, attempt them, and review results. It is a Bachelor's Qualification Work; the React + TypeScript SPA frontend is a separate codebase. Single-project backend solution (`SkillCode.sln` → `SkillCode/SkillCode.csproj`); database is PostgreSQL via Npgsql + EF Core.

The repo is in early scaffolding: data layer (`Models/`, `Enums/`, `DTOs/`, `Data/AppDbContext.cs`) is implemented. The first vertical slice (user creation) is done: `Controllers/UsersController.cs`, `Services/UserService.cs`, `Repositories/UserRepository.cs`, `Interfaces/`, `Mapping/UserProfile.cs`, `Exceptions/`, and `Middleware/` are now populated. Remaining resource controllers are still to be added.

**Authoritative spec:** `project_info.md` at the repo root contains the full requirements doc (REQ/NFR list, business rules, algorithms, UI pages, architecture diagrams). Treat it as the source of truth for behavior and consult it before designing new features. Key items below are summarized from it for quick reference.

## Common commands

Run from the repo root (`D:\Diploma\Project\SkillCode`) unless noted.

- Build: `dotnet build SkillCode.sln`
- Run API (dev): `dotnet run --project SkillCode` — launches on `http://localhost:5146` / `https://localhost:7047` with Swagger UI at `/swagger` (Development env only).
- Restore packages: `dotnet restore`
- EF Core migrations (run inside `SkillCode/`):
  - Add: `dotnet ef migrations add <Name>`
  - Apply: `dotnet ef database update`
  - The connection string lives in `SkillCode/appsettings.json` → `ConnectionStrings:DefaultConnection` (defaults to local Postgres `SkillCodeDB` on `127.0.0.1:5432`, user `postgres`).
- Tests: no test project exists yet.

## Architecture

### Domain (entities in `SkillCode/Models/`)

- **User** — auth + profile; soft-delete via `IsDeleted`/`DeletedAt`, lockout via `IsBlocked`/`BlockedUntil`/`FailedLoginCount`. `RefreshToken` stores hashed refresh tokens for JWT auth (auth pipeline not yet wired in `Program.cs`).
- **Template / TemplateItem** — reusable task blueprints. `TemplateItem.Content` is `jsonb`. Templates can be system-wide (`IsSystem`) or public (`IsPublic`).
- **Task / TaskItem** — concrete tasks instantiated from a template (nullable `TemplateId`, `SetNull` on delete). `TaskItem.Options` and `TaskItem.CorrectAnswer` are `jsonb`. `Task.Status` is `private`/`public`; `Task.Language` is a `ProgrammingLanguage` enum.
- **Attempt / AttemptAnswer** — a user run of a task. `Attempt.ContextType` (`AttemptType`) records where the attempt came from (personal/public/saved/shared/group) and `ContextId` points at that source. `AttemptAnswer.UserAnswer` is `jsonb`.
- **Group / GroupMember / GroupTask** — groups own users (`GroupRole` owner/admin/member) and have tasks shared into them. `GroupTask.SharedByUserId` is `SetNull` on user delete.
- **TaskShare** — direct user-to-user task sharing; sender/receiver `SetNull` on delete, unique on `(TaskId, SenderId, ReceiverId)`.
- **SavedTask** — a user bookmarking a public task; unique on `(UserId, TaskId)`.

### Data layer conventions (`SkillCode/Data/AppDbContext.cs`)

This file is the single source of truth for schema mapping; read it before touching any model.

- All Postgres enums are declared via `HasPostgresEnum(...)` at the top of `OnModelCreating`. When adding a new enum value, update both the C# enum in `Enums/` AND the `HasPostgresEnum` array, then add a migration.
- Enum ↔ string conversion uses `.HasConversion(v => v.ToString().ToLower(), v => Enum.Parse<T>(v, true))`. Special cases (non-identifier names like `c#`, `c++`, `java_script`, `type_script`, `in_progress`) are mapped explicitly — see the `ProgrammingLanguage` and `AttemptStatus` converters as the pattern to copy.
- Tables and columns are `snake_case`; entities and properties are `PascalCase`. Every entity uses explicit `.ToTable("...")` and `.HasColumnName("...")` — keep doing this for new properties.
- IDs are `Guid` with PG-side default `gen_random_uuid()`. Timestamps default to `now()` at the DB.
- The class is `partial` with `partial void OnModelCreatingPartial(ModelBuilder)` — extend mapping in another partial file rather than editing the giant `OnModelCreating` if practical.
- Note the `using Task = SkillCode.Models.Task;` and `using TaskStatus = System.Threading.Tasks.TaskStatus;` aliases at the top — `Task` collides with `System.Threading.Tasks.Task`, so any file referencing the entity needs the same alias.

### DTOs (`SkillCode/DTOs/`)

Grouped per area (`AuthDtos.cs`, `TaskDtos.cs`, `GroupDtos.cs`, etc.). Add new DTOs to the matching file rather than creating one-DTO-per-file.

### App pipeline (`SkillCode/Program.cs`)

Currently registers: controllers, Swagger, EF Core/Npgsql, AutoMapper (`AddAutoMapper(typeof(Program).Assembly)`), `IUserRepository`/`IUserService` (both `Scoped`), and `ExceptionHandlingMiddleware` (registered first, before Swagger/HTTPS, so it wraps the whole pipeline). Authentication, authorization policies, and CORS are not yet registered — wire them here when adding those layers.

### Conventions

Established by the first vertical slice; follow this pattern for every subsequent controller/service/repo:

- **Layering:** Controller (thin — REST verbs, return action results, no business logic) → Service (business rules, throws domain exceptions from `Exceptions/`) → Repository (EF Core queries only, depends on `AppDbContext`) → `AppDbContext`.
- **Validation:** Data annotations on request DTOs; `[ApiController]` returns `400 ValidationProblemDetails` automatically before service code runs. Error messages on annotations must be in Ukrainian.
- **Exception mapping:** Domain exceptions live in `SkillCode/Exceptions/` and are mapped to HTTP status codes in `SkillCode/Middleware/ExceptionHandlingMiddleware.cs`. Add new exception → status-code mappings there; do not catch domain exceptions in controllers.
- **Async:** All repository and service methods are `async` and accept `CancellationToken ct` as the last parameter.
- **Folder homes:** `Exceptions/` for domain exception types, `Middleware/` for ASP.NET Core middleware classes.

## Patterns & planned dependencies

The spec mandates specific patterns and libraries — use them when scaffolding the corresponding layer rather than inventing alternatives:

- **Repository pattern** in `Repositories/` (data access) — services depend on interfaces in `Interfaces/`, not on `AppDbContext` directly.
- **Strategy pattern** for answer checking — one strategy class per `TaskType` enum value; `OpenAnswerStrategy` delegates to OpenAI. Partial scoring formula for MultiChoice/Matching: `MaxPoints × (CorrectCount / TotalCorrectCount)`.
- **DTO pattern + AutoMapper** — entities never leave the controller layer; mapping profiles live in `Mapping/`.
- **DI** via constructor injection (default ASP.NET Core).
- **BCrypt.Net-Next 4.0.3** — in use; `BCrypt.Net.BCrypt.HashPassword` / `VerifyHashPassword` called in `UserService` for password hashing (NFR-2.4.3). Never store or log plain-text passwords.
- **AutoMapper 13.0.1** — in use; mapping profiles live in `Mapping/`. Current profile: `UserProfile` (`RegisterUserRequest→User`, `User→UserResponse`). Note: package has a known high-severity advisory (NU1903) — acceptable for this academic project, but evaluate upgrading or switching before production.
- Planned NuGet additions (not yet added): `Serilog` (file-based logging), JWT bearer auth packages, `System.Net.Http` for OpenAI calls.

## Hard requirements to preserve

These come from the NFR section of `project_info.md` and must hold in any auth/security/perf-related code:

- Passwords: BCrypt hashes; min 8 chars, ≥1 uppercase, ≥1 digit.
- JWT: access + refresh tokens, 60-minute access TTL; tokens invalidated on logout (use `RefreshTokens.RevokedAt`).
- Account lockout: 15 minutes after 5 consecutive failed logins (`User.FailedLoginCount`, `User.BlockedUntil`).
- Soft-delete users (`IsDeleted`) preserves their content; only admins can hard-delete (cascading). Group ownership transfer is required before deleting a group owner (`RESTRICT` FK).
- Answer checking is **server-side only**. The OpenAI API key is **never** sent to the client.
- Score columns are `numeric(5,2)`; task content/answers are `jsonb`.
- UI language is Ukrainian — error/response messages exposed to end users should be Ukrainian; keep code identifiers and logs in English.

## Notes

- Target framework is `net9.0`; EF Core packages are pinned at `8.0.10`. The spec calls for ASP.NET Core 8 — the project is on 9 in practice. Don't bump EF to 9 without checking Npgsql provider compatibility.
- `Nullable` and `ImplicitUsings` are enabled — annotate reference types accordingly.
- `appsettings.json` is checked in with a local-dev Postgres password; treat it as a dev placeholder, not production config. The OpenAI API key, when added, must come from configuration/secrets — never hard-coded.
