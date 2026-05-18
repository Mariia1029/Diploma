# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start Vite dev server at http://localhost:5173
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npx tsc --noEmit   # type-check without building (use this to verify changes)
```

No test runner is configured yet.

## TypeScript constraints

`tsconfig.app.json` enables `erasableSyntaxOnly: true` — **constructor parameter properties (`public`/`private`/`readonly` shorthand) are forbidden**. Declare class fields explicitly and assign them in the constructor body instead.

`verbatimModuleSyntax: true` is also on — always use `import type` for type-only imports.

## Architecture

### Auth flow

`App.tsx` wraps everything in `<AuthProvider>`. A nested `<AppRouter>` reads `{ user, isLoading }` from `useAuth()` and renders either `<AuthPage>` (unauthenticated) or `<DashboardPage>` (authenticated). There is no router library — page switching is state-driven.

`AuthContext` (`src/context/AuthContext.tsx`) owns the entire auth lifecycle:
- On mount it reads `sc_access_token` from `localStorage`, base64-decodes the JWT payload, and checks `exp` to decide whether to restore the session.
- `login()` calls the API, then saves `sc_access_token`, `sc_refresh_token`, and `sc_user` (serialised `UserResponse`) to `localStorage`.
- `logout()` clears all three keys and resets state.
- `isLoading` is `true` only during the initial mount check — `AppRouter` renders nothing while it is `true` to avoid a flash.

### API layer

All fetch calls live in `src/api/`. The shared `ApiError` class (defined in `usersApi.ts`, re-exported from `AuthContext`) carries `status: number` and `errors: Record<string, string[]>` — the same shape as ASP.NET Core `ValidationProblemDetails.errors`. Callers catch `ApiError` and map field keys (e.g. `'Email'`, `'Password'`) to UI error strings.

The backend base URL is hardcoded in `usersApi.ts` (`http://localhost:5146/api`). `authApi.ts` duplicates this constant — keep them in sync if the port changes.

### CSS strategy

All CSS custom properties (`--bg`, `--accent`, `--text-muted`, etc.) are declared once in `src/styles/variables.css`, which also sets the base `html/body/#root` styles and the Google Fonts import. Every page-level CSS file (`auth.css`, `dashboard.css`) starts with `@import './variables.css'`. Plain CSS classes are used — no CSS modules, no Tailwind.

### Page & component layout

```
src/
  api/          authApi.ts, usersApi.ts
  context/      AuthContext.tsx
  types/        auth.ts, user.ts
  styles/       variables.css, auth.css, dashboard.css
  pages/        AuthPage.tsx, DashboardPage.tsx
  components/
    auth/       Logo, CodeEditor, FeatureList, LeftPanel, FormField, AuthTabs, LoginForm, RegisterForm
    dashboard/  Sidebar, Topbar, WelcomeRow, ActionCard, FolderCard, DashboardContent
```

`DashboardPage` holds `activePage` state and passes it down to `Sidebar` (navigation) and `Topbar` (title). Real user data (`firstName`, `lastName`) comes from `useAuth().user`. The dashboard content itself (`DashboardContent`) currently renders static placeholder data — no API calls yet.
