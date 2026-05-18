# SkillCode — Interactive Learning Trainer Web Platform

## Project Overview

**SkillCode** is a web platform for creating interactive learning trainers and test tasks for studying programming languages, with AI support. The platform allows users to create tasks manually or via OpenAI GPT-4, share them with others, complete them, and analyze results.

This is a Bachelor's Qualification Work (BQW).

---

## Tech Stack

### Backend
- **ASP.NET Core 8.0** — main server-side framework
- **C#** — development language (strong typing)
- **Entity Framework Core 8.0** — ORM (LINQ queries, migrations)
- **PostgreSQL 18+** — relational DBMS
- **Npgsql** — EF Core provider for PostgreSQL
- **JWT (JSON Web Token)** — authentication (access + refresh tokens, TTL 60 min)
- **BCrypt.NET-Next** — password hashing
- **AutoMapper** — mapping between Entities and DTOs
- **Serilog** — file-based logging
- **System.Net.Http** — HTTP client for OpenAI API requests
- **OpenAI GPT-4** — AI content generation and open-answer grading

### Frontend
- **React** — UI library (SPA, Single Page Application)
- **TypeScript** — static typing
- **Axios** — HTTP client for API requests
- **React Hooks** — session state management

### Protocols & Communication
- **REST API** — client-server interaction
- **HTTPS** — secure data transfer
- **SMTP** — email notifications
- **JSON** — data exchange format

---

## Architecture

### Overview

Client-server architecture with two independent parts:

```
[React SPA (TypeScript)] <--HTTPS/REST API--> [ASP.NET Core] <--> [PostgreSQL]
                                                      |
                                               [OpenAI API]
```

### Backend — Layered Structure

```
Controllers  (receive requests, return responses)
    ↓
Services     (business logic)
    ↓
Repositories (data access via EF Core)
    ↓
PostgreSQL
```

### Frontend — Structure

- **Pages** — application pages
- **Components** — UI components within pages
- **Services** — HTTP request layer (Axios)
- **State (React Hooks)** — current page state during session

---

## Design Patterns

| Pattern | Usage |
|---------|-------|
| **Repository Pattern** | Separates business logic from data access. Changing the DBMS only requires updating the repository implementation |
| **Dependency Injection** | Core principle of ASP.NET Core. Dependencies are passed via constructor |
| **DTO Pattern** | Transfers only required fields between server and client. AutoMapper automates the conversion |
| **Strategy Pattern** | Answer checking — each task type has its own strategy class with its own algorithm |

---

## Task Types

The platform supports 9 task types:

1. **SingleChoice** — single correct answer test
2. **MultiChoice** — multiple correct answers test
3. **Matching** — match pairs
4. **Ordering** — establish correct sequence
5. **FillBlank** — fill in the blanks
6. **TrueFalse** — true or false flash card
7. **Open** — open-ended answer (graded by OpenAI)
8. **FlashCards** — study flash cards
9. **CardMatch** — match card pairs

---

## Key Algorithms

### 1. Strategy Pattern — Answer Checking

Shared JSON structure for all task types:
```json
{
  "question": "string",
  "options": null,
  "correct_answer": "jsonb",
  "multi_answer": false,
  "explanation": null
}
```

Strategy per task type:

| Strategy | Algorithm |
|----------|-----------|
| `SingleChoiceStrategy` | Compare single selected answer |
| `MultiChoiceStrategy` | Compare set of correct answers |
| `MatchingStrategy` | Compare array of key-value pairs |
| `OrderingStrategy` | Compare element order in array |
| `FillBlankStrategy` | Compare strings |
| `TrueFalseStrategy` | Compare boolean value |
| `OpenAnswerStrategy` | Delegate grading to OpenAI |
| `FlashCardsStrategy` | Record user self-assessment |
| `CardMatchStrategy` | Compare matched card pairs |

Partial scoring (MultiChoice, Matching):
```
Result = MaxPoints × (CorrectCount / TotalCorrectCount)
```

### 2. Attempt Score Calculation

```
Result% = (CurrentPoints / MaxPoints) × 100
```

### 3. OpenAI Prompt Construction

1. Extract `content` field from each template item (question structure definition)
2. Build a user prompt with topic, programming language, and expected JSON response schema
3. Send request to OpenAI API
4. Deserialize response from JSON into a `TaskItem` collection
5. Show result to user for review before saving

For open-answer grading: the question, user's answer, and max score are sent to OpenAI — the model returns a score and explanation.

### 4. Fisher-Yates Shuffle (Flash Cards)

```
for i from n-1 down to 1:
    j = random integer in [0, i]
    swap(array[i], array[j])
```

- Time complexity: **O(n)**, Space complexity: **O(1)**
- Shuffled index order is stored in the `Attempts` table to restore unfinished attempts in the same order

### 5. Pagination

```
Skip = (PageNumber - 1) × PageSize
TotalPages = ceil(TotalCount / PageSize)
```

EF Core: `.Skip(skip).Take(pageSize)`. `TotalCount` is returned alongside data for client-side navigation rendering.

---

## Database (PostgreSQL 18)

### Tables (13 total)

| Table | Purpose |
|-------|---------|
| `Users` | Registered platform users |
| `RefreshTokens` | Refresh tokens for session renewal |
| `Templates` | Task structure templates (system and user-defined) |
| `TemplateItems` | Individual question type structure (JSON) |
| `Tasks` | Task sets (private / public) |
| `TaskItems` | Individual tasks within a set |
| `SavedTasks` | Tasks saved by users from public feed |
| `TaskShares` | Tasks shared directly between users |
| `Groups` | User groups |
| `GroupMembers` | Group participants |
| `GroupTasks` | Tasks shared within groups |
| `Attempts` | Task completion attempts |
| `AttemptAnswers` | Per-question answers within an attempt |

Junction tables: `SavedTasks`, `TaskShares`, `GroupMembers`, `GroupTasks`.

### ENUM Types

| ENUM | Values |
|------|--------|
| `UserRole` | `User`, `Admin` |
| `TaskType` | `SingleChoice`, `MultiChoice`, `Matching`, `Ordering`, `FillBlank`, `TrueFalse`, `Open`, `FlashCards`, `CardMatch` |
| `TaskStatus` | `Private`, `Public` |
| `ProgrammingLanguage` | `Python`, `Java`, `C#`, `C++`, `C`, `JavaScript`, `TypeScript`, `Go`, `Rust` |
| `TypeAttempts` | `Personal`, `Public`, `Saved`, `Shared`, `Group` |
| `GroupRole` | `Owner`, `Admin`, `Member` |
| `AttemptStatus` | `InProgress`, `Finished` |

### Schema Notes

- Score fields: `numeric(5,2)`
- Task content and answers: `jsonb`
- Soft delete for users: `IsDeleted boolean` field (preserves user content)
- Hard delete of user: cascading delete
- Task deletion: cascading delete
- Template deletion: `SET NULL`
- Group owner deletion: `RESTRICT` — ownership must be transferred before account deletion

---

## Functional Requirements (REQ)

### User Management
- `REQ-1.1` Registration via email
- `REQ-1.2` Login via email and password
- `REQ-1.3` Personal account dashboard
- `REQ-1.4` Persist user activity (content creation and task attempts)
- `REQ-1.5` Edit personal profile

### Groups
- `REQ-2.1` Create user groups
- `REQ-2.2` Share tasks within a group
- `REQ-2.3` Group members can attempt shared tasks
- `REQ-2.4` View group member results
- `REQ-2.5–2.7` Edit group settings, add/remove members

### Personal Tasks
- `REQ-3.1` Attempt tasks with per-attempt result history
- `REQ-3.2` Delete a specific attempt result

### Public Tasks
- `REQ-4.1–4.5` Browse, publish, save, attempt, and share public tasks

### Task Sharing
- `REQ-5.1–5.2` Send a task directly to another user (with or without receiving their results)

### Content Management
- `REQ-6.1` Manual task creation
- `REQ-6.2` AI-assisted task generation
- `REQ-6.3` Edit AI-generated content before publishing
- `REQ-6.4` Edit already published tasks
- `REQ-6.5` Save created tasks to user profile
- `REQ-6.6` Delete own tasks

---

## Non-Functional Requirements (NFR)

### Performance
- `NFR-1.1` Server response time ≤ 500 ms
- `NFR-1.2` AI content generation ≤ 300 s (with loading indicator in UI)
- `NFR-1.3` Interface load time ≤ 2 s at average internet speed
- `NFR-1.5` Indexed field queries ≤ 100 ms

### Security
- `NFR-2.1.1` HTTPS between client and server
- `NFR-2.1.2` Personal data visible only to the owner and admin
- `NFR-2.1.3` OpenAI API key stored server-side only, never sent to client
- `NFR-2.2.1` Permanent deletion only for own tasks
- `NFR-2.2.2` Role-based access control
- `NFR-2.3.1` System event logging via Serilog
- `NFR-2.4.1` Registration requires a unique email
- `NFR-2.4.2` Password: minimum 8 characters, at least one uppercase letter and one digit
- `NFR-2.4.3` Passwords stored as BCrypt hashes
- `NFR-2.4.4` JWT access + refresh tokens; token invalidated on logout
- `NFR-2.4.5` Account locked for 15 minutes after 5 consecutive failed login attempts

### Quality
- `NFR-3.1` Support for Chrome, Edge, Firefox
- `NFR-3.2` Graceful error handling — no crashes, user-facing error messages
- `NFR-3.3` Business logic decoupled from infrastructure (testability)
- `NFR-3.4` Intuitive interface requiring no prior training
- `NFR-3.5` Code structured according to adopted design patterns

### Other
- `ONFR-6.1` UI language: Ukrainian; encoding: UTF-8
- `ONFR-6.2` Content belongs to the user; personal data processed in accordance with Ukrainian law

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **Guest** | Browse the platform without access to features |
| **User** | Full access: create, attempt, share tasks, use AI generation |
| **Admin** | Manage users, resolve access issues |

---

## UI Pages

1. Registration & Login
2. Personal Account (profile editing)
3. Home page (user folders)
4. Public Tasks feed
5. Groups list / Group details (group editing)
6. Sent Tasks
7. Saved Tasks
8. My Tasks
9. Create Task
10. Task Attempt (task runner)
11. Results View

---

## Business Rules

- A private task is visible only to its owner; publishing requires an explicit action by the author
- Deleting an account does not delete the user's content; full deletion is admin-only; users can restore their account later
- Answer checking happens server-side
- Open-ended answers are graded by OpenAI
- A user can save the same public task only once
- The OpenAI API key is never exposed to the client

---

## Environment

- **OS:** Windows 10+
- **Browsers:** Chrome, Firefox, Edge
- **Server runtime:** .NET 8.0+
- **Database:** PostgreSQL 18+
- **External service:** OpenAI API (GPT-4)
