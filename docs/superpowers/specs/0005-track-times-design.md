# Track Times — Design

## Goal

Users can set a lap time on a leaderboard using a car from their garage,
and remove a time they set. Times are immutable once set — there is no
edit, only remove-and-resubmit. Every visitor, including logged-out ones,
can see full car details for every entry on a leaderboard. Because a
user's `Car` row can be edited or deleted after a time is set, each entry
stores its own frozen snapshot of the car's spec at submission time,
independent of the live `Car` row.

This closes the "non-goal" left open by
`0004-tracks-leaderboards-crud-design.md`: leaderboards currently have no
entries, only metadata (title + track).

## Non-goals (explicitly out of scope for this pass)

- Editing an existing time. Only create and delete.
- Any admin UI for managing entries beyond the same delete control every
  visitor with permission sees inline (no `/admin/leaderboards/[id]`
  management screen).
- Wiring the homepage `activity` feed to real entries — it stays on its
  existing mock data (`features/activity/model/mock.ts`); unrelated to
  this request.
- Photo snapshotting. The entry snapshot covers spec fields and notes,
  not `photoUrl`.
- Any notion of "personal best" aggregation, badges, or ranking across
  leaderboards/tracks — this pass only ranks entries within a single
  leaderboard, by time.

## Architecture & placement

Following `AGENTS.md`'s layer rules (`app → views/layout → features →
shared`, features never import each other):

**Cross-feature composition.** Setting a time needs both the leaderboard
(to submit against) and the user's cars (to pick from), but
`features/leaderboards` cannot import `features/garage`. Resolved the same
way `0004`'s admin leaderboard form resolved needing tracks: composition
happens in `views`. The new `views/leaderboard-detail` calls `getCars()`
(from `features/garage`) and passes the result down as a plain
`{ id: string; make: string; model: string; year: number }[]` prop into
`SetTimeDialog` (from `features/leaderboards`). Neither feature imports
the other. The snapshot copy itself happens inside
`features/leaderboards`' `createEntry` action, which reads the `Car` row
directly via Prisma (infrastructure access, not a feature import — the
same way `getLeaderboards()` already joins `Track` today).

**`features/leaderboards`** (existing, expands):

- `model/types.ts` — new `LeaderboardEntry` DTO: `id`, `leaderboardId`,
  `driverId`, `driverName`, `carId` (nullable), `timeMs`, snapshot fields
  (`carMake`, `carModel`, `carYear`, `carHorsepower`, `carDrivetrain`,
  `carTransmission`, `carNickname`, `carNotes`), `createdAt`.
- `model/schema.ts` — new `entrySchema` (Zod): `carId`, `minutes`,
  `seconds`, `milliseconds`.
- `model/entries.ts` (new, DAL) — `getEntries(leaderboardId)`: entries
  joined with `driver: { select: { name: true } }`, ordered by `timeMs`
  ascending, `createdAt` ascending as a tiebreaker (whoever set the tied
  time first ranks higher).
- `model/leaderboards.ts` — gains `getLeaderboard(id)` (single lookup with
  track name, for the detail page header — mirrors `getLeaderboards()`
  but for one row).
- `model/actions.ts` — gains `createEntry(leaderboardId, input)` and
  `deleteEntry(id)`.
- `ui/set-time-dialog.tsx` (new, `"use client"`) — car picker (from a
  `cars` prop) + minutes/seconds/milliseconds number inputs, same
  `Dialog` + React Hook Form + `zodResolver(entrySchema)` pattern as
  `CarFormDialog`.
- `ui/entry-table.tsx` (new, Server Component) — ranked table; takes
  `entries`, `currentUserId`, `currentUserRole` as props to decide which
  rows get a delete control.
- `ui/entry-notes-button.tsx` (new, `"use client"`) — click opens a small
  `Dialog` showing the full notes text (mirrors `DeleteCarButton`'s
  confirm-dialog trigger pattern); rendered only when `carNotes` is
  non-empty.
- `ui/delete-entry-button.tsx` (new, `"use client"`) — same
  confirm-dialog shape as `DeleteTrackButton`; calls `deleteEntry(id)`.
- `ui/leaderboard-card.tsx` — `href="/leaderboards"` on the "View full
  leaderboard" button becomes `href={`/leaderboards/${leaderboard.id}`}`.
  Fixed in passing: today it always points at the list page regardless of
  which leaderboard the card is for, which stops making sense once a real
  detail page exists.
- `index.ts` — public API grows to include `LeaderboardEntry`,
  `createEntry`, `deleteEntry`, `getEntries`, `getLeaderboard`,
  `SetTimeDialog`, `EntryTable`.

**`views/leaderboard-detail`** (new) — `leaderboard-detail-view.tsx`,
`async`, takes `leaderboardId` and the current user (nullable). Calls
`getLeaderboard(id)`, `getEntries(id)`, and — only if a user is logged in
— `getCars(user.id)`. Renders: `h1` (leaderboard title + track name as
subheading), `EntryTable`, and either `SetTimeDialog` (user logged in,
has eligible cars), a "add a car first" prompt (logged in, zero cars, or
all cars already entered), or a "Log in to set a time" link (logged out).
Calls Next's `notFound()` if `getLeaderboard(id)` returns null.

**`app/leaderboards/[id]/page.tsx`** (new) — reads `getCurrentUser()`,
renders `LeaderboardDetailView`, sets `Metadata` (title includes the
leaderboard title + track name, per `AGENTS.md`'s SEO rule).

## Data model

```prisma
model LeaderboardEntry {
  id              String       @id @default(cuid())
  leaderboardId   String
  leaderboard     Leaderboard  @relation(fields: [leaderboardId], references: [id], onDelete: Cascade)
  driverId        String
  driver          User         @relation(fields: [driverId], references: [id], onDelete: Cascade)
  carId           String?
  car             Car?         @relation(fields: [carId], references: [id], onDelete: SetNull)
  timeMs          Int
  carMake         String
  carModel        String
  carYear         Int
  carHorsepower   Int
  carDrivetrain   Drivetrain
  carTransmission Transmission
  carNickname     String?
  carNotes        String?
  createdAt       DateTime     @default(now())

  @@unique([leaderboardId, carId])
}
```

- `Leaderboard`, `User`, and `Car` all gain a back-relation field
  (`entries LeaderboardEntry[]`) for the above to compile.
- `carId` is optional and `SetNull` on car deletion — deleting a car from
  the garage does not delete its past entries, it only detaches the live
  reference. Every field needed to render the entry lives in the snapshot
  columns, so display is unaffected either way.
- `@@unique([leaderboardId, carId])` enforces "one entry per car per
  leaderboard." Postgres treats `NULL` as distinct per row in a unique
  index, so once a car is deleted (`carId` → `null`) the constraint no
  longer restricts anything for that row — there is nothing left to
  re-collide with.
- `driverId` cascades on user deletion, matching `Car.ownerId`'s existing
  `onDelete: Cascade`.
- All snapshot fields are required except `carNickname`/`carNotes`
  (mirrors `Car`'s own optionality for those two).
- `timeMs` is the only stored time representation — computed from the
  minutes/seconds/milliseconds form inputs on write, formatted back to
  `M:SS.mmm` for display.

## Data flow & authorization

- **`createEntry(leaderboardId, input: EntryInput)`** — validate against
  `entrySchema` (`carId` required; `minutes` 0–999, `seconds` 0–59,
  `milliseconds` 0–999, total > 0). Call `getCurrentUser()`; if `null`,
  return `{ rootError: "You must be logged in" }` (same phrasing as
  garage's actions). Look up the car via
  `prisma.car.findFirst({ where: { id: carId, ownerId: user.id } })` — if
  not found, `{ rootError: "Car not found" }` (car must belong to the
  submitting user; this also implicitly authorizes the submission). On
  success, compute `timeMs = minutes * 60000 + seconds * 1000 + milliseconds`
  and `prisma.leaderboardEntry.create` with the car's current fields
  copied into the snapshot columns plus `driverId: user.id`. Catch
  `P2002` (unique violation) → `{ fieldErrors: { carId: "This car
  already has a time on this leaderboard" } }`. `revalidatePath("/")`,
  `/leaderboards`, `/leaderboards/${leaderboardId}`.
- **`deleteEntry(id)`** — call `getCurrentUser()`; if `null`,
  `{ rootError: "You must be logged in" }`. Fetch the entry; if missing,
  `{ rootError: "Entry not found" }`. If `entry.driverId !== user.id &&
user.role !== "ADMIN"`, `{ rootError: "Not authorized" }`. Otherwise
  `prisma.leaderboardEntry.delete`, revalidate the same three paths.
- Return shape mirrors garage/tracks:
  `{ fieldErrors?: {...}; rootError?: string } | void`.
- `getEntries`/`getLeaderboard` require no auth — the detail page and its
  data are fully public, including all snapshot fields, matching "all
  vehicle details visible for non-authenticated users."

## UI, routes, and forms

- **`SetTimeDialog`** (`"use client"`) — `cars` prop pre-filtered by the
  view to exclude cars the user already has an entry for on this
  leaderboard. Native `<select>` for car (same pattern as
  `LeaderboardFormDialog`'s track select), three `<input type="number">`
  fields for minutes/seconds/milliseconds. If `cars` is empty, the view
  renders a prompt instead of this dialog rather than an empty select.
- **`EntryTable`** — one row per entry: rank (1-indexed position in the
  already-sorted list), driver name, car (`year make model`, nickname
  if set — same label logic as `CarCard`), spec `Tag`s (horsepower,
  drivetrain, transmission — same three tags `CarCard` shows), a notes
  icon/button when `carNotes` is set, formatted time, and a delete button
  when the viewer owns the row or is an admin. Empty state: "No times
  set yet — be the first."
- **`EntryNotesButton`** — click opens a `Dialog` with the full notes
  text; keeps the table row compact per your answer ("not entire note in
  single table row").
- **`DeleteEntryButton`** — confirm dialog, same shape as
  `DeleteCarButton`/`DeleteTrackButton`.
- **`LeaderboardDetailView`** — `h1` is the leaderboard title; track name
  rendered as a subheading/eyebrow (matches the `MapPin` + track-name
  treatment already used on `LeaderboardCard`).
- `/leaderboards/[id]` gets `Metadata` (title, description, OpenGraph)
  per `AGENTS.md`'s SEO rule; only one `h1` (the leaderboard title).

## Error handling

- Field-level errors (no car selected, out-of-range time parts, zero
  time) surface inline via RHF `setError`, same as `CarFormDialog`.
- "Car already has a time here" surfaces on the `carId` field even though
  it's caught as a `P2002` on submit (defense in depth — the picker
  already filters these cars out, but the server re-validates regardless,
  same as every other action in this codebase).
- "Not authorized" / "not logged in" / "not found" surface as a
  root-level error in the relevant dialog.
- No thrown exceptions reach the user; actions always return a typed
  result.

## Testing

Playwright E2E, extending the existing suite
(`tests/leaderboard-entries.spec.ts`, new file), reusing the test DB
truncation pattern (`LeaderboardEntry` added to the `beforeEach` truncate
list, before `Car`/`Leaderboard` since it references both):

- Logged-in user with a car in their garage sets a time on a leaderboard
  → entry appears in the table with correct rank, car spec tags, and
  formatted time.
- The same user tries to set a second time with the same car on the same
  leaderboard → rejected with a field error; no duplicate row created.
- The same user sets a time with a different car → both entries appear,
  correctly ranked by time.
- User deletes their own entry → confirm step required; confirming
  removes it from the table.
- User edits the car (e.g. changes horsepower) after setting a time →
  the existing entry's displayed spec is unchanged (snapshot, not live).
- User deletes the car after setting a time → the leaderboard entry still
  appears, with its original snapshot data intact.
- A logged-out visitor viewing `/leaderboards/[id]` sees full entry
  details (driver, car spec, notes, time) and no "Set a time" control,
  only a login prompt.
- A logged-in user with no cars in their garage sees a prompt to add one
  instead of the set-time control.
- A user attempts to delete another user's entry via the action directly
  (not through UI, since the UI hides the control) → rejected with "Not
  authorized".
- An admin can delete any user's entry.

## New dependencies

None — same native `<dialog>`/`<select>`/`<input type="number">`
approach as garage and the tracks/leaderboards admin CRUD.

## New environment variables

None — `LeaderboardEntry` is added via a Prisma migration against the
existing `DATABASE_URL`/`TEST_DATABASE_URL`.
