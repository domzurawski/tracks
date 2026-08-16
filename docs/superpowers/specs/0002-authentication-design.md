# Authentication — Design

## Goal

Add a first-party auth system (no third-party auth library): signup, login,
logout, and persistent sessions across visits. Users get a `role` column
(`USER` | `ADMIN`), defaulting to `USER`; admin roles are set directly in the
database for now. No RBAC enforcement beyond the column existing yet, and no
garage feature yet — those come later. As a proof that protection works
end-to-end, this also adds a new, empty `/my-garage` route gated behind
login.

## Non-goals (explicitly out of scope for this pass)

- RBAC enforcement (route/action-level checks by role) beyond the `role`
  column existing on `User`.
- Password reset / email verification.
- Rate limiting on login attempts.
- "Log out all devices" / session management UI.

## Architecture & placement

Following the layer rules in `AGENTS.md` (`app → views/layout → features →
shared`, features never import each other):

- **`features/auth`** (new) — owns everything domain-specific:
  - `model/types.ts` — `Role`, `User` DTO shape.
  - `model/schema.ts` — Zod schemas (`loginSchema`, `signupSchema`), shared
    by client-side validation and server-side re-validation.
  - `model/actions.ts` (`"use server"`) — `signup`, `login`, `logout`.
  - `model/session.ts` — session creation/verification (the DAL):
    `createSession`, `getCurrentUser` (React `cache()`-wrapped).
  - `ui/auth-form.tsx` (`"use client"`) — shared signup/login form.
  - `index.ts` — public API: `getCurrentUser`, `logout`, `AuthForm`, `Role`.
- **`shared/lib/prisma.ts`** (new) — singleton `PrismaClient`. Domain-agnostic
  infra, same tier as any other `shared/lib` helper.
- **`prisma/schema.prisma`** (new) — repo root, Prisma's standard convention
  (like `next.config.ts`, not part of `src/`).
- **`src/shared/session/mock-session.ts`** — deleted. `site-nav` (layout) and
  `home-view` (views) currently import the `isLoggedIn` stub from it; both
  switch to importing `getCurrentUser()` from `features/auth` instead, which
  is a permitted import direction (`views`/`layout` → `features`).
- **`views/auth`** (new) — `auth-view.tsx`: page chrome (heading, the
  login/signup toggle link) wrapping `AuthForm`.
- **`views/my-garage`** (new) — `my-garage-view.tsx`: trivial placeholder
  page, personalized with the logged-in user's name.

## Data model

```prisma
enum Role {
  USER
  ADMIN
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String
  role         Role      @default(USER)
  createdAt    DateTime  @default(now())
  sessions     Session[]
}

model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

`User.sessions` is required Prisma syntax (both sides of a relation must be
declared explicitly), not something the app queries directly in this pass.

Database: **Prisma Postgres** (hosted), provisioned via `npx prisma init
--db`, which writes `DATABASE_URL` into `.env` (already gitignored). No
Docker, no local Postgres install.

## Auth flow & session mechanics

**Password hashing:** `bcryptjs` (pure JS, no native build step), cost
factor 12.

**Signup** (`features/auth/model/actions.ts`):

1. Re-validate input against `signupSchema` (defense in depth — client
   validation via RHF/Zod is UX only, never a trust boundary).
2. Check email isn't already taken → return a field error (`email`) if so.
3. Hash the password.
4. `prisma.user.create()` — `role` always defaults to `USER`; never accepted
   from the client.
5. Create a session, redirect to `/`.

**Login**:

1. Re-validate input against `loginSchema`.
2. Look up user by email, compare password with `bcrypt.compare`.
3. "No such user" and "wrong password" return the same generic root error
   ("Invalid email or password") — don't leak which one failed.
4. Create a session, redirect to `/`.

**Session creation** (`features/auth/model/session.ts`):

1. `token = crypto.randomBytes(32).toString("base64url")`.
2. Store `sha256(token)` as `tokenHash`, plus `userId` and `expiresAt` (now +
   30 days), in the `Session` table.
3. Set the raw `token` as the cookie value: httpOnly, secure, `sameSite:
"lax"`, `maxAge` 30 days, `path: "/"`.

Only the hash is ever persisted — a DB leak alone can't be used to hijack a
session, same principle as password hashing.

**Session verification** (`getCurrentUser`, wrapped in React's `cache()`):

1. Read the cookie token.
2. Hash it, look up the `Session` row joined to `User`.
3. If missing or `expiresAt < now`, return `null`.
4. Otherwise return a DTO — `{ id, name, email, role }` — never the password
   hash.

Fixed 30-day expiry, no rolling/sliding renewal in this pass — a persistent
cookie already satisfies "stay logged in across visits"; rolling renewal is
an easy addition later if session activity should extend the expiry.

**Logout**: delete the `Session` row by token hash, clear the cookie,
redirect to `/`.

**Route protection:** no `proxy.ts` — with only one protected route
(`/my-garage`), a DAL check directly in the page component is simpler and is
the pattern Next.js itself recommends for a small number of protected pages.
Proxy-based centralized protection is worth revisiting once there are enough
protected routes that repeating the check everywhere gets noisy.

## UI, routes, and forms

**Routes:**

- `app/login/page.tsx` — `metadata: { title: "Log in" }`. Guard: if
  `getCurrentUser()` returns a user, `redirect("/")`. Renders `<AuthView
mode="login" />`.
- `app/signup/page.tsx` — same shape, `{ title: "Sign up" }`,
  `mode="signup"`.
- `app/my-garage/page.tsx` — guard: if `getCurrentUser()` returns `null`,
  `redirect("/login")`. Renders `<MyGarageView user={user} />`.

**Forms — React Hook Form + Zod:**

- `AuthForm` (`"use client"`) takes `mode: "login" | "signup"`, uses
  `useForm({ resolver: zodResolver(schema) })` where `schema` is
  `loginSchema` or `signupSchema` depending on mode. Signup renders an extra
  `name` field; both render `email`/`password`.
- On submit, the form calls the matching server action **directly as an
  async function** with the validated, typed data (not via `<form
action>`/`useActionState`) — RHF's `formState.isSubmitting` covers the
  pending state.
- Server actions take typed input (`LoginInput` / `SignupInput`), not
  `FormData`, and return `{ fieldErrors?: { email?: string; password?:
string }; rootError?: string } | void` (void = success, already
  redirected). The form applies these with `setError("email", { message })`
  / `setError("root", { message })`.

**Wiring up existing stubs** (`site-nav.tsx` and `home-view.tsx` already
have `isLoggedIn`-gated UI wired for this — small, surgical changes):

- `site-nav.tsx`: becomes `async`; `const user = await getCurrentUser()`
  replaces the `isLoggedIn` import; the "My Garage" link's `href` changes
  from `/garage` to `/my-garage`; the static "Log out" button becomes a
  `<form action={logout}>` (the only interactive piece — everything else in
  the nav stays a Server Component).
- `home-view.tsx`: `isLoggedIn` → `Boolean(await getCurrentUser())`.

## Error handling

- Field-level errors (invalid email format, password too short, email
  already taken) surface inline via RHF `setError`.
- Whole-form errors (wrong credentials) surface as a root-level message
  above the submit button.
- No thrown exceptions should reach the user; actions always return a typed
  result or redirect.

## Testing

Automated E2E tests via **Playwright** — no separate unit-testing framework
for this pass. Next.js's own testing guide recommends E2E over unit testing
for `async` Server Components specifically because tooling support for
testing them in isolation is still immature; this feature is almost
entirely `async` Server Components (the page guards, `site-nav`) plus Server
Actions, so driving it through a real browser is a better fit than mocking
Prisma/`cookies()` for isolated unit tests — and it's a closer match to the
manual checklist this replaces, which was already flow-shaped.

**Setup:**

- `tests/auth.spec.ts` — repo root, Playwright's own convention (sibling to
  `src/`, same tier as `prisma/`).
- `playwright.config.ts` — repo root, `webServer` set to start the app
  (`pnpm dev` locally; `pnpm build && pnpm start` in CI) so Playwright
  manages the server itself.
- A separate **test database** — its own `TEST_DATABASE_URL` (a second
  Prisma Postgres instance), so tests never touch dev data. A `beforeEach`
  truncates `User`/`Session` for a clean slate per test.

**Cases:**

- Signup creates a `User` + `Session` row and redirects to `/`.
- Signup with a taken email shows a field error, creates nothing.
- Login with a wrong password shows the generic root error.
- `/my-garage` redirects to `/login` when logged out, and renders
  (personalized) when logged in.
- Logout deletes the `Session` row, clears the cookie, and `/my-garage`
  redirects again afterward.
- `/login` and `/signup` redirect to `/` when already logged in.

## New dependencies

- `prisma`, `@prisma/client` — ORM + Postgres access.
- `bcryptjs` — password hashing.
- `zod` — schema validation (client + server).
- `react-hook-form`, `@hookform/resolvers` — client-side form state +
  Zod integration.
- `@playwright/test` (dev) — E2E testing.

## New environment variables

- `DATABASE_URL` — written automatically by `npx prisma init --db`.
- `TEST_DATABASE_URL` — a second Prisma Postgres database used only by the
  Playwright suite, kept separate from dev data.
