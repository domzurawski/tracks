# Tracks & Leaderboards CRUD — Design

## Goal

Admins can create, edit, and delete tracks, and create different leaderboards
for those tracks. Regular users can only browse. Replace the mocked
`Track`/`Leaderboard` data (`model/mock.ts` in each feature) with real,
database-backed data, and give the nav's existing `/tracks` and
`/leaderboards` links (currently 404) real public pages.

## Non-goals (explicitly out of scope for this pass)

- Leaderboard podium entries (car, driver, lap time, rank). A `Leaderboard`
  is metadata only — a title tied to a track (e.g. "Fastest overall" on
  Nürburgring). Entries depend on a lap-time submission system that doesn't
  exist yet; adding manually-typed entries now would just be more mock-like
  data with no real source, per `AGENTS.md`'s "no speculative features"
  rule.
- Any change to `/my-garage` or the `Car` model.
- Assigning admins, or any UI for managing user roles — `Role` already
  exists on `User` (`USER` | `ADMIN`) from the auth design; this spec only
  adds checks against it.

## Architecture & placement

Following `AGENTS.md`'s layer rules (`app → views/layout → features →
shared`, features never import each other):

**Cross-feature composition.** The admin "create leaderboard" form needs a
track picker, but `features/leaderboards` cannot import `features/tracks`.
Resolved the same way `home-view` already composes `garage`, `leaderboards`,
`tracks`, and `activity` without any of them knowing about each other:
composition happens in `views`. `views/admin-leaderboards` calls
`getTracks()` (from `features/tracks`) and passes the result down as a
plain `{ id: string; name: string }[]` prop into `LeaderboardFormDialog`
(from `features/leaderboards`). Neither feature imports the other.

(Promoting `Track` into `shared` was considered and rejected — `AGENTS.md`
is explicit that `shared` has "zero business/domain knowledge, ever," and a
track is domain knowledge, not a primitive like the session helpers that
were moved there for the garage CRUD.)

**`shared/lib/session.ts`** — gains `requireAdmin()`: wraps
`getCurrentUser()`, calls Next's `notFound()` if there's no user or
`role !== "ADMIN"`. Used identically by all three admin `page.tsx` files
(mirrors the existing `my-garage/page.tsx` guard, centralized since it's
needed three times here instead of once).

**`features/tracks`** (existing, expands):

- `model/types.ts` — `Track` DTO reflects the new Prisma shape (`length`,
  `elevation` become `number`, meters).
- `model/schema.ts` (new) — `trackSchema` (Zod), shared by the admin form
  and the server actions.
- `model/tracks.ts` (new, DAL) — `getTracks()`.
- `model/actions.ts` (new, `"use server"`) — `createTrack`, `updateTrack`,
  `deleteTrack`.
- `ui/track-card.tsx` (existing) — length/elevation formatting updated for
  the numeric fields; otherwise unchanged.
- `ui/tracks-section.tsx` (existing) — becomes `async`, calls `getTracks()`
  instead of importing `mockTracks`.
- `ui/admin/track-form-dialog.tsx` (new, `"use client"`) — add/edit modal.
- `ui/admin/track-admin-list.tsx`, `ui/admin/track-admin-row.tsx` (new,
  Server Components) — admin list with edit/delete controls.
- `ui/admin/delete-track-button.tsx` (new, `"use client"`) — delete trigger
  + confirmation dialog.
- `model/mock.ts` — deleted.
- `index.ts` — public API grows to include `Track`, the actions, `getTracks`,
  `TrackFormDialog`, `TrackAdminList`, `TracksSection` (already exported).

**`features/leaderboards`** (existing, expands):

- `model/types.ts` — `Leaderboard` DTO drops `podium`, gains `trackId` and
  `trackName` (joined from `Track` for display).
- `model/schema.ts` (new) — `leaderboardSchema` (Zod).
- `model/leaderboards.ts` (new, DAL) — `getLeaderboards()`, joins
  `track: { select: { name: true } }`.
- `model/actions.ts` (new, `"use server"`) — `createLeaderboard`,
  `updateLeaderboard`, `deleteLeaderboard`.
- `ui/leaderboard-card.tsx` (existing) — drops podium rendering, keeps
  title/track header; podium markup removed since there's no data for it.
- `ui/leaderboards-section.tsx` (existing) — becomes `async`, calls
  `getLeaderboards()` instead of importing `mockLeaderboards`.
- `ui/admin/leaderboard-form-dialog.tsx` (new, `"use client"`) — add/edit
  modal; takes a `tracks: { id: string; name: string }[]` prop rendered as
  a native `<select>`.
- `ui/admin/leaderboard-admin-list.tsx`, `ui/admin/leaderboard-admin-row.tsx`
  (new, Server Components).
- `ui/admin/delete-leaderboard-button.tsx` (new, `"use client"`).
- `model/mock.ts` — deleted.
- `index.ts` — public API grows to include `Leaderboard`, the actions,
  `getLeaderboards`, `LeaderboardFormDialog`, `LeaderboardAdminList`,
  `LeaderboardsSection` (already exported).

**`views/admin`** (new) — `admin-view.tsx`, a small landing page with two
links/cards: "Manage tracks", "Manage leaderboards".

**`views/admin-tracks`** (new) — `admin-tracks-view.tsx`, `async`, calls
`getTracks()`, renders heading + `TrackFormDialog mode="create"` +
`TrackAdminList`.

**`views/admin-leaderboards`** (new) — `admin-leaderboards-view.tsx`,
`async`, calls `getLeaderboards()` and `getTracks()`, renders heading +
`LeaderboardFormDialog mode="create" tracks={tracks}` +
`LeaderboardAdminList`.

**`views/tracks`** (new) — `tracks-view.tsx`, wraps `<TracksSection />` in a
`<main>` for the public `/tracks` route.

**`views/leaderboards`** (new) — `leaderboards-view.tsx`, wraps
`<LeaderboardsSection />` in a `<main>` for the public `/leaderboards`
route.

**`layout/site-nav`** — shows an "Admin" link next to "My Garage" when
`user?.role === "ADMIN"`.

## Data model

```prisma
model Track {
  id           String        @id @default(cuid())
  name         String        @unique
  country      String
  length       Int           // meters
  corners      Int
  elevation    Int           // meters
  createdAt    DateTime      @default(now())
  leaderboards Leaderboard[]
}

model Leaderboard {
  id        String   @id @default(cuid())
  title     String
  trackId   String
  track     Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([trackId, title])
}
```

- `length`/`elevation` are stored as whole meters, always — no unit
  ambiguity. UI formats them for display (see below); the admin form's
  inputs are also in meters, so no conversion happens on the write path.
- `Track.name` is unique (same defensive-uniqueness spirit as `User.email`).
- `(trackId, title)` is unique on `Leaderboard` — prevents two identically
  titled leaderboards on the same track.
- Deleting a track cascades to its leaderboards (same `onDelete: Cascade`
  pattern as `Car` → `User`).

Required on `Track`: all fields (`name`, `country`, `length`, `corners`,
`elevation`) — a track's full identity. Required on `Leaderboard`: `title`,
`trackId` — there's nothing optional about either.

## Data flow & authorization

- **`createTrack(input: TrackInput)`** — re-validate against `trackSchema`.
  Call `getCurrentUser()`; if `null` or `role !== "ADMIN"`, return
  `{ rootError: "Not authorized" }` (the page itself is guarded by
  `requireAdmin()`, but the action must not trust the client regardless —
  same reasoning as the garage actions). `prisma.track.create({ data:
  input })`. `revalidatePath("/")`, `/tracks`, `/admin/tracks`.
- **`updateTrack(id, input)`** — re-validate, re-check admin,
  `prisma.track.update({ where: { id }, data: input })`. Also revalidates
  `/leaderboards` and `/admin/leaderboards`, since a track's name is
  displayed on leaderboard cards. `P2025` (not found) maps to
  `{ rootError: "Track not found" }`.
- **`deleteTrack(id)`** — re-check admin, `prisma.track.delete({ where: {
  id } })`. Revalidates all five paths (cascade removes its leaderboards
  too). `P2025` maps to `{ rootError: "Track not found" }`.
- **`createLeaderboard(input: LeaderboardInput)`** — re-validate, re-check
  admin, `prisma.leaderboard.create({ data: input })`. `revalidatePath("/")`,
  `/leaderboards`, `/admin/leaderboards`.
- **`updateLeaderboard(id, input)`** / **`deleteLeaderboard(id)`** — same
  pattern as tracks, same three paths, `P2025` → `{ rootError: "Leaderboard
  not found" }`.
- Return shape mirrors garage:
  `{ fieldErrors?: {...}; rootError?: string } | void` for create/update;
  delete returns `{ rootError?: string } | void`.
- Since tracks and leaderboards aren't owned by a user (unlike cars), "not
  found" and "not authorized" are distinct, real cases here — not merged
  into one generic message the way garage's ownership check does it.

## UI, routes, and forms

- **`requireAdmin()`** (`shared/lib/session.ts`) — `const user =
  await getCurrentUser(); if (!user || user.role !== "ADMIN") notFound();
  return user;`. A logged-out or non-admin visitor to any `/admin*` route
  gets Next's standard 404 page — the route appears not to exist, no
  "access denied" page revealing otherwise.
- **`TrackFormDialog`** (`"use client"`) — `mode: "create" | "edit"` (+
  `track` when editing), same `Dialog` + React Hook Form +
  `zodResolver(trackSchema)` pattern as `CarFormDialog`. Fields: name,
  country, length (meters), corners, elevation (meters).
- **`TrackAdminList`** / **`TrackAdminRow`** (Server Components) — list of
  tracks, each row with an edit dialog and `DeleteTrackButton`; empty state
  ("No tracks yet — add the first one").
- **`DeleteTrackButton`** (`"use client"`) — click opens a `Dialog` with a
  confirm/cancel pair; confirm calls `deleteTrack(id)`.
- **`LeaderboardFormDialog`** (`"use client"`) — same pattern, plus a
  `tracks` prop rendered as a native `<select>` (no new dependency, same as
  `CarFormDialog`'s drivetrain/transmission selects). Fields: title, track.
- **`LeaderboardAdminList`** / **`LeaderboardAdminRow`**,
  **`DeleteLeaderboardButton`** — same shape as the track equivalents.
- **`TrackCard`** — length formatted as `` `${(length / 1000).toFixed(1)}
  km` ``, elevation as `` `${elevation}m` `` — visual output unchanged from
  today.
- **`LeaderboardCard`** — drops the podium block (no data for it); keeps
  the track-name eyebrow and title.
- **`AdminView`** — two links: "Manage tracks" → `/admin/tracks`, "Manage
  leaderboards" → `/admin/leaderboards`.
- **`AdminTracksView`** / **`AdminLeaderboardsView`** — heading, create
  trigger, list — same composition shape as `MyGarageView`.
- **`TracksView`** / **`LeaderboardsView`** — thin `<main>` wrapper around
  the existing section components for the public routes.
- All five new routes (`/admin`, `/admin/tracks`, `/admin/leaderboards`,
  `/tracks`, `/leaderboards`) get `Metadata` (title, description,
  OpenGraph), per `AGENTS.md`'s SEO rule.

## Error handling

- Field-level errors (empty name, non-positive length/corners/elevation,
  no track selected) surface inline via RHF `setError`, same as
  `CarFormDialog`.
- "Not authorized" and "not found" surface as a root-level error in the
  dialog (create/update) or inline text in the confirm dialog (delete).
- No thrown exceptions reach the user; actions always return a typed
  result.

## Testing

Playwright E2E, extending the existing suite (`tests/admin-tracks.spec.ts`,
`tests/admin-leaderboards.spec.ts`), reusing the test DB truncation pattern
(`Track`/`Leaderboard` added to the `beforeEach` truncate list):

- A new login helper seeds/logs in as an `ADMIN` user, alongside the
  existing regular-user helper.
- Add a track as admin → appears in `/admin/tracks` and on the public
  `/tracks` page with the entered fields, correctly formatted.
- Edit a track → list and public page show updated fields.
- Delete a track → confirm step required; confirming removes it (and its
  leaderboards) everywhere.
- Add a leaderboard as admin, picking a track from the select → appears in
  `/admin/leaderboards` and on the public `/leaderboards` page with the
  right track name.
- Edit/delete a leaderboard → same coverage as tracks.
- Submitting either add form with missing required fields shows field
  errors and creates nothing.
- A regular (non-admin) logged-in user visiting `/admin`, `/admin/tracks`,
  or `/admin/leaderboards` → 404.
- A logged-out visitor to the same routes → 404.
- `/tracks` and `/leaderboards` render correctly for a logged-out visitor
  (public, no auth required).

## New dependencies

None — same native `<dialog>`/`<select>` approach as garage.

## New environment variables

None — `Track` and `Leaderboard` are added via a Prisma migration against
the existing `DATABASE_URL`/`TEST_DATABASE_URL`.
