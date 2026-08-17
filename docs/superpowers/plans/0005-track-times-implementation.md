# Track Times Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can set an immutable lap time on a leaderboard using a car from their garage, and remove a time they set. A new `/leaderboards/[id]` page shows every entry — full car details, publicly, even to logged-out visitors — ranked by time, with each entry storing a frozen snapshot of the car's spec so later edits/deletes in the garage never change history.

**Architecture:** `features/leaderboards` gains a `LeaderboardEntry` domain (Prisma model, Zod schema, DAL, server actions, UI) alongside its existing `Leaderboard` domain. A new `views/leaderboard-detail` composes `features/leaderboards` (the leaderboard + its entries + the set-time UI) with `features/garage`'s existing `getCars` (to populate the car picker) — resolving the cross-feature data need at the `views` layer, the same way `views/admin-leaderboards` already composes `features/tracks` and `features/leaderboards`. Neither feature imports the other.

**Tech Stack:** Next.js (App Router, Server Actions, dynamic route `[id]`), Prisma/Postgres, Zod, React Hook Form, Tailwind, Playwright.

**Spec:** `docs/superpowers/specs/0005-track-times-design.md`

## Global Constraints

- Follow `AGENTS.md`'s layer rules exactly: `app → views/layout → features → shared`, enforced by `eslint-plugin-boundaries`. `app/leaderboards/[id]/page.tsx` may only import from `@/views/leaderboard-detail` — never `@/features/*` directly. Anything the page needs from a feature (`getCurrentUser`, `getLeaderboard`) must be re-exported through `views/leaderboard-detail/index.ts`, exactly like `views/my-garage/index.ts` re-exports `getCurrentUser` and `views/admin-leaderboards/index.ts` re-exports `requireAdmin`.
- `features/leaderboards` may not import `features/garage`, or vice versa. The set-time dialog's car list is fetched by `views/leaderboard-detail` (via `features/garage`'s `getCars`) and passed into `SetTimeDialog` (from `features/leaderboards`) as a plain prop.
- All new files under `src/` are kebab-case (`unicorn/filename-case`).
- Server Components by default; `"use client"` only on the smallest leaf that needs it (dialogs, form state, delete-confirmation state) — same as every existing dialog/button in this codebase.
- No new npm dependencies — car/time inputs use native `<select>`/`<input type="number">`, same as every existing form in this codebase.
- Times are immutable: only `createEntry` and `deleteEntry` exist, never an update.
- `LeaderboardEntry` snapshots the car's `make, model, year, horsepower, drivetrain, transmission, nickname, notes` at submission time into its own columns (`carMake`, `carModel`, etc.) — display always reads these columns, never the live `Car` row. `carId` is optional (`onDelete: SetNull`) so deleting a car does not delete its past entries.
- `@@unique([leaderboardId, carId])` enforces one entry per car per leaderboard (Postgres treats `NULL` `carId` values as distinct, so this only restricts entries whose car still exists).
- Every mutation (`createEntry`, `deleteEntry`) re-derives the user from `getCurrentUser()` server-side — never trust the client. `createEntry`: not logged in → `{ rootError: "You must be logged in" }`; car not owned by the user → `{ fieldErrors: { carId: "Car not found" } }`. `deleteEntry`: not logged in → `{ rootError: "You must be logged in" }`; entry missing → `{ rootError: "Entry not found" }`; not the entry's driver and not an admin → `{ rootError: "Not authorized" }`.
- `createEntry`/`deleteEntry` revalidate `/`, `/leaderboards`, and `/leaderboards/${leaderboardId}`.
- `getEntries`/`getLeaderboard` require no auth — the detail page and every field on it (including car spec and driver name) is public.
- This repo has no unit-testing framework (no Vitest/RTL) — behavioral verification is Playwright E2E only, following the precedent set by auth/garage/tracks/leaderboards. Verify each non-final task with `npx tsc --noEmit && pnpm lint`; the final task adds the Playwright suite covering the full set/remove-time + snapshot + visibility flows.
- The root layout (`src/app/layout.tsx`) sets `title.template: "%s · Tracks Inc."` — `generateMetadata`'s `title` is a short string (e.g. the leaderboard's title), not the full suffixed string.

---

## File Structure

**New:**

- `src/features/leaderboards/model/entries.ts` — `getEntries(leaderboardId)` (DAL).
- `src/features/leaderboards/ui/set-time-dialog.tsx` — car picker + minutes/seconds/milliseconds form (`"use client"`).
- `src/features/leaderboards/ui/entry-table.tsx` — ranked table of entries (Server Component).
- `src/features/leaderboards/ui/entry-notes-button.tsx` — click-to-view notes (`"use client"`).
- `src/features/leaderboards/ui/delete-entry-button.tsx` — delete trigger + confirm modal (`"use client"`).
- `src/views/leaderboard-detail/ui/leaderboard-detail-view.tsx` + `src/views/leaderboard-detail/index.ts`.
- `src/app/leaderboards/[id]/page.tsx`.
- `tests/leaderboard-entries.spec.ts` — Playwright E2E suite.

**Modified:**

- `prisma/schema.prisma` — add `LeaderboardEntry` model + back-relations on `User`, `Car`, `Leaderboard`.
- `src/features/leaderboards/model/types.ts` — add `LeaderboardEntry` type.
- `src/features/leaderboards/model/schema.ts` — add `entrySchema`/`EntryInput`.
- `src/features/leaderboards/model/leaderboards.ts` — add `getLeaderboard(id)`.
- `src/features/leaderboards/model/actions.ts` — add `createEntry`, `deleteEntry`.
- `src/features/leaderboards/ui/leaderboard-card.tsx` — "View full leaderboard" now links to `/leaderboards/${leaderboard.id}` instead of the generic `/leaderboards` list.
- `src/features/leaderboards/index.ts` — export the new entry pieces.

---

### Task 1: Prisma schema — `LeaderboardEntry` model

**Files:**

- Modify: `prisma/schema.prisma`

**Interfaces:**

- Produces: `LeaderboardEntry` Prisma model (`id, leaderboardId, leaderboard, driverId, driver, carId, car, timeMs, carMake, carModel, carYear, carHorsepower, carDrivetrain, carTransmission, carNickname, carNotes, createdAt`, `@@unique([leaderboardId, carId])`); back-relation fields `entries LeaderboardEntry[]` on `User`, `Car`, `Leaderboard`.

- [ ] **Step 1: Replace the full contents of `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

enum Drivetrain {
  FWD
  RWD
  AWD
}

enum Transmission {
  MANUAL
  AUTOMATIC
}

model User {
  id           String             @id @default(cuid())
  email        String             @unique
  passwordHash String
  name         String
  role         Role               @default(USER)
  createdAt    DateTime           @default(now())
  sessions     Session[]
  cars         Car[]
  entries      LeaderboardEntry[]
}

model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Car {
  id           String             @id @default(cuid())
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
  owner        User               @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt    DateTime           @default(now())
  entries      LeaderboardEntry[]
}

model Track {
  id           String        @id @default(cuid())
  name         String        @unique
  country      String
  length       Int
  corners      Int
  elevation    Int?
  createdAt    DateTime      @default(now())
  leaderboards Leaderboard[]
}

model Leaderboard {
  id        String             @id @default(cuid())
  title     String
  trackId   String
  track     Track              @relation(fields: [trackId], references: [id], onDelete: Cascade)
  createdAt DateTime           @default(now())
  entries   LeaderboardEntry[]

  @@unique([trackId, title])
}

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

- [ ] **Step 2: Run the dev migration**

Run: `npx prisma migrate dev --name add_leaderboard_entry`
Expected: `Your database is now in sync with your schema.` and a new folder under `prisma/migrations/` containing the `LeaderboardEntry` table creation and the new FK columns.

- [ ] **Step 3: Apply the same migration to the test database**

Run:

```bash
set -a; source .env; set +a
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
```

Expected: `All migrations have been successfully applied.`

- [ ] **Step 4: Verify the Prisma client compiles against the new schema**

Run: `npx tsc --noEmit`
Expected: no errors (nothing consumes `LeaderboardEntry` yet, this just confirms `prisma generate`, which `migrate dev` already ran, produced valid types).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add LeaderboardEntry model to schema"
```

---

### Task 2: Leaderboard entries domain layer — types, schema, DAL

**Files:**

- Modify: `src/features/leaderboards/model/types.ts`
- Modify: `src/features/leaderboards/model/schema.ts`
- Modify: `src/features/leaderboards/model/leaderboards.ts`
- Create: `src/features/leaderboards/model/entries.ts`

**Interfaces:**

- Produces: `LeaderboardEntry` type; `entrySchema` (Zod) and `EntryInput` type; `getLeaderboard(id: string): Promise<Leaderboard | null>`; `getEntries(leaderboardId: string): Promise<LeaderboardEntry[]>`.

- [ ] **Step 1: Add the `LeaderboardEntry` type**

Replace the contents of `src/features/leaderboards/model/types.ts`:

```ts
export type Leaderboard = {
  id: string;
  title: string;
  trackId: string;
  trackName: string;
};

export type LeaderboardEntry = {
  id: string;
  leaderboardId: string;
  driverId: string;
  driverName: string;
  carId: string | null;
  timeMs: number;
  carMake: string;
  carModel: string;
  carYear: number;
  carHorsepower: number;
  carDrivetrain: "FWD" | "RWD" | "AWD";
  carTransmission: "MANUAL" | "AUTOMATIC";
  carNickname: string | null;
  carNotes: string | null;
  createdAt: Date;
};
```

- [ ] **Step 2: Add `entrySchema`**

Add to `src/features/leaderboards/model/schema.ts` (append after `leaderboardSchema`):

```ts
export const entrySchema = z
  .object({
    carId: z.string().trim().min(1, "Select a car"),
    minutes: z.coerce
      .number()
      .int()
      .min(0, "Enter a valid time")
      .max(999, "Enter a valid time"),
    seconds: z.coerce
      .number()
      .int()
      .min(0, "Enter a valid time")
      .max(59, "Enter a valid time"),
    milliseconds: z.coerce
      .number()
      .int()
      .min(0, "Enter a valid time")
      .max(999, "Enter a valid time"),
  })
  .refine(
    (data) =>
      data.minutes * 60000 + data.seconds * 1000 + data.milliseconds > 0,
    { message: "Time must be greater than zero", path: ["minutes"] },
  );

export type EntryInput = z.infer<typeof entrySchema>;
```

- [ ] **Step 3: Add `getLeaderboard`**

Add to `src/features/leaderboards/model/leaderboards.ts` (append after `getLeaderboards`):

```ts
export async function getLeaderboard(
  id: string,
): Promise<Leaderboard | null> {
  const leaderboard = await prisma.leaderboard.findUnique({
    where: { id },
    include: { track: { select: { name: true } } },
  });

  if (!leaderboard) return null;

  return {
    id: leaderboard.id,
    title: leaderboard.title,
    trackId: leaderboard.trackId,
    trackName: leaderboard.track.name,
  };
}
```

- [ ] **Step 4: Add `getEntries` DAL function**

Create `src/features/leaderboards/model/entries.ts`:

```ts
import "server-only";
import { prisma } from "@/shared/lib/prisma";
import type { LeaderboardEntry } from "./types";

export async function getEntries(
  leaderboardId: string,
): Promise<LeaderboardEntry[]> {
  const entries = await prisma.leaderboardEntry.findMany({
    where: { leaderboardId },
    orderBy: [{ timeMs: "asc" }, { createdAt: "asc" }],
    include: { driver: { select: { name: true } } },
  });

  return entries.map((entry) => ({
    id: entry.id,
    leaderboardId: entry.leaderboardId,
    driverId: entry.driverId,
    driverName: entry.driver.name,
    carId: entry.carId,
    timeMs: entry.timeMs,
    carMake: entry.carMake,
    carModel: entry.carModel,
    carYear: entry.carYear,
    carHorsepower: entry.carHorsepower,
    carDrivetrain: entry.carDrivetrain,
    carTransmission: entry.carTransmission,
    carNickname: entry.carNickname,
    carNotes: entry.carNotes,
    createdAt: entry.createdAt,
  }));
}
```

- [ ] **Step 5: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/leaderboards/model/types.ts src/features/leaderboards/model/schema.ts src/features/leaderboards/model/leaderboards.ts src/features/leaderboards/model/entries.ts
git commit -m "feat: add leaderboard entries domain types, schema, and DAL"
```

---

### Task 3: Leaderboard entry server actions

**Files:**

- Modify: `src/features/leaderboards/model/actions.ts`

**Interfaces:**

- Consumes: `entrySchema`, `EntryInput` (Task 2); `getCurrentUser` (`@/shared/lib/session`); `prisma` (`@/shared/lib/prisma`).
- Produces: `createEntry(leaderboardId: string, input: EntryInput): Promise<EntryActionResult>`, `deleteEntry(id: string): Promise<{ rootError?: string } | void>`, where `EntryActionResult = { fieldErrors?: Partial<Record<keyof EntryInput, string>>; rootError?: string } | void`.

- [ ] **Step 1: Update the schema import**

In `src/features/leaderboards/model/actions.ts`, replace the existing schema import lines:

```ts
import { leaderboardSchema } from "./schema";
import type { LeaderboardInput } from "./schema";
```

with:

```ts
import { entrySchema, leaderboardSchema } from "./schema";
import type { EntryInput, LeaderboardInput } from "./schema";
```

- [ ] **Step 2: Add the entry actions**

Append to the end of `src/features/leaderboards/model/actions.ts`:

```ts
type EntryActionResult = {
  fieldErrors?: Partial<Record<keyof EntryInput, string>>;
  rootError?: string;
} | void;

function revalidateEntryPaths(leaderboardId: string) {
  revalidatePath("/");
  revalidatePath("/leaderboards");
  revalidatePath(`/leaderboards/${leaderboardId}`);
}

export async function createEntry(
  leaderboardId: string,
  input: EntryInput,
): Promise<EntryActionResult> {
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { rootError: "You must be logged in" };
  }

  const car = await prisma.car.findFirst({
    where: { id: parsed.data.carId, ownerId: user.id },
  });
  if (!car) {
    return { fieldErrors: { carId: "Car not found" } };
  }

  const timeMs =
    parsed.data.minutes * 60000 +
    parsed.data.seconds * 1000 +
    parsed.data.milliseconds;

  try {
    await prisma.leaderboardEntry.create({
      data: {
        leaderboardId,
        driverId: user.id,
        carId: car.id,
        timeMs,
        carMake: car.make,
        carModel: car.model,
        carYear: car.year,
        carHorsepower: car.horsepower,
        carDrivetrain: car.drivetrain,
        carTransmission: car.transmission,
        carNickname: car.nickname,
        carNotes: car.notes,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        fieldErrors: {
          carId: "This car already has a time on this leaderboard",
        },
      };
    }
    throw error;
  }

  revalidateEntryPaths(leaderboardId);
}

export async function deleteEntry(
  id: string,
): Promise<{ rootError?: string } | void> {
  const user = await getCurrentUser();
  if (!user) {
    return { rootError: "You must be logged in" };
  }

  const entry = await prisma.leaderboardEntry.findUnique({ where: { id } });
  if (!entry) {
    return { rootError: "Entry not found" };
  }

  if (entry.driverId !== user.id && user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  await prisma.leaderboardEntry.delete({ where: { id } });
  revalidateEntryPaths(entry.leaderboardId);
}
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/leaderboards/model/actions.ts
git commit -m "feat: add leaderboard entry server actions"
```

---

### Task 4: `SetTimeDialog` UI

**Files:**

- Create: `src/features/leaderboards/ui/set-time-dialog.tsx`

**Interfaces:**

- Consumes: `createEntry` (Task 3); `entrySchema`, `EntryInput` (Task 2); `Button`, `Dialog` (`@/shared/ui`).
- Produces: `type CarOption = { id: string; make: string; model: string; year: number }`; `SetTimeDialog(props: { leaderboardId: string; cars: CarOption[] })`. Callers must only render this component when `cars.length > 0` — it has no empty-car-list state of its own.

- [ ] **Step 1: Write the dialog**

Create `src/features/leaderboards/ui/set-time-dialog.tsx`:

```tsx
"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Plus } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { createEntry } from "../model/actions";
import { entrySchema } from "../model/schema";
import type { EntryInput } from "../model/schema";

export type CarOption = {
  id: string;
  make: string;
  model: string;
  year: number;
};

type SetTimeDialogProps = {
  leaderboardId: string;
  cars: CarOption[];
};

const inputClasses =
  "border border-divider bg-background px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2";

function defaultValues(cars: CarOption[]): EntryInput {
  return {
    carId: cars[0]?.id ?? "",
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  };
}

export function SetTimeDialog({ leaderboardId, cars }: SetTimeDialogProps) {
  const uid = useId();
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntryInput>({
    resolver: zodResolver(entrySchema) as Resolver<EntryInput>,
    defaultValues: defaultValues(cars),
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await createEntry(leaderboardId, data);

    if (!result) {
      setIsOpen(false);
      return;
    }

    if (result.fieldErrors) {
      (
        Object.keys(result.fieldErrors) as (keyof typeof result.fieldErrors)[]
      ).forEach((field) => {
        const message = result.fieldErrors?.[field];
        if (message) setError(field, { message });
      });
    }

    if (result.rootError) {
      setError("root", { message: result.rootError });
    }
  });

  return (
    <>
      <Button
        type="button"
        variant="primary"
        onClick={() => {
          reset(defaultValues(cars));
          setIsOpen(true);
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        Set a time
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex w-80 flex-col gap-4"
        >
          <h2 className="font-heading text-lg font-extrabold">Set a time</h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-carId`} className="text-sm font-semibold">
              Car
            </label>
            <select
              id={`${uid}-carId`}
              className={inputClasses}
              {...register("carId")}
            >
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.year} {car.make} {car.model}
                </option>
              ))}
            </select>
            {errors.carId && (
              <p className="text-sm text-accent-600">
                {errors.carId.message}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label
                htmlFor={`${uid}-minutes`}
                className="text-sm font-semibold"
              >
                Minutes
              </label>
              <input
                id={`${uid}-minutes`}
                type="number"
                className={inputClasses}
                {...register("minutes", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label
                htmlFor={`${uid}-seconds`}
                className="text-sm font-semibold"
              >
                Seconds
              </label>
              <input
                id={`${uid}-seconds`}
                type="number"
                className={inputClasses}
                {...register("seconds", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label
                htmlFor={`${uid}-milliseconds`}
                className="text-sm font-semibold"
              >
                Millis
              </label>
              <input
                id={`${uid}-milliseconds`}
                type="number"
                className={inputClasses}
                {...register("milliseconds", { valueAsNumber: true })}
              />
            </div>
          </div>
          {errors.minutes && (
            <p className="text-sm text-accent-600">
              {errors.minutes.message}
            </p>
          )}
          {errors.seconds && (
            <p className="text-sm text-accent-600">
              {errors.seconds.message}
            </p>
          )}
          {errors.milliseconds && (
            <p className="text-sm text-accent-600">
              {errors.milliseconds.message}
            </p>
          )}

          {errors.root && (
            <p className="text-sm text-accent-600">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              Set time
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/leaderboards/ui/set-time-dialog.tsx
git commit -m "feat: add set-time dialog"
```

---

### Task 5: `EntryTable`, `EntryNotesButton`, `DeleteEntryButton` UI

**Files:**

- Create: `src/features/leaderboards/ui/entry-notes-button.tsx`
- Create: `src/features/leaderboards/ui/delete-entry-button.tsx`
- Create: `src/features/leaderboards/ui/entry-table.tsx`

**Interfaces:**

- Consumes: `deleteEntry` (Task 3); `LeaderboardEntry` (Task 2); `Button`, `Dialog`, `Tag` (`@/shared/ui`).
- Produces: `EntryNotesButton(props: { notes: string })`; `DeleteEntryButton(props: { entryId: string; carLabel: string })`; `EntryTable(props: { entries: LeaderboardEntry[]; currentUserId: string | null; currentUserRole: "USER" | "ADMIN" | null })`.

- [ ] **Step 1: Notes button**

Create `src/features/leaderboards/ui/entry-notes-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { StickyNote } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";

export function EntryNotesButton({ notes }: { notes: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setIsOpen(true)}>
        <StickyNote className="h-3.5 w-3.5" />
        Notes
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex w-72 flex-col gap-4">
          <p className="text-sm whitespace-pre-wrap">{notes}</p>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Delete button with confirmation**

Create `src/features/leaderboards/ui/delete-entry-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { deleteEntry } from "../model/actions";

type DeleteEntryButtonProps = {
  entryId: string;
  carLabel: string;
};

export function DeleteEntryButton({
  entryId,
  carLabel,
}: DeleteEntryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteEntry(entryId);
    setIsDeleting(false);

    if (result?.rootError) {
      setError(result.rootError);
      return;
    }

    setIsOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex w-72 flex-col gap-4">
          <p className="text-sm font-semibold">Remove this {carLabel} time?</p>
          {error && <p className="text-sm text-accent-600">{error}</p>}
          <div className="flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 3: Entry table**

Create `src/features/leaderboards/ui/entry-table.tsx`:

```tsx
import { Tag } from "@/shared/ui";
import { DeleteEntryButton } from "./delete-entry-button";
import { EntryNotesButton } from "./entry-notes-button";
import type { LeaderboardEntry } from "../model/types";

const drivetrainLabels: Record<LeaderboardEntry["carDrivetrain"], string> = {
  FWD: "FWD",
  RWD: "RWD",
  AWD: "AWD",
};

const transmissionLabels: Record<
  LeaderboardEntry["carTransmission"],
  string
> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automatic",
};

function formatTime(timeMs: number): string {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const milliseconds = timeMs % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(
    milliseconds,
  ).padStart(3, "0")}`;
}

type EntryTableProps = {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
  currentUserRole: "USER" | "ADMIN" | null;
};

export function EntryTable({
  entries,
  currentUserId,
  currentUserRole,
}: EntryTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        No times set yet — be the first.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b-2 border-divider text-xs font-extrabold tracking-wide text-foreground/60 uppercase">
          <th className="py-3 pr-4">Rank</th>
          <th className="py-3 pr-4">Driver</th>
          <th className="py-3 pr-4">Car</th>
          <th className="py-3 pr-4">Time</th>
          <th className="py-3 pr-4" />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => {
          const carLabel = `${entry.carYear} ${entry.carMake} ${entry.carModel}`;
          const canDelete =
            currentUserId === entry.driverId || currentUserRole === "ADMIN";

          return (
            <tr key={entry.id} className="border-b border-divider">
              <td className="py-3 pr-4 font-heading font-extrabold">
                {index + 1}
              </td>
              <td className="py-3 pr-4">{entry.driverName}</td>
              <td className="py-3 pr-4">
                <div className="flex flex-col gap-1.5">
                  <span>
                    {entry.carNickname
                      ? `${entry.carNickname} (${carLabel})`
                      : carLabel}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag variant="neutral">{entry.carHorsepower} hp</Tag>
                    <Tag variant="neutral">
                      {drivetrainLabels[entry.carDrivetrain]}
                    </Tag>
                    <Tag variant="neutral">
                      {transmissionLabels[entry.carTransmission]}
                    </Tag>
                    {entry.carNotes && (
                      <EntryNotesButton notes={entry.carNotes} />
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4 font-heading font-extrabold">
                {formatTime(entry.timeMs)}
              </td>
              <td className="py-3 pr-4">
                {canDelete && (
                  <DeleteEntryButton entryId={entry.id} carLabel={carLabel} />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/leaderboards/ui/entry-notes-button.tsx src/features/leaderboards/ui/delete-entry-button.tsx src/features/leaderboards/ui/entry-table.tsx
git commit -m "feat: add leaderboard entry table UI"
```

---

### Task 6: Public API wiring — `index.ts` exports and `LeaderboardCard` link fix

**Files:**

- Modify: `src/features/leaderboards/index.ts`
- Modify: `src/features/leaderboards/ui/leaderboard-card.tsx`

**Interfaces:**

- Consumes: everything produced in Tasks 2–5.
- Produces: `features/leaderboards`' public API additionally exports `LeaderboardEntry`, `CarOption`, `getLeaderboard`, `getEntries`, `SetTimeDialog`, `EntryTable`.

- [ ] **Step 1: Update the public API**

Replace the contents of `src/features/leaderboards/index.ts`:

```ts
export { LeaderboardsSection } from "./ui/leaderboards-section";
export { LeaderboardFormDialog } from "./ui/admin/leaderboard-form-dialog";
export { LeaderboardAdminList } from "./ui/admin/leaderboard-admin-list";
export { SetTimeDialog } from "./ui/set-time-dialog";
export type { CarOption } from "./ui/set-time-dialog";
export { EntryTable } from "./ui/entry-table";
export { getLeaderboards, getLeaderboard } from "./model/leaderboards";
export { getEntries } from "./model/entries";
export type { Leaderboard, LeaderboardEntry } from "./model/types";
```

- [ ] **Step 2: Point "View full leaderboard" at the specific board**

In `src/features/leaderboards/ui/leaderboard-card.tsx`, replace:

```tsx
      <Button href="/leaderboards" variant="ghost" className="mt-1">
```

with:

```tsx
      <Button
        href={`/leaderboards/${leaderboard.id}`}
        variant="ghost"
        className="mt-1"
      >
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/leaderboards/index.ts src/features/leaderboards/ui/leaderboard-card.tsx
git commit -m "feat: export leaderboard entries API and link cards to their detail page"
```

---

### Task 7: `views/leaderboard-detail` and the `/leaderboards/[id]` route

**Files:**

- Create: `src/views/leaderboard-detail/ui/leaderboard-detail-view.tsx`
- Create: `src/views/leaderboard-detail/index.ts`
- Create: `src/app/leaderboards/[id]/page.tsx`

**Interfaces:**

- Consumes: `getCurrentUser`, `AuthUser` (`@/features/auth`); `getCars` (`@/features/garage`); `getLeaderboard`, `getEntries`, `SetTimeDialog`, `EntryTable` (`@/features/leaderboards`, Task 6).
- Produces: `LeaderboardDetailView(props: { leaderboardId: string; user: AuthUser | null })` (async Server Component) — calls Next's `notFound()` if the leaderboard doesn't exist. `views/leaderboard-detail`'s public API re-exports `getLeaderboard` and `getCurrentUser` so `app/leaderboards/[id]/page.tsx` never has to import a feature directly (matches the `boundaries/dependencies` rule: `app` may only import `views`/`layout`).

- [ ] **Step 1: Write the view**

Create `src/views/leaderboard-detail/ui/leaderboard-detail-view.tsx`:

```tsx
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import type { AuthUser } from "@/features/auth";
import { getCars } from "@/features/garage";
import {
  EntryTable,
  SetTimeDialog,
  getEntries,
  getLeaderboard,
} from "@/features/leaderboards";
import { Button } from "@/shared/ui";

type LeaderboardDetailViewProps = {
  leaderboardId: string;
  user: AuthUser | null;
};

export async function LeaderboardDetailView({
  leaderboardId,
  user,
}: LeaderboardDetailViewProps) {
  const leaderboard = await getLeaderboard(leaderboardId);
  if (!leaderboard) notFound();

  const entries = await getEntries(leaderboardId);
  const cars = user ? await getCars(user.id) : [];

  const enteredCarIds = new Set(
    entries
      .filter((entry) => entry.driverId === user?.id)
      .map((entry) => entry.carId),
  );
  const eligibleCars = cars.filter((car) => !enteredCarIds.has(car.id));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-accent-700 uppercase">
            <MapPin className="h-3 w-3" />
            {leaderboard.trackName}
          </div>
          <h1 className="font-heading text-2xl font-extrabold">
            {leaderboard.title}
          </h1>
        </div>

        {user ? (
          eligibleCars.length > 0 ? (
            <SetTimeDialog
              leaderboardId={leaderboard.id}
              cars={eligibleCars}
            />
          ) : (
            <p className="text-sm text-foreground/60">
              {cars.length === 0
                ? "Add a car in My Garage to set a time."
                : "All your cars already have a time here."}
            </p>
          )
        ) : (
          <Button href="/login" variant="secondary">
            Log in to set a time
          </Button>
        )}
      </div>

      <EntryTable
        entries={entries}
        currentUserId={user?.id ?? null}
        currentUserRole={user?.role ?? null}
      />
    </main>
  );
}
```

- [ ] **Step 2: Write the view's public API**

Create `src/views/leaderboard-detail/index.ts`:

```ts
export { LeaderboardDetailView } from "./ui/leaderboard-detail-view";
export { getLeaderboard } from "@/features/leaderboards";
export { getCurrentUser } from "@/features/auth";
```

- [ ] **Step 3: Write the route**

Create `src/app/leaderboards/[id]/page.tsx`:

```tsx
import type { Metadata } from "next";
import {
  getCurrentUser,
  getLeaderboard,
  LeaderboardDetailView,
} from "@/views/leaderboard-detail";

type LeaderboardPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: LeaderboardPageProps): Promise<Metadata> {
  const { id } = await params;
  const leaderboard = await getLeaderboard(id);
  if (!leaderboard) return {};

  return {
    title: leaderboard.title,
    description: `${leaderboard.title} leaderboard for ${leaderboard.trackName} on Tracks Inc.`,
  };
}

export default async function LeaderboardPage({
  params,
}: LeaderboardPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  return <LeaderboardDetailView leaderboardId={id} user={user} />;
}
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 5: Manual smoke check**

Run: `pnpm dev`, then in a browser: sign up, add a car in `/my-garage`, have an admin account create a track + leaderboard (or seed one via `npx prisma studio`), visit `/leaderboards`, click "View full leaderboard" on a card, confirm it lands on `/leaderboards/[id]` and shows the "Set a time" control. Set a time, confirm it appears ranked with car spec tags; open a different browser/incognito window logged out and confirm the same entry (including car spec) is visible with no "Set a time" control.
Expected: works as described, no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/views/leaderboard-detail src/app/leaderboards
git commit -m "feat: add leaderboard detail page"
```

---

### Task 8: Playwright E2E suite

**Files:**

- Create: `tests/leaderboard-entries.spec.ts`

**Interfaces:**

- Consumes: the full stack from Tasks 1–7. Reuses the `login`/`signUp`/`createAdmin` helper shapes already established in `tests/admin-leaderboards.spec.ts` and `tests/garage.spec.ts`.

- [ ] **Step 1: Write the suite**

Create `tests/leaderboard-entries.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL,
});

async function createAdmin(email: string) {
  return prisma.user.create({
    data: {
      name: "Site Admin",
      email,
      passwordHash: await bcrypt.hash("password123", 12),
      role: "ADMIN",
    },
  });
}

async function signUp(page: Page, email: string, name = "Driver") {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/");
}

async function addCar(page: Page, model = "Supra") {
  await page.goto("/my-garage");
  await page.getByRole("button", { name: "Add car" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Make").fill("Toyota");
  await dialog.getByLabel("Model").fill(model);
  await dialog.getByLabel("Year").fill("2023");
  await dialog.getByLabel("Horsepower").fill("382");
  await dialog.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByText(`2023 Toyota ${model}`, { exact: true })).toBeVisible();
}

async function seedLeaderboard() {
  const track = await prisma.track.create({
    data: {
      name: "Spa-Francorchamps",
      country: "Belgium",
      length: 7000,
      corners: 20,
      elevation: 100,
    },
  });
  return prisma.leaderboard.create({
    data: { title: "Fastest overall", trackId: track.id },
  });
}

test.beforeEach(async () => {
  await prisma.leaderboardEntry.deleteMany();
  await prisma.leaderboard.deleteMany();
  await prisma.track.deleteMany();
  await prisma.car.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("a user sets a time with a garage car and it appears ranked on the leaderboard", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver1@example.com");
  await addCar(page);

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await page.getByRole("button", { name: "Set a time" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("18");
  await dialog.getByLabel("Millis").fill("760");
  await dialog.getByRole("button", { name: "Set time" }).click();

  await expect(page.getByText("2:18.760")).toBeVisible();
  await expect(page.getByText("2023 Toyota Supra")).toBeVisible();
  await expect(page.getByText("382 hp")).toBeVisible();
});

test("a user cannot set two times with the same car on the same leaderboard", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver2@example.com");
  await addCar(page);

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await page.getByRole("button", { name: "Set a time" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("18");
  await dialog.getByLabel("Millis").fill("760");
  await dialog.getByRole("button", { name: "Set time" }).click();
  await expect(page.getByText("2:18.760")).toBeVisible();

  await expect(
    page.getByText("All your cars already have a time here."),
  ).toBeVisible();

  const entryCount = await prisma.leaderboardEntry.count();
  expect(entryCount).toBe(1);
});

test("a user sets times with two different cars and both are ranked correctly", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver3@example.com");
  await addCar(page, "Supra");
  await addCar(page, "GR86");

  await page.goto(`/leaderboards/${leaderboard.id}`);

  await page.getByRole("button", { name: "Set a time" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Car").selectOption({ label: "2023 Toyota Supra" });
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("20");
  await dialog.getByLabel("Millis").fill("000");
  await dialog.getByRole("button", { name: "Set time" }).click();
  await expect(page.getByText("2:20.000")).toBeVisible();

  await page.getByRole("button", { name: "Set a time" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Car").selectOption({ label: "2023 Toyota GR86" });
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("15");
  await dialog.getByLabel("Millis").fill("000");
  await dialog.getByRole("button", { name: "Set time" }).click();
  await expect(page.getByText("2:15.000")).toBeVisible();

  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("2:15.000");
  await expect(rows.nth(0)).toContainText("GR86");
  await expect(rows.nth(1)).toContainText("2:20.000");
  await expect(rows.nth(1)).toContainText("Supra");
});

test("a user removes their own entry after confirming", async ({ page }) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver4@example.com");
  await addCar(page);

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await page.getByRole("button", { name: "Set a time" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("18");
  await dialog.getByLabel("Millis").fill("760");
  await dialog.getByRole("button", { name: "Set time" }).click();
  await expect(page.getByText("2:18.760")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(page.getByText("2:18.760")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("2:18.760")).toHaveCount(0);
  await expect(
    page.getByText("No times set yet — be the first."),
  ).toBeVisible();
});

test("editing or deleting the car afterward does not change the entry's displayed snapshot", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver5@example.com");
  await addCar(page);

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await page.getByRole("button", { name: "Set a time" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minutes").fill("2");
  await dialog.getByLabel("Seconds").fill("18");
  await dialog.getByLabel("Millis").fill("760");
  await dialog.getByRole("button", { name: "Set time" }).click();
  await expect(page.getByText("382 hp")).toBeVisible();

  await page.goto("/my-garage");
  await page.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Horsepower").fill("999");
  await editDialog.getByRole("button", { name: "Save" }).click();

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await expect(page.getByText("382 hp")).toBeVisible();
  await expect(page.getByText("999 hp")).toHaveCount(0);

  await page.goto("/my-garage");
  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("2023 Toyota Supra")).toHaveCount(0);

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await expect(page.getByText("2:18.760")).toBeVisible();
  await expect(page.getByText("382 hp")).toBeVisible();
});

test("a logged-out visitor sees full entry details and no set-time control", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  const owner = await prisma.user.create({
    data: {
      name: "Owner",
      email: "owner@example.com",
      passwordHash: await bcrypt.hash("password123", 12),
    },
  });
  const car = await prisma.car.create({
    data: {
      make: "Toyota",
      model: "Supra",
      year: 2023,
      horsepower: 382,
      drivetrain: "RWD",
      transmission: "AUTOMATIC",
      notes: "Track-prepped",
      ownerId: owner.id,
    },
  });
  await prisma.leaderboardEntry.create({
    data: {
      leaderboardId: leaderboard.id,
      driverId: owner.id,
      carId: car.id,
      timeMs: 138760,
      carMake: car.make,
      carModel: car.model,
      carYear: car.year,
      carHorsepower: car.horsepower,
      carDrivetrain: car.drivetrain,
      carTransmission: car.transmission,
      carNickname: car.nickname,
      carNotes: car.notes,
    },
  });

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await expect(page.getByText("Owner")).toBeVisible();
  await expect(page.getByText("2023 Toyota Supra")).toBeVisible();
  await expect(page.getByText("382 hp")).toBeVisible();
  await expect(page.getByText("2:18.760")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Set a time" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Log in to set a time" }),
  ).toBeVisible();
});

test("a logged-in user with no cars sees a prompt instead of the set-time control", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  await signUp(page, "driver6@example.com");

  await page.goto(`/leaderboards/${leaderboard.id}`);
  await expect(
    page.getByText("Add a car in My Garage to set a time."),
  ).toBeVisible();
});

test("a user cannot delete another user's entry, but an admin can", async ({
  page,
}) => {
  const leaderboard = await seedLeaderboard();
  const owner = await prisma.user.create({
    data: {
      name: "Owner",
      email: "owner2@example.com",
      passwordHash: await bcrypt.hash("password123", 12),
    },
  });
  const car = await prisma.car.create({
    data: {
      make: "Toyota",
      model: "Supra",
      year: 2023,
      horsepower: 382,
      drivetrain: "RWD",
      transmission: "AUTOMATIC",
      ownerId: owner.id,
    },
  });
  await prisma.leaderboardEntry.create({
    data: {
      leaderboardId: leaderboard.id,
      driverId: owner.id,
      carId: car.id,
      timeMs: 138760,
      carMake: car.make,
      carModel: car.model,
      carYear: car.year,
      carHorsepower: car.horsepower,
      carDrivetrain: car.drivetrain,
      carTransmission: car.transmission,
    },
  });

  await signUp(page, "bystander@example.com");
  await page.goto(`/leaderboards/${leaderboard.id}`);
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);

  const admin = await createAdmin("admin@example.com");
  await login(page, admin.email);
  await page.goto(`/leaderboards/${leaderboard.id}`);
  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("2:18.760")).toHaveCount(0);
});
```

- [ ] **Step 2: Run the suite**

Run: `pnpm test:e2e tests/leaderboard-entries.spec.ts`
Expected: all tests pass.

- [ ] **Step 3: Run the full suite together**

Run: `pnpm test:e2e`
Expected: all tests pass (auth, garage, admin-tracks, admin-leaderboards, leaderboard-entries).

- [ ] **Step 4: Commit**

```bash
git add tests/leaderboard-entries.spec.ts
git commit -m "test: add Playwright E2E suite for leaderboard track times"
```

---
