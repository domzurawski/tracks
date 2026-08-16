# Garage CRUD — Design

## Goal

Replace the "Coming soon" placeholder at `/my-garage` with real garage
management: a logged-in user can see their cars, add one, edit one, and
remove one. The homepage `GarageBar`'s car count switches from mocked to
real data; `personalBest`/`rank` stay mocked (they depend on lap
times/leaderboards, which are out of scope here).

## Non-goals (explicitly out of scope for this pass)

- Editing a car's owner / transferring ownership.
- Multi-photo galleries (single `photoUrl` field only).
- Reordering or favoriting cars.
- Any leaderboard/lap-time tie-in — `personalBest`/`personalBestTrack`/`rank`
  on `GarageBar` stay sourced from `mockGarage`.
- Optimistic UI — the dialog closes and the list updates only after the
  server round-trip resolves.

## Architecture & placement

Following the layer rules in `AGENTS.md` (`app → views/layout → features →
shared`, features never import each other):

**Auth refactor (prerequisite):** `features/garage`'s server actions need to
verify who's making the request — the Next.js server-actions security
guidance is explicit that every Server Function must independently verify
auth, since it's reachable via direct POST regardless of client UI. A
client-supplied user id can't be trusted for this. Today `getCurrentUser`
lives inside `features/auth`, and feature-to-feature imports are banned, so
`features/garage` can't reach it there. This is the "revisit the
architecture" case `AGENTS.md` calls out directly:

- **`shared/lib/session.ts`** (new, moved from
  `features/auth/model/session.ts`) — owns `getCurrentUser()` (React
  `cache()`-wrapped), plus the `AuthUser`/`Role` types and the cookie/hash
  helpers it needs.
- **`features/auth/model/session.ts`** — keeps `createSession`/
  `deleteSession` (login/signup/logout-only concerns) and re-exports
  `getCurrentUser`/`AuthUser`/`Role` from `shared/lib/session`, so
  `features/auth/index.ts`'s public API is unchanged and every existing call
  site (`site-nav`, `home-view`, `my-garage/page.tsx`) needs no edits.

**`features/garage`** (existing, expands):

- `model/types.ts` — add a `Car` DTO type alongside the existing `Garage`
  summary type.
- `model/schema.ts` (new) — `carSchema` (Zod), shared by the form
  (client-side UX validation) and the server actions (defense in depth).
- `model/cars.ts` (new, DAL) — `getCars(ownerId)`, `getCarCount(ownerId)`.
- `model/actions.ts` (new, `"use server"`) — `createCar`, `updateCar`,
  `deleteCar`. Each calls `getCurrentUser()` from `shared/lib/session`
  directly.
- `ui/car-list.tsx`, `ui/car-card.tsx` (new, Server Components).
- `ui/car-form-dialog.tsx` (new, `"use client"`) — add/edit modal.
- `ui/delete-car-button.tsx` (new, `"use client"`) — delete trigger +
  confirmation dialog.
- `ui/garage-bar.tsx` (existing, becomes `async`, takes a `userId` prop,
  uses a real car count from `getCarCount`).
- `index.ts` — public API grows to include `Car`, the actions, `CarList`,
  `CarFormDialog`.

**`shared/ui/dialog`** (new) — a small `"use client"` wrapper around the
native `<dialog>` element. No new dependency — native `<dialog>` gives focus
trapping, Esc-to-close, and backdrop click for free. Used by both the
add/edit form and the delete confirmation.

**`views/my-garage`** — `my-garage-view.tsx` replaces its placeholder with
the real car list and an "Add car" trigger.

**`views/home`** — `home-view.tsx` passes `user.id` into
`<GarageBar userId={user.id} />` instead of rendering it prop-less.

## Data model

```prisma
enum Drivetrain {
  FWD
  RWD
  AWD
}

enum Transmission {
  MANUAL
  AUTOMATIC
}

model Car {
  id           String       @id @default(cuid())
  make         String
  model        String
  year         Int
  horsepower   Int
  drivetrain   Drivetrain
  transmission Transmission
  nickname     String?
  photoUrl     String?
  notes        String?
  ownerId      String
  owner        User         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt    DateTime     @default(now())
}
```

`User` gains a `cars Car[]` relation field (required Prisma syntax, same as
`sessions` today).

Required: `make`, `model`, `year`, `horsepower`, `drivetrain`,
`transmission` — a car's full identity and spec. Optional: `nickname`,
`photoUrl`, `notes` — enrichment.

`photoUrl` is a plain string field (a link to an already-hosted image), not
a file upload — no new storage infra needed for this pass.

## Data flow & authorization

- **`createCar(input: CarInput)`** — re-validate `input` against
  `carSchema`. Call `getCurrentUser()`; if `null`, return a root error (the
  page itself is guarded, but the action must not trust the client
  regardless). `prisma.car.create({ data: { ...input, ownerId: user.id } })`
  — `ownerId` always comes from the session, never accepted from the
  client. `revalidatePath("/my-garage")` and `revalidatePath("/")` (for
  `GarageBar`'s count on the homepage).
- **`updateCar(id: string, input: CarInput)`** — re-validate, then
  `prisma.car.updateMany({ where: { id, ownerId: user.id }, data: input })`.
  If the resulting count is `0`, return a generic root error ("Car not
  found") — covers both "doesn't exist" and "not yours" without leaking
  which, same spirit as the login flow's generic credentials error. Revalidate
  both paths.
- **`deleteCar(id: string)`** —
  `prisma.car.deleteMany({ where: { id, ownerId: user.id } })`, same
  zero-count handling, revalidate both paths.
- Return shape mirrors the auth actions:
  `{ fieldErrors?: {...}; rootError?: string } | void` for create/update;
  delete returns `{ rootError?: string } | void` (no fields to attach
  errors to).

## UI, routes, and forms

No new routes — everything happens on the existing `/my-garage` page via a
modal.

- **`shared/ui/dialog/dialog.tsx`** (`"use client"`) — controlled API:
  `<Dialog open={boolean} onOpenChange={(open) => void}>{children}</Dialog>`.
  Syncs `open` to the native `<dialog>` via `showModal()`/`close()` in a
  `useEffect`, and listens for the native `close` event (fired on Esc or
  backdrop click) to call `onOpenChange(false)`.
- **`CarFormDialog`** (`"use client"`) — `mode: "create" | "edit"` (+ `car`
  when editing), owns its own `isOpen` state, renders a trigger button ("Add
  car" / "Edit") and a `<Dialog>` wrapping `CarForm`. Same React Hook Form +
  `zodResolver(carSchema)` pattern as `AuthForm`: on submit, calls
  `createCar`/`updateCar` directly as an async function; on success (no
  errors returned) closes the dialog and resets the form. Fields: make,
  model, year, horsepower, drivetrain, transmission, then nickname, photo
  URL, notes grouped visually as "optional details."
- **`CarList`** (Server Component) — receives `cars: Car[]` as a prop from
  `MyGarageView`, maps to `CarCard`s; renders an empty state ("No cars yet —
  add your first one") when empty.
- **`CarCard`** (Server Component) — heading is the nickname (bold) if set,
  else `"{year} {make} {model}"`, with the other line shown as a subheading
  when a nickname is set; photo via `next/image` when `photoUrl` is set,
  else the same `Car` icon placeholder `GarageBar` already uses;
  horsepower/drivetrain/transmission shown as small `Tag`s; notes as plain
  text below. Embeds a `CarFormDialog mode="edit"` and a `DeleteCarButton`
  as its only interactive leaves.
- **`DeleteCarButton`** (`"use client"`) — click opens a `Dialog` with a
  confirm/cancel pair; confirm calls `deleteCar(id)`.
- **`GarageBar`** — becomes `async ({ userId }: { userId: string })`, calls
  `getCarCount(userId)` for the real count; `personalBest`/
  `personalBestTrack`/`rank` stay from `mockGarage`.
- **`MyGarageView`** — `async ({ user })`, calls `getCars(user.id)`, renders
  heading, a `CarFormDialog mode="create"` trigger, and
  `<CarList cars={cars} />`.

## Error handling

- Field-level errors (invalid year range, missing required select,
  malformed photo URL) surface inline via RHF `setError`, same as
  `AuthForm`.
- The "not found / not yours" case on update/delete surfaces as a
  root-level error in the dialog (update) or as inline text in the confirm
  dialog (delete).
- No thrown exceptions reach the user; actions always return a typed
  result.

## Testing

Same approach as auth — Playwright E2E, extending the existing suite
(`tests/garage.spec.ts`), reusing the test DB truncation pattern (`Car`
added to the `beforeEach` truncate list, plus a login helper to get an
authenticated session before each case):

- Add a car → appears in the list on `/my-garage` with the entered fields.
- Add a car → homepage `GarageBar` count reflects it.
- Edit a car → list shows the updated fields.
- Delete a car → confirm step required; canceling leaves it, confirming
  removes it from the list.
- Submitting the add form with missing required fields shows field errors
  and creates nothing.

## New dependencies

None — the dialog is built on the native `<dialog>` element.

## New environment variables

None — the `Car` table is added via a Prisma migration against the
existing `DATABASE_URL`/`TEST_DATABASE_URL`.
