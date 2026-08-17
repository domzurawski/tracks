# Tracks & Leaderboards CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins can create, edit, and delete tracks and per-track leaderboards from a new `/admin` section; regular users browse them read-only on new public `/tracks` and `/leaderboards` pages and on the homepage.

**Architecture:** Two existing feature slices (`features/tracks`, `features/leaderboards`) each gain a `Track`/`Leaderboard` Prisma model, a Zod schema, a DAL, three admin-only server actions, and admin CRUD UI (built on the existing `shared/ui/dialog` from the garage feature). The two features stay decoupled — the leaderboard form's track picker is wired up at the `views` layer (`views/admin-leaderboards` fetches from both `features/tracks` and `features/leaderboards` and passes data down), never via a feature-to-feature import. A new `requireAdmin()` helper in `shared/lib/session.ts` guards all `/admin*` routes with a 404 for non-admins. The homepage's `TracksSection`/`LeaderboardsSection` switch from mock data to these same DAL calls, and get reused as-is on the new public pages.

**Tech Stack:** Next.js (App Router, Server Actions), Prisma/Postgres, Zod, React Hook Form, Tailwind, Playwright.

**Spec:** `docs/superpowers/specs/0004-tracks-leaderboards-crud-design.md`

## Global Constraints

- Follow `AGENTS.md`'s layer rules exactly: `app → views/layout → features → shared`, enforced by `eslint-plugin-boundaries` — `app` may only import `views`/`layout`; `features` may only import `shared`, never another feature. The `Track`-list-for-a-`Leaderboard`-form dependency is resolved in `views`, not by bending this rule.
- All new files under `src/` are kebab-case (`unicorn/filename-case`).
- Server Components by default; `"use client"` only on the smallest leaf that needs it (form inputs, dialog open/close state, delete confirmation state).
- No new npm dependencies — track pickers use a native `<select>`, same as `CarFormDialog`'s drivetrain/transmission fields.
- `Track` required fields: `name` (unique), `country`, `length` (meters, `Int`), `corners`, `elevation` (meters, `Int`). `Leaderboard` required fields: `title`, `trackId`; `(trackId, title)` is unique.
- Every mutation (`create/update/deleteTrack`, `create/update/deleteLeaderboard`) re-derives the user from `getCurrentUser()` server-side and checks `role === "ADMIN"` — never trust the client, and never trust that the UI already hid the controls. Non-admin/logged-out → `{ rootError: "Not authorized" }`.
- `updateTrack`/`deleteTrack` revalidate `/`, `/tracks`, `/admin/tracks`, `/leaderboards`, `/admin/leaderboards` (a track's name is displayed on leaderboard cards). `createTrack` only needs `/`, `/tracks`, `/admin/tracks` (a brand-new track has no leaderboards yet). All leaderboard mutations revalidate `/`, `/leaderboards`, `/admin/leaderboards`.
- `/admin`, `/admin/tracks`, `/admin/leaderboards` are guarded by `requireAdmin()` (`shared/lib/session.ts`), which calls Next's `notFound()` for a logged-out or non-admin visitor — the route must 404, not redirect or show an access-denied page.
- This repo has no unit-testing framework (no Vitest/RTL) — following the precedent set by auth and garage, behavioral verification is Playwright E2E only. Verify each non-final task with `pnpm lint` and `npx tsc --noEmit`; the final two tasks add the Playwright suites covering the full CRUD + guard flows.
- The root layout (`src/app/layout.tsx`) sets `title.template: "%s · Tracks Inc."` — every new `page.tsx`'s `metadata.title` is a short string (e.g. `"Tracks"`), not the full `"Tracks · Tracks Inc."`; the template appends the suffix automatically. Only set `title`/`description` on each page's metadata, matching the existing `my-garage/page.tsx` precedent (no per-page `openGraph` override — the root layout's default covers it).

---

## File Structure

**New:**

- `shared/lib/session.ts` — adds `requireAdmin()` (modifies existing file, see Global Constraints).
- `features/tracks/model/schema.ts` — `trackSchema` (Zod).
- `features/tracks/model/tracks.ts` — `getTracks` (DAL).
- `features/tracks/model/actions.ts` — `createTrack`, `updateTrack`, `deleteTrack` (`"use server"`).
- `features/tracks/ui/admin/track-form-dialog.tsx` — add/edit modal (`"use client"`).
- `features/tracks/ui/admin/delete-track-button.tsx` — delete trigger + confirm modal (`"use client"`).
- `features/tracks/ui/admin/track-admin-row.tsx` — single track admin row (Server Component).
- `features/tracks/ui/admin/track-admin-list.tsx` — admin list + empty state (Server Component).
- `features/leaderboards/model/schema.ts` — `leaderboardSchema` (Zod).
- `features/leaderboards/model/leaderboards.ts` — `getLeaderboards` (DAL).
- `features/leaderboards/model/actions.ts` — `createLeaderboard`, `updateLeaderboard`, `deleteLeaderboard` (`"use server"`).
- `features/leaderboards/ui/admin/leaderboard-form-dialog.tsx` — add/edit modal, takes a `tracks` prop (`"use client"`).
- `features/leaderboards/ui/admin/delete-leaderboard-button.tsx` — delete trigger + confirm modal (`"use client"`).
- `features/leaderboards/ui/admin/leaderboard-admin-row.tsx` — single leaderboard admin row (Server Component).
- `features/leaderboards/ui/admin/leaderboard-admin-list.tsx` — admin list + empty state (Server Component).
- `views/admin/ui/admin-view.tsx` + `views/admin/index.ts` — admin landing page.
- `views/admin-tracks/ui/admin-tracks-view.tsx` + `views/admin-tracks/index.ts`.
- `views/admin-leaderboards/ui/admin-leaderboards-view.tsx` + `views/admin-leaderboards/index.ts`.
- `views/tracks/ui/tracks-view.tsx` + `views/tracks/index.ts` — public `/tracks` page.
- `views/leaderboards/ui/leaderboards-view.tsx` + `views/leaderboards/index.ts` — public `/leaderboards` page.
- `app/admin/page.tsx`, `app/admin/tracks/page.tsx`, `app/admin/leaderboards/page.tsx`, `app/tracks/page.tsx`, `app/leaderboards/page.tsx`.
- `tests/admin-tracks.spec.ts`, `tests/admin-leaderboards.spec.ts` — Playwright E2E suites.

**Modified:**

- `prisma/schema.prisma` — add `Track`, `Leaderboard` models.
- `features/tracks/model/types.ts` — `Track` gains `id`; `length`/`elevation` become `number`.
- `features/tracks/ui/track-card.tsx` — format numeric `length`/`elevation` for display.
- `features/tracks/ui/tracks-section.tsx` — becomes `async`, calls `getTracks()` instead of importing mock.
- `features/tracks/model/mock.ts` — deleted.
- `features/tracks/index.ts` — export `Track`, `getTracks`, `TrackFormDialog`, `TrackAdminList`.
- `features/leaderboards/model/types.ts` — `Leaderboard` drops `podium`/`PodiumEntry`, gains `id`, `trackId`, `trackName`.
- `features/leaderboards/ui/leaderboard-card.tsx` — drops podium rendering.
- `features/leaderboards/ui/leaderboards-section.tsx` — becomes `async`, calls `getLeaderboards()` instead of importing mock.
- `features/leaderboards/model/mock.ts` — deleted.
- `features/leaderboards/index.ts` — export `Leaderboard`, `getLeaderboards`, `LeaderboardFormDialog`, `LeaderboardAdminList`.
- `layout/site-nav/ui/site-nav.tsx` — shows an "Admin" link when `user.role === "ADMIN"` (desktop + mobile menus).

---

### Task 1: Prisma schema — `Track` and `Leaderboard` models

**Files:**

- Modify: `prisma/schema.prisma`

**Interfaces:**

- Produces: `Track` Prisma model (`id, name, country, length, corners, elevation, createdAt, leaderboards`); `Leaderboard` Prisma model (`id, title, trackId, track, createdAt`, `@@unique([trackId, title])`).

- [ ] **Step 1: Add the models to `prisma/schema.prisma`**

Add after the existing `Car` model:

```prisma
model Track {
  id           String        @id @default(cuid())
  name         String        @unique
  country      String
  length       Int
  corners      Int
  elevation    Int
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

- [ ] **Step 2: Run the dev migration**

Run: `npx prisma migrate dev --name add_track_and_leaderboard`
Expected: `Your database is now in sync with your schema.` and a new folder under `prisma/migrations/` containing the `Track`/`Leaderboard` table creation.

- [ ] **Step 3: Apply the same migration to the test database**

Run:

```bash
set -a; source .env; set +a
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
```

Expected: `All migrations have been successfully applied.`

- [ ] **Step 4: Verify the Prisma client compiles against the new schema**

Run: `npx tsc --noEmit`
Expected: no errors (nothing consumes `Track`/`Leaderboard` yet, this just confirms `prisma generate`, which `migrate dev` already ran, produced valid types).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Track and Leaderboard models to schema"
```

---

### Task 2: `requireAdmin()` in `shared/lib/session.ts`

**Files:**

- Modify: `src/shared/lib/session.ts`

**Interfaces:**

- Consumes: `getCurrentUser(): Promise<AuthUser | null>` (already in this file).
- Produces: `requireAdmin(): Promise<AuthUser>` — resolves to the current user if they're an admin; otherwise calls Next's `notFound()` (which throws), so callers can treat the return as always-non-null.

- [ ] **Step 1: Add the `notFound` import and `requireAdmin` function**

In `src/shared/lib/session.ts`, add to the top imports:

```ts
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
```

Add after `getCurrentUser`:

```ts
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    notFound();
  }
  return user;
}
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors. (`notFound()` is typed to return `never`, so TypeScript narrows `user` to non-null after the `if` block.)

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/session.ts
git commit -m "feat: add requireAdmin session guard"
```

---

### Task 3: Tracks domain layer — types, schema, DAL

**Files:**

- Modify: `src/features/tracks/model/types.ts`
- Create: `src/features/tracks/model/schema.ts`
- Create: `src/features/tracks/model/tracks.ts`

**Interfaces:**

- Produces: `Track` type (`{ id: string; name: string; country: string; length: number; corners: number; elevation: number }`); `trackSchema` (Zod) and `TrackInput` type; `getTracks(): Promise<Track[]>`.

- [ ] **Step 1: Update `Track` type**

Replace the contents of `src/features/tracks/model/types.ts`:

```ts
export type Track = {
  id: string;
  name: string;
  country: string;
  length: number;
  corners: number;
  elevation: number;
};
```

- [ ] **Step 2: Add `trackSchema`**

Create `src/features/tracks/model/schema.ts`:

```ts
import { z } from "zod";

export const trackSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  country: z.string().trim().min(1, "Country is required"),
  length: z.coerce.number().int().positive("Length must be greater than 0"),
  corners: z.coerce.number().int().positive("Corners must be greater than 0"),
  elevation: z.coerce
    .number()
    .int()
    .positive("Elevation must be greater than 0"),
});

export type TrackInput = z.infer<typeof trackSchema>;
```

- [ ] **Step 3: Add `getTracks` DAL function**

Create `src/features/tracks/model/tracks.ts`:

```ts
import "server-only";
import { prisma } from "@/shared/lib/prisma";
import type { Track } from "./types";

export async function getTracks(): Promise<Track[]> {
  return prisma.track.findMany({ orderBy: { name: "asc" } });
}
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: a type error in `src/features/tracks/model/mock.ts` — its `mockTracks` literals are missing the new required `id` field and still assign `length`/`elevation` as strings, both invalid against the updated `Track` type. This is expected until `mock.ts` is deleted in Task 6; do not fix it here. If any other file fails, stop and investigate.

- [ ] **Step 5: Commit**

```bash
git add src/features/tracks/model/types.ts src/features/tracks/model/schema.ts src/features/tracks/model/tracks.ts
git commit -m "feat: add tracks domain types, schema, and DAL"
```

---

### Task 4: Tracks server actions

**Files:**

- Create: `src/features/tracks/model/actions.ts`

**Interfaces:**

- Consumes: `trackSchema`, `TrackInput` (Task 3); `getCurrentUser` (`@/shared/lib/session`); `prisma` (`@/shared/lib/prisma`).
- Produces: `createTrack(input: TrackInput): Promise<TrackActionResult>`, `updateTrack(id: string, input: TrackInput): Promise<TrackActionResult>`, `deleteTrack(id: string): Promise<{ rootError?: string } | void>`, where `TrackActionResult = { fieldErrors?: Partial<Record<keyof TrackInput, string>>; rootError?: string } | void`.

- [ ] **Step 1: Write the actions**

Create `src/features/tracks/model/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/shared/lib/session";
import { trackSchema } from "./schema";
import type { TrackInput } from "./schema";

type TrackActionResult = {
  fieldErrors?: Partial<Record<keyof TrackInput, string>>;
  rootError?: string;
} | void;

function revalidateTrackPaths() {
  revalidatePath("/");
  revalidatePath("/tracks");
  revalidatePath("/admin/tracks");
}

function revalidateLeaderboardPaths() {
  revalidatePath("/leaderboards");
  revalidatePath("/admin/leaderboards");
}

export async function createTrack(
  input: TrackInput,
): Promise<TrackActionResult> {
  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.track.create({ data: parsed.data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        fieldErrors: { name: "A track with this name already exists" },
      };
    }
    throw error;
  }

  revalidateTrackPaths();
}

export async function updateTrack(
  id: string,
  input: TrackInput,
): Promise<TrackActionResult> {
  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.track.update({ where: { id }, data: parsed.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          fieldErrors: { name: "A track with this name already exists" },
        };
      }
      if (error.code === "P2025") {
        return { rootError: "Track not found" };
      }
    }
    throw error;
  }

  revalidateTrackPaths();
  revalidateLeaderboardPaths();
}

export async function deleteTrack(
  id: string,
): Promise<{ rootError?: string } | void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.track.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { rootError: "Track not found" };
    }
    throw error;
  }

  revalidateTrackPaths();
  revalidateLeaderboardPaths();
}
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/tracks/model/actions.ts
git commit -m "feat: add track server actions"
```

---

### Task 5: Tracks admin UI

**Files:**

- Create: `src/features/tracks/ui/admin/track-form-dialog.tsx`
- Create: `src/features/tracks/ui/admin/delete-track-button.tsx`
- Create: `src/features/tracks/ui/admin/track-admin-row.tsx`
- Create: `src/features/tracks/ui/admin/track-admin-list.tsx`

**Interfaces:**

- Consumes: `createTrack`, `updateTrack`, `deleteTrack` (Task 4); `trackSchema`, `TrackInput` (Task 3); `Track` (Task 3); `Button`, `Dialog` (`@/shared/ui`).
- Produces: `TrackFormDialog(props: { mode: "create" } | { mode: "edit"; track: Track })`; `DeleteTrackButton(props: { trackId: string; trackName: string })`; `TrackAdminRow(props: { track: Track })`; `TrackAdminList(props: { tracks: Track[] })`.

- [ ] **Step 1: Add/edit form dialog**

Create `src/features/tracks/ui/admin/track-form-dialog.tsx`:

```tsx
"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { createTrack, updateTrack } from "../../model/actions";
import { trackSchema } from "../../model/schema";
import type { TrackInput } from "../../model/schema";
import type { Track } from "../../model/types";

type TrackFormDialogProps = { mode: "create" } | { mode: "edit"; track: Track };

const inputClasses =
  "border border-divider bg-background px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2";

function defaultValues(props: TrackFormDialogProps): TrackInput {
  if (props.mode === "edit") {
    return {
      name: props.track.name,
      country: props.track.country,
      length: props.track.length,
      corners: props.track.corners,
      elevation: props.track.elevation,
    };
  }

  return { name: "", country: "", length: 0, corners: 0, elevation: 0 };
}

export function TrackFormDialog(props: TrackFormDialogProps) {
  const uid = useId();
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrackInput>({
    resolver: zodResolver(trackSchema) as Resolver<TrackInput>,
    defaultValues: defaultValues(props),
  });

  const onSubmit = handleSubmit(async (data) => {
    const result =
      props.mode === "edit"
        ? await updateTrack(props.track.id, data)
        : await createTrack(data);

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
        variant={props.mode === "edit" ? "secondary" : "primary"}
        onClick={() => {
          reset(defaultValues(props));
          setIsOpen(true);
        }}
      >
        {props.mode === "edit" ? (
          <>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            Add track
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex w-80 flex-col gap-4"
        >
          <h2 className="font-heading text-lg font-extrabold">
            {props.mode === "edit" ? "Edit track" : "Add a track"}
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-name`} className="text-sm font-semibold">
              Name
            </label>
            <input
              id={`${uid}-name`}
              className={inputClasses}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-accent-600">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-country`} className="text-sm font-semibold">
              Country
            </label>
            <input
              id={`${uid}-country`}
              className={inputClasses}
              {...register("country")}
            />
            {errors.country && (
              <p className="text-sm text-accent-600">
                {errors.country.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-length`} className="text-sm font-semibold">
              Length (meters)
            </label>
            <input
              id={`${uid}-length`}
              type="number"
              className={inputClasses}
              {...register("length", { valueAsNumber: true })}
            />
            {errors.length && (
              <p className="text-sm text-accent-600">{errors.length.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-corners`} className="text-sm font-semibold">
              Corners
            </label>
            <input
              id={`${uid}-corners`}
              type="number"
              className={inputClasses}
              {...register("corners", { valueAsNumber: true })}
            />
            {errors.corners && (
              <p className="text-sm text-accent-600">
                {errors.corners.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${uid}-elevation`}
              className="text-sm font-semibold"
            >
              Elevation (meters)
            </label>
            <input
              id={`${uid}-elevation`}
              type="number"
              className={inputClasses}
              {...register("elevation", { valueAsNumber: true })}
            />
            {errors.elevation && (
              <p className="text-sm text-accent-600">
                {errors.elevation.message}
              </p>
            )}
          </div>

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
              {props.mode === "edit" ? "Save" : "Add track"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Delete button with confirmation**

Create `src/features/tracks/ui/admin/delete-track-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { deleteTrack } from "../../model/actions";

type DeleteTrackButtonProps = {
  trackId: string;
  trackName: string;
};

export function DeleteTrackButton({
  trackId,
  trackName,
}: DeleteTrackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteTrack(trackId);
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
          <p className="text-sm font-semibold">
            Remove {trackName}? This also removes its leaderboards.
          </p>
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

- [ ] **Step 3: Admin row and list**

Create `src/features/tracks/ui/admin/track-admin-row.tsx`:

```tsx
import { Tag } from "@/shared/ui";
import { TrackFormDialog } from "./track-form-dialog";
import { DeleteTrackButton } from "./delete-track-button";
import type { Track } from "../../model/types";

export function TrackAdminRow({ track }: { track: Track }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-divider p-5">
      <div className="flex flex-col gap-1.5">
        <span className="font-heading text-lg font-extrabold">
          {track.name}
        </span>
        <span className="text-sm text-foreground/60">{track.country}</span>
        <div className="flex flex-wrap gap-2">
          <Tag variant="neutral">{(track.length / 1000).toFixed(1)} km</Tag>
          <Tag variant="neutral">{track.corners} corners</Tag>
          <Tag variant="neutral">{track.elevation}m elevation</Tag>
        </div>
      </div>
      <div className="flex gap-2.5">
        <TrackFormDialog mode="edit" track={track} />
        <DeleteTrackButton trackId={track.id} trackName={track.name} />
      </div>
    </div>
  );
}
```

Create `src/features/tracks/ui/admin/track-admin-list.tsx`:

```tsx
import { TrackAdminRow } from "./track-admin-row";
import type { Track } from "../../model/types";

export function TrackAdminList({ tracks }: { tracks: Track[] }) {
  if (tracks.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        No tracks yet — add the first one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tracks.map((track) => (
        <TrackAdminRow key={track.id} track={track} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/tracks/ui/admin
git commit -m "feat: add track admin UI"
```

---

### Task 6: Tracks public UI — DB-backed, drop mock

**Files:**

- Modify: `src/features/tracks/ui/track-card.tsx`
- Modify: `src/features/tracks/ui/tracks-section.tsx`
- Delete: `src/features/tracks/model/mock.ts`
- Modify: `src/features/tracks/index.ts`

**Interfaces:**

- Consumes: `getTracks` (Task 3), `Track` (Task 3), `TrackFormDialog`/`TrackAdminList` (Task 5).
- Produces: `TracksSection` (async Server Component, no props) — public API unchanged in shape, now DB-backed. `features/tracks` public API additionally exports `Track`, `getTracks`, `TrackFormDialog`, `TrackAdminList`.

- [ ] **Step 1: Format numeric length/elevation in `TrackCard`**

Replace `src/features/tracks/ui/track-card.tsx`:

```tsx
import { ArrowRight, Mountain, Ruler } from "lucide-react";
import { Button, Tag } from "@/shared/ui";
import type { Track } from "../model/types";

function formatLength(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatElevation(meters: number): string {
  return `${meters}m`;
}

export function TrackCard({ track }: { track: Track }) {
  return (
    <div className="flex flex-col gap-3.5 border border-divider bg-background p-6">
      <div className="flex h-[180px] items-center justify-center bg-neutral-200" />
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-extrabold">{track.name}</h3>
        <p className="text-sm text-foreground/60">
          {track.country} · {formatLength(track.length)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Tag>
          <Ruler className="h-3 w-3" />
          {track.corners} corners
        </Tag>
        <Tag>
          <Mountain className="h-3 w-3" />
          {formatElevation(track.elevation)} elevation
        </Tag>
      </div>
      <Button href="/leaderboards" variant="ghost" className="mt-0.5">
        See leaderboards
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Make `TracksSection` DB-backed**

Replace `src/features/tracks/ui/tracks-section.tsx`:

```tsx
import { getTracks } from "../model/tracks";
import { TrackCard } from "./track-card";

export async function TracksSection() {
  const tracks = await getTracks();

  return (
    <section className="flex flex-col gap-7 py-14">
      <div className="flex items-baseline justify-between border-b-2 border-divider pb-4">
        <h2 className="font-heading text-3xl font-extrabold">Tracks</h2>
        <span className="text-sm text-foreground/60">
          {tracks.length} circuits
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track) => (
          <TrackCard key={track.id} track={track} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Delete the mock file**

```bash
git rm src/features/tracks/model/mock.ts
```

- [ ] **Step 4: Update the public API**

Replace `src/features/tracks/index.ts`:

```ts
export { TracksSection } from "./ui/tracks-section";
export { TrackFormDialog } from "./ui/admin/track-form-dialog";
export { TrackAdminList } from "./ui/admin/track-admin-list";
export { getTracks } from "./model/tracks";
export type { Track } from "./model/types";
```

- [ ] **Step 5: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/tracks
git commit -m "feat: wire tracks feature to the database"
```

---

### Task 7: Leaderboards domain layer — types, schema, DAL

**Files:**

- Modify: `src/features/leaderboards/model/types.ts`
- Create: `src/features/leaderboards/model/schema.ts`
- Create: `src/features/leaderboards/model/leaderboards.ts`

**Interfaces:**

- Produces: `Leaderboard` type (`{ id: string; title: string; trackId: string; trackName: string }`); `leaderboardSchema` (Zod) and `LeaderboardInput` type; `getLeaderboards(): Promise<Leaderboard[]>`.

- [ ] **Step 1: Replace `Leaderboard`/`PodiumEntry` types**

Replace the contents of `src/features/leaderboards/model/types.ts`:

```ts
export type Leaderboard = {
  id: string;
  title: string;
  trackId: string;
  trackName: string;
};
```

- [ ] **Step 2: Add `leaderboardSchema`**

Create `src/features/leaderboards/model/schema.ts`:

```ts
import { z } from "zod";

export const leaderboardSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  trackId: z.string().trim().min(1, "Select a track"),
});

export type LeaderboardInput = z.infer<typeof leaderboardSchema>;
```

- [ ] **Step 3: Add `getLeaderboards` DAL function**

Create `src/features/leaderboards/model/leaderboards.ts`:

```ts
import "server-only";
import { prisma } from "@/shared/lib/prisma";
import type { Leaderboard } from "./types";

export async function getLeaderboards(): Promise<Leaderboard[]> {
  const leaderboards = await prisma.leaderboard.findMany({
    orderBy: { createdAt: "desc" },
    include: { track: { select: { name: true } } },
  });

  return leaderboards.map((leaderboard) => ({
    id: leaderboard.id,
    title: leaderboard.title,
    trackId: leaderboard.trackId,
    trackName: leaderboard.track.name,
  }));
}
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: type errors in `src/features/leaderboards/model/mock.ts` (literals no longer match the updated `Leaderboard` type — missing `id`/`trackId`/`trackName`, still carry `podium`) and in `src/features/leaderboards/ui/leaderboard-card.tsx` (still reads `leaderboard.podium`, which no longer exists on the type). Both are expected until Task 10 fixes `leaderboard-card.tsx` and deletes `mock.ts` — do not fix them here. If any other file fails, stop and investigate.

- [ ] **Step 5: Commit**

```bash
git add src/features/leaderboards/model/types.ts src/features/leaderboards/model/schema.ts src/features/leaderboards/model/leaderboards.ts
git commit -m "feat: add leaderboards domain types, schema, and DAL"
```

---

### Task 8: Leaderboards server actions

**Files:**

- Create: `src/features/leaderboards/model/actions.ts`

**Interfaces:**

- Consumes: `leaderboardSchema`, `LeaderboardInput` (Task 7); `getCurrentUser` (`@/shared/lib/session`); `prisma` (`@/shared/lib/prisma`).
- Produces: `createLeaderboard(input: LeaderboardInput): Promise<LeaderboardActionResult>`, `updateLeaderboard(id: string, input: LeaderboardInput): Promise<LeaderboardActionResult>`, `deleteLeaderboard(id: string): Promise<{ rootError?: string } | void>`, where `LeaderboardActionResult = { fieldErrors?: Partial<Record<keyof LeaderboardInput, string>>; rootError?: string } | void`.

- [ ] **Step 1: Write the actions**

Create `src/features/leaderboards/model/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/shared/lib/session";
import { leaderboardSchema } from "./schema";
import type { LeaderboardInput } from "./schema";

type LeaderboardActionResult = {
  fieldErrors?: Partial<Record<keyof LeaderboardInput, string>>;
  rootError?: string;
} | void;

function revalidateLeaderboardPaths() {
  revalidatePath("/");
  revalidatePath("/leaderboards");
  revalidatePath("/admin/leaderboards");
}

export async function createLeaderboard(
  input: LeaderboardInput,
): Promise<LeaderboardActionResult> {
  const parsed = leaderboardSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.leaderboard.create({ data: parsed.data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        fieldErrors: {
          title: "This track already has a leaderboard with that title",
        },
      };
    }
    throw error;
  }

  revalidateLeaderboardPaths();
}

export async function updateLeaderboard(
  id: string,
  input: LeaderboardInput,
): Promise<LeaderboardActionResult> {
  const parsed = leaderboardSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.leaderboard.update({ where: { id }, data: parsed.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          fieldErrors: {
            title: "This track already has a leaderboard with that title",
          },
        };
      }
      if (error.code === "P2025") {
        return { rootError: "Leaderboard not found" };
      }
    }
    throw error;
  }

  revalidateLeaderboardPaths();
}

export async function deleteLeaderboard(
  id: string,
): Promise<{ rootError?: string } | void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { rootError: "Not authorized" };
  }

  try {
    await prisma.leaderboard.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { rootError: "Leaderboard not found" };
    }
    throw error;
  }

  revalidateLeaderboardPaths();
}
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no new errors (the pre-existing `mock.ts`/`leaderboard-card.tsx` failures from Task 7 remain until Task 10).

- [ ] **Step 3: Commit**

```bash
git add src/features/leaderboards/model/actions.ts
git commit -m "feat: add leaderboard server actions"
```

---

### Task 9: Leaderboards admin UI

**Files:**

- Create: `src/features/leaderboards/ui/admin/leaderboard-form-dialog.tsx`
- Create: `src/features/leaderboards/ui/admin/delete-leaderboard-button.tsx`
- Create: `src/features/leaderboards/ui/admin/leaderboard-admin-row.tsx`
- Create: `src/features/leaderboards/ui/admin/leaderboard-admin-list.tsx`

**Interfaces:**

- Consumes: `createLeaderboard`, `updateLeaderboard`, `deleteLeaderboard` (Task 8); `leaderboardSchema`, `LeaderboardInput` (Task 7); `Leaderboard` (Task 7); `Button`, `Dialog` (`@/shared/ui`).
- Produces: `type TrackOption = { id: string; name: string }`; `LeaderboardFormDialog(props: { mode: "create"; tracks: TrackOption[] } | { mode: "edit"; leaderboard: Leaderboard; tracks: TrackOption[] })`; `DeleteLeaderboardButton(props: { leaderboardId: string; leaderboardTitle: string })`; `LeaderboardAdminRow(props: { leaderboard: Leaderboard; tracks: TrackOption[] })`; `LeaderboardAdminList(props: { leaderboards: Leaderboard[]; tracks: TrackOption[] })`. `TrackOption` matches the plain `{ id, name }` shape the `views/admin-leaderboards` layer will derive from `features/tracks`' `Track` type in Task 11 — this is how the leaderboards feature learns about tracks without importing `features/tracks`.

- [ ] **Step 1: Add/edit form dialog with track picker**

Create `src/features/leaderboards/ui/admin/leaderboard-form-dialog.tsx`:

```tsx
"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { createLeaderboard, updateLeaderboard } from "../../model/actions";
import { leaderboardSchema } from "../../model/schema";
import type { LeaderboardInput } from "../../model/schema";
import type { Leaderboard } from "../../model/types";

export type TrackOption = { id: string; name: string };

type LeaderboardFormDialogProps =
  | { mode: "create"; tracks: TrackOption[] }
  | { mode: "edit"; leaderboard: Leaderboard; tracks: TrackOption[] };

const inputClasses =
  "border border-divider bg-background px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2";

function defaultValues(props: LeaderboardFormDialogProps): LeaderboardInput {
  if (props.mode === "edit") {
    return {
      title: props.leaderboard.title,
      trackId: props.leaderboard.trackId,
    };
  }

  return { title: "", trackId: props.tracks[0]?.id ?? "" };
}

export function LeaderboardFormDialog(props: LeaderboardFormDialogProps) {
  const uid = useId();
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaderboardInput>({
    resolver: zodResolver(leaderboardSchema) as Resolver<LeaderboardInput>,
    defaultValues: defaultValues(props),
  });

  const onSubmit = handleSubmit(async (data) => {
    const result =
      props.mode === "edit"
        ? await updateLeaderboard(props.leaderboard.id, data)
        : await createLeaderboard(data);

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
        variant={props.mode === "edit" ? "secondary" : "primary"}
        onClick={() => {
          reset(defaultValues(props));
          setIsOpen(true);
        }}
      >
        {props.mode === "edit" ? (
          <>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            Add leaderboard
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex w-80 flex-col gap-4"
        >
          <h2 className="font-heading text-lg font-extrabold">
            {props.mode === "edit" ? "Edit leaderboard" : "Add a leaderboard"}
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-title`} className="text-sm font-semibold">
              Title
            </label>
            <input
              id={`${uid}-title`}
              className={inputClasses}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-accent-600">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-trackId`} className="text-sm font-semibold">
              Track
            </label>
            <select
              id={`${uid}-trackId`}
              className={inputClasses}
              {...register("trackId")}
            >
              {props.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
            {errors.trackId && (
              <p className="text-sm text-accent-600">
                {errors.trackId.message}
              </p>
            )}
          </div>

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
              {props.mode === "edit" ? "Save" : "Add leaderboard"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Delete button with confirmation**

Create `src/features/leaderboards/ui/admin/delete-leaderboard-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { deleteLeaderboard } from "../../model/actions";

type DeleteLeaderboardButtonProps = {
  leaderboardId: string;
  leaderboardTitle: string;
};

export function DeleteLeaderboardButton({
  leaderboardId,
  leaderboardTitle,
}: DeleteLeaderboardButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteLeaderboard(leaderboardId);
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
          <p className="text-sm font-semibold">
            Remove &quot;{leaderboardTitle}&quot;?
          </p>
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

- [ ] **Step 3: Admin row and list**

Create `src/features/leaderboards/ui/admin/leaderboard-admin-row.tsx`:

```tsx
import { LeaderboardFormDialog } from "./leaderboard-form-dialog";
import type { TrackOption } from "./leaderboard-form-dialog";
import { DeleteLeaderboardButton } from "./delete-leaderboard-button";
import type { Leaderboard } from "../../model/types";

export function LeaderboardAdminRow({
  leaderboard,
  tracks,
}: {
  leaderboard: Leaderboard;
  tracks: TrackOption[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-divider p-5">
      <div className="flex flex-col gap-0.5">
        <span className="font-heading text-lg font-extrabold">
          {leaderboard.title}
        </span>
        <span className="text-sm text-foreground/60">
          {leaderboard.trackName}
        </span>
      </div>
      <div className="flex gap-2.5">
        <LeaderboardFormDialog
          mode="edit"
          leaderboard={leaderboard}
          tracks={tracks}
        />
        <DeleteLeaderboardButton
          leaderboardId={leaderboard.id}
          leaderboardTitle={leaderboard.title}
        />
      </div>
    </div>
  );
}
```

Create `src/features/leaderboards/ui/admin/leaderboard-admin-list.tsx`:

```tsx
import { LeaderboardAdminRow } from "./leaderboard-admin-row";
import type { TrackOption } from "./leaderboard-form-dialog";
import type { Leaderboard } from "../../model/types";

export function LeaderboardAdminList({
  leaderboards,
  tracks,
}: {
  leaderboards: Leaderboard[];
  tracks: TrackOption[];
}) {
  if (leaderboards.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        No leaderboards yet — add the first one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {leaderboards.map((leaderboard) => (
        <LeaderboardAdminRow
          key={leaderboard.id}
          leaderboard={leaderboard}
          tracks={tracks}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no new errors (pre-existing `mock.ts`/`leaderboard-card.tsx` failures from Task 7 remain until Task 10).

- [ ] **Step 5: Commit**

```bash
git add src/features/leaderboards/ui/admin
git commit -m "feat: add leaderboard admin UI"
```

---

### Task 10: Leaderboards public UI — DB-backed, drop mock

**Files:**

- Modify: `src/features/leaderboards/ui/leaderboard-card.tsx`
- Modify: `src/features/leaderboards/ui/leaderboards-section.tsx`
- Delete: `src/features/leaderboards/model/mock.ts`
- Modify: `src/features/leaderboards/index.ts`

**Interfaces:**

- Consumes: `getLeaderboards` (Task 7), `Leaderboard` (Task 7), `LeaderboardFormDialog`/`LeaderboardAdminList` (Task 9).
- Produces: `LeaderboardsSection` (async Server Component, no props) — public API unchanged in shape, now DB-backed. `features/leaderboards` public API additionally exports `Leaderboard`, `getLeaderboards`, `LeaderboardFormDialog`, `LeaderboardAdminList`.

- [ ] **Step 1: Drop podium rendering from `LeaderboardCard`**

Replace `src/features/leaderboards/ui/leaderboard-card.tsx`:

```tsx
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/shared/ui";
import type { Leaderboard } from "../model/types";

export function LeaderboardCard({ leaderboard }: { leaderboard: Leaderboard }) {
  return (
    <div className="flex flex-col gap-4 border border-divider bg-background p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-accent-700 uppercase">
          <MapPin className="h-3 w-3" />
          {leaderboard.trackName}
        </div>
        <h3 className="font-heading text-xl font-extrabold">
          {leaderboard.title}
        </h3>
      </div>
      <Button href="/leaderboards" variant="ghost" className="mt-1">
        View full leaderboard
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Make `LeaderboardsSection` DB-backed**

Replace `src/features/leaderboards/ui/leaderboards-section.tsx`:

```tsx
import { getLeaderboards } from "../model/leaderboards";
import { LeaderboardCard } from "./leaderboard-card";

export async function LeaderboardsSection() {
  const leaderboards = await getLeaderboards();

  return (
    <section className="flex flex-col gap-7 py-14">
      <div className="flex items-baseline justify-between border-b-2 border-divider pb-4">
        <h2 className="font-heading text-3xl font-extrabold">
          Hottest Leaderboards
        </h2>
        <span className="text-sm text-foreground/60">
          {leaderboards.length} active
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {leaderboards.map((leaderboard) => (
          <LeaderboardCard key={leaderboard.id} leaderboard={leaderboard} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Delete the mock file**

```bash
git rm src/features/leaderboards/model/mock.ts
```

- [ ] **Step 4: Update the public API**

Replace `src/features/leaderboards/index.ts`:

```ts
export { LeaderboardsSection } from "./ui/leaderboards-section";
export { LeaderboardFormDialog } from "./ui/admin/leaderboard-form-dialog";
export { LeaderboardAdminList } from "./ui/admin/leaderboard-admin-list";
export { getLeaderboards } from "./model/leaderboards";
export type { Leaderboard } from "./model/types";
```

- [ ] **Step 5: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/leaderboards
git commit -m "feat: wire leaderboards feature to the database"
```

---

### Task 11: Admin views and routes

**Files:**

- Create: `src/views/admin/ui/admin-view.tsx`, `src/views/admin/index.ts`
- Create: `src/views/admin-tracks/ui/admin-tracks-view.tsx`, `src/views/admin-tracks/index.ts`
- Create: `src/views/admin-leaderboards/ui/admin-leaderboards-view.tsx`, `src/views/admin-leaderboards/index.ts`
- Create: `src/app/admin/page.tsx`, `src/app/admin/tracks/page.tsx`, `src/app/admin/leaderboards/page.tsx`

**Interfaces:**

- Consumes: `requireAdmin` (`@/shared/lib/session`, Task 2); `getTracks`, `TrackFormDialog`, `TrackAdminList`, `Track` (`@/features/tracks`, Tasks 5–6); `getLeaderboards`, `LeaderboardFormDialog`, `LeaderboardAdminList` (`@/features/leaderboards`, Tasks 9–10).
- Produces: `AdminView()`, `AdminTracksView()`, `AdminLeaderboardsView()` (all async or sync Server Components, no props) — this is where the `Track[]` → `TrackOption[]` mapping for the leaderboard form happens, keeping `features/leaderboards` free of any `features/tracks` import.

- [ ] **Step 1: Admin landing page**

Create `src/views/admin/ui/admin-view.tsx`:

```tsx
import { Button } from "@/shared/ui";

export function AdminView() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-12">
      <h1 className="font-heading text-2xl font-extrabold">Admin</h1>
      <div className="flex flex-wrap gap-4">
        <Button href="/admin/tracks" variant="secondary">
          Manage tracks
        </Button>
        <Button href="/admin/leaderboards" variant="secondary">
          Manage leaderboards
        </Button>
      </div>
    </main>
  );
}
```

Create `src/views/admin/index.ts`:

```ts
export { AdminView } from "./ui/admin-view";
export { requireAdmin } from "@/shared/lib/session";
```

Create `src/app/admin/page.tsx`:

```tsx
import type { Metadata } from "next";
import { AdminView, requireAdmin } from "@/views/admin";

export const metadata: Metadata = {
  title: "Admin",
  description: "Manage tracks and leaderboards on Tracks Inc.",
};

export default async function AdminPage() {
  await requireAdmin();
  return <AdminView />;
}
```

- [ ] **Step 2: Admin tracks page**

Create `src/views/admin-tracks/ui/admin-tracks-view.tsx`:

```tsx
import { getTracks, TrackAdminList, TrackFormDialog } from "@/features/tracks";

export async function AdminTracksView() {
  const tracks = await getTracks();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-extrabold">Manage tracks</h1>
        <TrackFormDialog mode="create" />
      </div>
      <TrackAdminList tracks={tracks} />
    </main>
  );
}
```

Create `src/views/admin-tracks/index.ts`:

```ts
export { AdminTracksView } from "./ui/admin-tracks-view";
export { requireAdmin } from "@/shared/lib/session";
```

Create `src/app/admin/tracks/page.tsx`:

```tsx
import type { Metadata } from "next";
import { AdminTracksView, requireAdmin } from "@/views/admin-tracks";

export const metadata: Metadata = {
  title: "Manage Tracks",
  description: "Add, edit, and remove tracks on Tracks Inc.",
};

export default async function AdminTracksPage() {
  await requireAdmin();
  return <AdminTracksView />;
}
```

- [ ] **Step 3: Admin leaderboards page**

Create `src/views/admin-leaderboards/ui/admin-leaderboards-view.tsx`:

```tsx
import { getTracks } from "@/features/tracks";
import {
  getLeaderboards,
  LeaderboardAdminList,
  LeaderboardFormDialog,
} from "@/features/leaderboards";

export async function AdminLeaderboardsView() {
  const [leaderboards, tracks] = await Promise.all([
    getLeaderboards(),
    getTracks(),
  ]);
  const trackOptions = tracks.map((track) => ({
    id: track.id,
    name: track.name,
  }));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-extrabold">
          Manage leaderboards
        </h1>
        <LeaderboardFormDialog mode="create" tracks={trackOptions} />
      </div>
      <LeaderboardAdminList leaderboards={leaderboards} tracks={trackOptions} />
    </main>
  );
}
```

Create `src/views/admin-leaderboards/index.ts`:

```ts
export { AdminLeaderboardsView } from "./ui/admin-leaderboards-view";
export { requireAdmin } from "@/shared/lib/session";
```

Create `src/app/admin/leaderboards/page.tsx`:

```tsx
import type { Metadata } from "next";
import {
  AdminLeaderboardsView,
  requireAdmin,
} from "@/views/admin-leaderboards";

export const metadata: Metadata = {
  title: "Manage Leaderboards",
  description: "Add, edit, and remove leaderboards on Tracks Inc.",
};

export default async function AdminLeaderboardsPage() {
  await requireAdmin();
  return <AdminLeaderboardsView />;
}
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/views/admin src/views/admin-tracks src/views/admin-leaderboards src/app/admin
git commit -m "feat: add admin views and routes"
```

---

### Task 12: Public tracks/leaderboards views and routes

**Files:**

- Create: `src/views/tracks/ui/tracks-view.tsx`, `src/views/tracks/index.ts`
- Create: `src/views/leaderboards/ui/leaderboards-view.tsx`, `src/views/leaderboards/index.ts`
- Create: `src/app/tracks/page.tsx`, `src/app/leaderboards/page.tsx`

**Interfaces:**

- Consumes: `TracksSection` (`@/features/tracks`, Task 6); `LeaderboardsSection` (`@/features/leaderboards`, Task 10).
- Produces: `TracksView()`, `LeaderboardsView()` (Server Components, no props).

- [ ] **Step 1: Public tracks page**

Create `src/views/tracks/ui/tracks-view.tsx`:

```tsx
import { TracksSection } from "@/features/tracks";

export function TracksView() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-6 md:px-12">
      <TracksSection />
    </main>
  );
}
```

Create `src/views/tracks/index.ts`:

```ts
export { TracksView } from "./ui/tracks-view";
```

Create `src/app/tracks/page.tsx`:

```tsx
import type { Metadata } from "next";
import { TracksView } from "@/views/tracks";

export const metadata: Metadata = {
  title: "Tracks",
  description: "Browse every track tracked on Tracks Inc.",
};

export default function TracksPage() {
  return <TracksView />;
}
```

- [ ] **Step 2: Public leaderboards page**

Create `src/views/leaderboards/ui/leaderboards-view.tsx`:

```tsx
import { LeaderboardsSection } from "@/features/leaderboards";

export function LeaderboardsView() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-6 md:px-12">
      <LeaderboardsSection />
    </main>
  );
}
```

Create `src/views/leaderboards/index.ts`:

```ts
export { LeaderboardsView } from "./ui/leaderboards-view";
```

Create `src/app/leaderboards/page.tsx`:

```tsx
import type { Metadata } from "next";
import { LeaderboardsView } from "@/views/leaderboards";

export const metadata: Metadata = {
  title: "Leaderboards",
  description: "Browse every leaderboard on Tracks Inc.",
};

export default function LeaderboardsPage() {
  return <LeaderboardsView />;
}
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/views/tracks src/views/leaderboards src/app/tracks src/app/leaderboards
git commit -m "feat: add public tracks and leaderboards pages"
```

---

### Task 13: Nav — Admin link

**Files:**

- Modify: `src/layout/site-nav/ui/site-nav.tsx`

**Interfaces:**

- Consumes: `user: AuthUser | null` from the existing `getCurrentUser()` call in this component (`user.role` is `"USER" | "ADMIN"`).

- [ ] **Step 1: Add the desktop "Admin" link**

In `src/layout/site-nav/ui/site-nav.tsx`, the desktop logged-in block currently reads (around line 31):

```tsx
            <>
              <a href="/my-garage" className="text-sm font-semibold">
                My Garage
              </a>
              <form action={logout}>
```

Change it to:

```tsx
            <>
              <a href="/my-garage" className="text-sm font-semibold">
                My Garage
              </a>
              {user.role === "ADMIN" && (
                <a href="/admin" className="text-sm font-semibold">
                  Admin
                </a>
              )}
              <form action={logout}>
```

- [ ] **Step 2: Add the mobile "Admin" link**

The mobile logged-in block (around line 73) has the same shape — apply the same change there:

```tsx
              <>
                <a href="/my-garage" className="text-sm font-semibold">
                  My Garage
                </a>
                {user.role === "ADMIN" && (
                  <a href="/admin" className="text-sm font-semibold">
                    Admin
                  </a>
                )}
                <form action={logout}>
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/layout/site-nav/ui/site-nav.tsx
git commit -m "feat: show Admin nav link for admin users"
```

---

### Task 14: Playwright E2E suite — tracks

**Files:**

- Create: `tests/admin-tracks.spec.ts`

**Interfaces:**

- Consumes: running app (`pnpm dev` via `playwright.config.ts`'s `webServer`), `TEST_DATABASE_URL`, `/login`, `/signup`, `/admin/tracks`, `/tracks` routes, and every label/button text defined in Tasks 5–6, 11–13 (`Add track`, `Edit`, `Delete`, `Save`, `Name`, `Country`, `Length (meters)`, `Corners`, `Elevation (meters)`).

- [ ] **Step 1: Write the suite**

Create `tests/admin-tracks.spec.ts`:

```ts
import { expect, test, type Locator, type Page } from "@playwright/test";
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

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/");
}

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Regular User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");
}

async function addTrack(dialog: Locator) {
  await dialog.getByLabel("Name").fill("Nürburgring Nordschleife");
  await dialog.getByLabel("Country").fill("Germany");
  await dialog.getByLabel("Length (meters)").fill("20800");
  await dialog.getByLabel("Corners").fill("154");
  await dialog.getByLabel("Elevation (meters)").fill("300");
  await dialog.getByRole("button", { name: "Add track" }).click();
}

test.beforeEach(async () => {
  await prisma.leaderboard.deleteMany();
  await prisma.track.deleteMany();
  await prisma.car.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("an admin adding a track shows it in the admin list and the public tracks page", async ({
  page,
}) => {
  const admin = await createAdmin("admin1@example.com");
  await login(page, admin.email);
  await page.goto("/admin/tracks");

  await page.getByRole("button", { name: "Add track" }).click();
  await addTrack(page.getByRole("dialog"));

  await expect(page.getByText("Nürburgring Nordschleife")).toBeVisible();
  await expect(page.getByText("20.8 km")).toBeVisible();

  await page.goto("/tracks");
  await expect(page.getByText("Nürburgring Nordschleife")).toBeVisible();
});

test("an admin editing a track updates the list", async ({ page }) => {
  const admin = await createAdmin("admin2@example.com");
  await login(page, admin.email);
  await page.goto("/admin/tracks");

  await page.getByRole("button", { name: "Add track" }).click();
  await addTrack(page.getByRole("dialog"));
  await expect(page.getByText("Nürburgring Nordschleife")).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Name").fill("Nürburgring GP");
  await editDialog.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Nürburgring GP")).toBeVisible();
});

test("an admin deleting a track requires confirmation and removes it everywhere", async ({
  page,
}) => {
  const admin = await createAdmin("admin3@example.com");
  await login(page, admin.email);
  await page.goto("/admin/tracks");

  await page.getByRole("button", { name: "Add track" }).click();
  await addTrack(page.getByRole("dialog"));
  await expect(page.getByText("Nürburgring Nordschleife")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(page.getByText("Nürburgring Nordschleife")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("Nürburgring Nordschleife")).toHaveCount(0);

  await page.goto("/tracks");
  await expect(page.getByText("Nürburgring Nordschleife")).toHaveCount(0);
});

test("submitting the add track form without required fields shows a field error and creates nothing", async ({
  page,
}) => {
  const admin = await createAdmin("admin4@example.com");
  await login(page, admin.email);
  await page.goto("/admin/tracks");

  await page.getByRole("button", { name: "Add track" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add track" })
    .click();

  await expect(page.getByText("Name is required")).toBeVisible();

  const trackCount = await prisma.track.count();
  expect(trackCount).toBe(0);
});

test("a regular user cannot reach the admin tracks page", async ({ page }) => {
  await signUp(page, "user1@example.com");
  const response = await page.goto("/admin/tracks");
  expect(response?.status()).toBe(404);
});

test("a logged-out visitor cannot reach the admin tracks page", async ({
  page,
}) => {
  const response = await page.goto("/admin/tracks");
  expect(response?.status()).toBe(404);
});

test("a logged-out visitor can browse the public tracks page", async ({
  page,
}) => {
  await prisma.track.create({
    data: {
      name: "Spa-Francorchamps",
      country: "Belgium",
      length: 7000,
      corners: 20,
      elevation: 100,
    },
  });

  await page.goto("/tracks");
  await expect(page.getByText("Spa-Francorchamps")).toBeVisible();
});
```

- [ ] **Step 2: Run the suite**

Run: `pnpm test:e2e tests/admin-tracks.spec.ts`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/admin-tracks.spec.ts
git commit -m "test: add Playwright E2E suite for track admin CRUD"
```

---

### Task 15: Playwright E2E suite — leaderboards

**Files:**

- Create: `tests/admin-leaderboards.spec.ts`

**Interfaces:**

- Consumes: running app, `TEST_DATABASE_URL`, `/login`, `/signup`, `/admin/leaderboards`, `/leaderboards` routes, and every label/button text defined in Tasks 9–10, 11–13 (`Add leaderboard`, `Edit`, `Delete`, `Save`, `Title`, `Track`).

- [ ] **Step 1: Write the suite**

Create `tests/admin-leaderboards.spec.ts`:

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

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/");
}

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Regular User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");
}

test.beforeEach(async () => {
  await prisma.leaderboard.deleteMany();
  await prisma.track.deleteMany();
  await prisma.car.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("an admin adding a leaderboard shows it in the admin list and the public leaderboards page", async ({
  page,
}) => {
  await prisma.track.create({
    data: {
      name: "Circuit de la Sarthe",
      country: "France",
      length: 13600,
      corners: 38,
      elevation: 30,
    },
  });
  const admin = await createAdmin("admin1@example.com");
  await login(page, admin.email);
  await page.goto("/admin/leaderboards");

  await page.getByRole("button", { name: "Add leaderboard" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Fastest overall");
  await dialog
    .getByLabel("Track")
    .selectOption({ label: "Circuit de la Sarthe" });
  await dialog.getByRole("button", { name: "Add leaderboard" }).click();

  await expect(page.getByText("Fastest overall")).toBeVisible();
  await expect(page.getByText("Circuit de la Sarthe")).toBeVisible();

  await page.goto("/leaderboards");
  await expect(page.getByText("Fastest overall")).toBeVisible();
});

test("an admin editing a leaderboard updates the list", async ({ page }) => {
  await prisma.track.create({
    data: {
      name: "Circuit de la Sarthe",
      country: "France",
      length: 13600,
      corners: 38,
      elevation: 30,
    },
  });
  const admin = await createAdmin("admin2@example.com");
  await login(page, admin.email);
  await page.goto("/admin/leaderboards");

  await page.getByRole("button", { name: "Add leaderboard" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Fastest overall");
  await dialog
    .getByLabel("Track")
    .selectOption({ label: "Circuit de la Sarthe" });
  await dialog.getByRole("button", { name: "Add leaderboard" }).click();
  await expect(page.getByText("Fastest overall")).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Title").fill("Fastest RWD");
  await editDialog.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Fastest RWD")).toBeVisible();
});

test("an admin deleting a leaderboard requires confirmation and removes it everywhere", async ({
  page,
}) => {
  await prisma.track.create({
    data: {
      name: "Circuit de la Sarthe",
      country: "France",
      length: 13600,
      corners: 38,
      elevation: 30,
    },
  });
  const admin = await createAdmin("admin3@example.com");
  await login(page, admin.email);
  await page.goto("/admin/leaderboards");

  await page.getByRole("button", { name: "Add leaderboard" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Fastest overall");
  await dialog
    .getByLabel("Track")
    .selectOption({ label: "Circuit de la Sarthe" });
  await dialog.getByRole("button", { name: "Add leaderboard" }).click();
  await expect(page.getByText("Fastest overall")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(page.getByText("Fastest overall")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("Fastest overall")).toHaveCount(0);

  await page.goto("/leaderboards");
  await expect(page.getByText("Fastest overall")).toHaveCount(0);
});

test("submitting the add leaderboard form without a title shows a field error and creates nothing", async ({
  page,
}) => {
  await prisma.track.create({
    data: {
      name: "Circuit de la Sarthe",
      country: "France",
      length: 13600,
      corners: 38,
      elevation: 30,
    },
  });
  const admin = await createAdmin("admin4@example.com");
  await login(page, admin.email);
  await page.goto("/admin/leaderboards");

  await page.getByRole("button", { name: "Add leaderboard" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add leaderboard" })
    .click();

  await expect(page.getByText("Title is required")).toBeVisible();

  const leaderboardCount = await prisma.leaderboard.count();
  expect(leaderboardCount).toBe(0);
});

test("a regular user cannot reach the admin leaderboards page", async ({
  page,
}) => {
  await signUp(page, "user1@example.com");
  const response = await page.goto("/admin/leaderboards");
  expect(response?.status()).toBe(404);
});

test("a logged-out visitor cannot reach the admin leaderboards page", async ({
  page,
}) => {
  const response = await page.goto("/admin/leaderboards");
  expect(response?.status()).toBe(404);
});

test("a logged-out visitor can browse the public leaderboards page", async ({
  page,
}) => {
  const track = await prisma.track.create({
    data: {
      name: "Spa-Francorchamps",
      country: "Belgium",
      length: 7000,
      corners: 20,
      elevation: 100,
    },
  });
  await prisma.leaderboard.create({
    data: { title: "Fastest overall", trackId: track.id },
  });

  await page.goto("/leaderboards");
  await expect(page.getByText("Fastest overall")).toBeVisible();
});
```

- [ ] **Step 2: Run the suite**

Run: `pnpm test:e2e tests/admin-leaderboards.spec.ts`
Expected: all tests pass.

- [ ] **Step 3: Run the full suite together**

Run: `pnpm test:e2e`
Expected: all tests pass (auth, garage, admin-tracks, admin-leaderboards).

- [ ] **Step 4: Commit**

```bash
git add tests/admin-leaderboards.spec.ts
git commit -m "test: add Playwright E2E suite for leaderboard admin CRUD"
```

---
