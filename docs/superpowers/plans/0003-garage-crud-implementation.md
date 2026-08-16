# Garage CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in user see, add, edit, and remove cars in their garage at `/my-garage`, and show a real car count on the homepage `GarageBar`.

**Architecture:** Extend the existing `features/garage` slice with a `Car` Prisma model, a small DAL, three server actions (`createCar`/`updateCar`/`deleteCar`), and modal-based add/edit/delete UI built on a new native-`<dialog>`-backed `shared/ui/dialog`. `getCurrentUser` moves from `features/auth` into `shared/lib/session` (re-exported unchanged from `features/auth`) so the garage actions can verify ownership without a feature-to-feature import.

**Tech Stack:** Next.js (App Router, Server Actions), Prisma/Postgres, Zod, React Hook Form, Tailwind, Playwright.

**Spec:** `docs/superpowers/specs/0003-garage-crud-design.md`

## Global Constraints

- Follow `AGENTS.md`'s layer rules exactly: `app → views/layout → features → shared`, enforced by `eslint-plugin-boundaries` — `app` may only import `views`/`layout`; `features` may only import `shared`, never another feature.
- All new files under `src/` are kebab-case (`unicorn/filename-case`).
- Server Components by default; `"use client"` only on the smallest leaf that needs it (form inputs, dialog open/close state).
- No new npm dependencies — the modal is built on the native `<dialog>` element.
- `Car` required fields: `make`, `model`, `year`, `horsepower`, `drivetrain`, `transmission`. Optional: `nickname`, `photoUrl`, `notes`.
- `photoUrl` is a plain string URL field — no file upload, no new storage infra.
- Every mutation (`createCar`/`updateCar`/`deleteCar`) re-derives the user from `getCurrentUser()` server-side — never trust a client-supplied id. `updateCar`/`deleteCar` scope their Prisma query to `{ id, ownerId: user.id }` and treat an affected-row count of `0` as a generic "Car not found" error (covers both "doesn't exist" and "not yours").
- Every mutation calls `revalidatePath("/my-garage")` and `revalidatePath("/")` (the homepage `GarageBar` shows the car count too).
- This repo has no unit-testing framework (no Vitest/RTL) — following the precedent set by the auth feature, behavioral verification is Playwright E2E only. Verify each non-final task with `pnpm lint` and `npx tsc --noEmit`; the final task adds the Playwright suite covering the full CRUD flow.

---

## File Structure

**New:**
- `shared/lib/session.ts` — `getCurrentUser`, `AuthUser`, `Role` (moved from `features/auth/model/session.ts`).
- `shared/ui/dialog/dialog.tsx` — native-`<dialog>`-backed modal primitive.
- `features/garage/model/schema.ts` — `carSchema` (Zod).
- `features/garage/model/cars.ts` — `getCars`, `getCarCount` (DAL).
- `features/garage/model/actions.ts` — `createCar`, `updateCar`, `deleteCar` (`"use server"`).
- `features/garage/ui/car-form-dialog.tsx` — add/edit modal (`"use client"`).
- `features/garage/ui/delete-car-button.tsx` — delete trigger + confirm modal (`"use client"`).
- `features/garage/ui/car-card.tsx` — single car display (Server Component).
- `features/garage/ui/car-list.tsx` — car grid + empty state (Server Component).
- `tests/garage.spec.ts` — Playwright E2E suite.

**Modified:**
- `prisma/schema.prisma` — add `Drivetrain`/`Transmission` enums, `Car` model, `User.cars` relation.
- `features/auth/model/session.ts` — keeps `createSession`/`deleteSession`; re-exports `getCurrentUser` from `shared/lib/session`.
- `features/auth/model/types.ts` — re-exports `AuthUser`/`Role` from `shared/lib/session`.
- `features/garage/model/types.ts` — add `Car`, `Drivetrain`, `Transmission`; trim `Garage` (drop `cars`).
- `features/garage/model/mock.ts` — drop `cars` from `mockGarage`.
- `features/garage/ui/garage-bar.tsx` — becomes `async`, takes `userId`, uses real car count, fixes the `/garage` → `/my-garage` link.
- `features/garage/index.ts` — export `CarList`, `CarFormDialog`, `getCars`, `Car`.
- `views/home/ui/home-view.tsx` — passes `user.id` to `<GarageBar>`.
- `views/my-garage/ui/my-garage-view.tsx` — becomes `async`, renders real cars via `getCars`.

---

### Task 1: Prisma schema — `Car` model

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Car` Prisma model with fields `id, make, model, year, horsepower, drivetrain (Drivetrain), transmission (Transmission), nickname, photoUrl, notes, ownerId, owner (User), createdAt`; `Drivetrain` enum (`FWD`, `RWD`, `AWD`); `Transmission` enum (`MANUAL`, `AUTOMATIC`); `User.cars: Car[]`.

- [ ] **Step 1: Add the enums and model to `prisma/schema.prisma`**

Add after the existing `Role` enum, and add `cars Car[]` to `model User`:

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

`model User` becomes:

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String
  role         Role      @default(USER)
  createdAt    DateTime  @default(now())
  sessions     Session[]
  cars         Car[]
}
```

- [ ] **Step 2: Run the dev migration**

Run: `npx prisma migrate dev --name add_car`
Expected: `Your database is now in sync with your schema.` and a new folder under `prisma/migrations/` containing the `Car` table and enum creation.

- [ ] **Step 3: Apply the same migration to the test database**

Run:
```bash
set -a; source .env; set +a
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
```
Expected: `All migrations have been successfully applied.`

- [ ] **Step 4: Verify the Prisma client compiles against the new schema**

Run: `npx tsc --noEmit`
Expected: no errors (nothing consumes `Car` yet, this just confirms `prisma generate`, which `migrate dev` already ran, produced valid types).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Car model to schema"
```

---

### Task 2: Move `getCurrentUser` into `shared/lib/session`

**Files:**
- Create: `src/shared/lib/session.ts`
- Modify: `src/features/auth/model/session.ts`
- Modify: `src/features/auth/model/types.ts`
- Test: `tests/auth.spec.ts` (run only, no edits — regression check)

**Interfaces:**
- Produces: `getCurrentUser(): Promise<AuthUser | null>`, `type AuthUser = { id: string; name: string; email: string; role: Role }`, `type Role = "USER" | "ADMIN"` — all from `@/shared/lib/session`. `features/auth`'s public API (`getCurrentUser`, `AuthUser`, `Role` via `features/auth/index.ts`) is unchanged for existing consumers.

- [ ] **Step 1: Create `src/shared/lib/session.ts`**

```ts
import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/shared/lib/prisma";

export const SESSION_COOKIE = "session_token";

export type Role = "USER" | "ADMIN";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as Role,
  };
});
```

- [ ] **Step 2: Trim `src/features/auth/model/session.ts` to only session mutation**

Replace the full file with:

```ts
import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/shared/lib/prisma";
import { SESSION_COOKIE, hashToken } from "@/shared/lib/session";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export { getCurrentUser } from "@/shared/lib/session";
```

- [ ] **Step 3: Update `src/features/auth/model/types.ts`**

Replace the full file with:

```ts
export type { AuthUser, Role } from "@/shared/lib/session";
```

- [ ] **Step 4: Verify lint and types**

Run: `pnpm lint && npx tsc --noEmit`
Expected: no errors. `src/features/auth/index.ts` needs no changes — it still does `export { getCurrentUser } from "./model/session";` and `export type { AuthUser, Role } from "./model/types";`, both of which now resolve through the new re-exports.

- [ ] **Step 5: Regression-check the existing auth suite**

Run: `pnpm test:e2e tests/auth.spec.ts`
Expected: all existing auth tests still pass — confirms the session move didn't change behavior.

- [ ] **Step 6: Commit**

```bash
git add src/shared/lib/session.ts src/features/auth/model/session.ts src/features/auth/model/types.ts
git commit -m "refactor: move getCurrentUser into shared/lib/session"
```

---

### Task 3: Garage domain layer — types, schema, DAL

**Files:**
- Modify: `src/features/garage/model/types.ts`
- Modify: `src/features/garage/model/mock.ts`
- Create: `src/features/garage/model/schema.ts`
- Create: `src/features/garage/model/cars.ts`

**Interfaces:**
- Consumes: `prisma` from `@/shared/lib/prisma`.
- Produces: `type Car`, `type Drivetrain`, `type Transmission` from `./types`; `carSchema`, `type CarInput` from `./schema`; `getCars(ownerId: string): Promise<Car[]>`, `getCarCount(ownerId: string): Promise<number>` from `./cars`.

- [ ] **Step 1: Update `src/features/garage/model/types.ts`**

```ts
export type Drivetrain = "FWD" | "RWD" | "AWD";
export type Transmission = "MANUAL" | "AUTOMATIC";

export type Car = {
  id: string;
  make: string;
  model: string;
  year: number;
  horsepower: number;
  drivetrain: Drivetrain;
  transmission: Transmission;
  nickname: string | null;
  photoUrl: string | null;
  notes: string | null;
};

export type Garage = {
  personalBest: string;
  personalBestTrack: string;
  rank: number;
};
```

- [ ] **Step 2: Update `src/features/garage/model/mock.ts`**

```ts
import type { Garage } from "./types";

export const mockGarage: Garage = {
  personalBest: "7:12.450",
  personalBestTrack: "Nürburgring Nordschleife",
  rank: 1,
};
```

- [ ] **Step 3: Create `src/features/garage/model/schema.ts`**

```ts
import { z } from "zod";

export const carSchema = z.object({
  make: z.string().trim().min(1, "Make is required"),
  model: z.string().trim().min(1, "Model is required"),
  year: z.coerce
    .number()
    .int()
    .min(1900, "Enter a valid year")
    .max(new Date().getFullYear() + 1, "Enter a valid year"),
  horsepower: z.coerce
    .number()
    .int()
    .positive("Horsepower must be greater than 0"),
  drivetrain: z.enum(["FWD", "RWD", "AWD"], "Select a drivetrain"),
  transmission: z.enum(["MANUAL", "AUTOMATIC"], "Select a transmission"),
  nickname: z.string().trim(),
  photoUrl: z.union([z.url("Enter a valid URL"), z.literal("")]),
  notes: z.string().trim(),
});

export type CarInput = z.infer<typeof carSchema>;
```

- [ ] **Step 4: Create `src/features/garage/model/cars.ts`**

```ts
import "server-only";
import { prisma } from "@/shared/lib/prisma";
import type { Car } from "./types";

export async function getCars(ownerId: string): Promise<Car[]> {
  return prisma.car.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCarCount(ownerId: string): Promise<number> {
  return prisma.car.count({ where: { ownerId } });
}
```

- [ ] **Step 5: Verify lint and types**

Run: `pnpm lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/garage/model/types.ts src/features/garage/model/mock.ts src/features/garage/model/schema.ts src/features/garage/model/cars.ts
git commit -m "feat: add garage domain types, schema, and DAL"
```

---

### Task 4: Garage server actions

**Files:**
- Create: `src/features/garage/model/actions.ts`

**Interfaces:**
- Consumes: `getCurrentUser` from `@/shared/lib/session`; `prisma` from `@/shared/lib/prisma`; `carSchema`, `CarInput` from `./schema`.
- Produces: `type CarActionResult = { fieldErrors?: Partial<Record<keyof CarInput, string>>; rootError?: string } | void`; `createCar(input: CarInput): Promise<CarActionResult>`; `updateCar(id: string, input: CarInput): Promise<CarActionResult>`; `deleteCar(id: string): Promise<{ rootError?: string } | void>`.

- [ ] **Step 1: Create `src/features/garage/model/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/shared/lib/session";
import { carSchema } from "./schema";
import type { CarInput } from "./schema";

type CarActionResult = {
  fieldErrors?: Partial<Record<keyof CarInput, string>>;
  rootError?: string;
} | void;

function toCarData(input: CarInput) {
  return {
    make: input.make,
    model: input.model,
    year: input.year,
    horsepower: input.horsepower,
    drivetrain: input.drivetrain,
    transmission: input.transmission,
    nickname: input.nickname || null,
    photoUrl: input.photoUrl || null,
    notes: input.notes || null,
  };
}

export async function createCar(input: CarInput): Promise<CarActionResult> {
  const parsed = carSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { rootError: "You must be logged in" };
  }

  await prisma.car.create({
    data: { ...toCarData(parsed.data), ownerId: user.id },
  });

  revalidatePath("/my-garage");
  revalidatePath("/");
}

export async function updateCar(
  id: string,
  input: CarInput,
): Promise<CarActionResult> {
  const parsed = carSchema.safeParse(input);
  if (!parsed.success) {
    return { rootError: "Invalid input" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { rootError: "You must be logged in" };
  }

  const { count } = await prisma.car.updateMany({
    where: { id, ownerId: user.id },
    data: toCarData(parsed.data),
  });

  if (count === 0) {
    return { rootError: "Car not found" };
  }

  revalidatePath("/my-garage");
  revalidatePath("/");
}

export async function deleteCar(
  id: string,
): Promise<{ rootError?: string } | void> {
  const user = await getCurrentUser();
  if (!user) {
    return { rootError: "You must be logged in" };
  }

  const { count } = await prisma.car.deleteMany({
    where: { id, ownerId: user.id },
  });

  if (count === 0) {
    return { rootError: "Car not found" };
  }

  revalidatePath("/my-garage");
  revalidatePath("/");
}
```

- [ ] **Step 2: Verify lint and types**

Run: `pnpm lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/garage/model/actions.ts
git commit -m "feat: add garage server actions"
```

---

### Task 5: `Dialog` primitive

**Files:**
- Create: `src/shared/ui/dialog/dialog.tsx`
- Modify: `src/shared/ui/index.ts`

**Interfaces:**
- Produces: `Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode })`, exported from `@/shared/ui`.

- [ ] **Step 1: Create `src/shared/ui/dialog/dialog.tsx`**

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onOpenChange(false);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onOpenChange]);

  return (
    <dialog
      ref={dialogRef}
      className="border border-divider bg-background p-6 backdrop:bg-foreground/40"
    >
      {children}
    </dialog>
  );
}
```

- [ ] **Step 2: Add it to the shared UI public API**

In `src/shared/ui/index.ts`, add:

```ts
export { Dialog } from "./dialog/dialog";
```

- [ ] **Step 3: Verify lint and types**

Run: `pnpm lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui/dialog/dialog.tsx src/shared/ui/index.ts
git commit -m "feat: add shared Dialog primitive"
```

---

### Task 6: Add/edit car form dialog

**Files:**
- Create: `src/features/garage/ui/car-form-dialog.tsx`

**Interfaces:**
- Consumes: `Button`, `Dialog` from `@/shared/ui`; `createCar`, `updateCar` from `../model/actions`; `carSchema`, `CarInput` from `../model/schema`; `Car` from `../model/types`.
- Produces: `CarFormDialog(props: { mode: "create" } | { mode: "edit"; car: Car })`.

- [ ] **Step 1: Create `src/features/garage/ui/car-form-dialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { createCar, updateCar } from "../model/actions";
import { carSchema } from "../model/schema";
import type { CarInput } from "../model/schema";
import type { Car } from "../model/types";

type CarFormDialogProps = { mode: "create" } | { mode: "edit"; car: Car };

const inputClasses =
  "border border-divider bg-background px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2";

function defaultValues(props: CarFormDialogProps): CarInput {
  if (props.mode === "edit") {
    return {
      make: props.car.make,
      model: props.car.model,
      year: props.car.year,
      horsepower: props.car.horsepower,
      drivetrain: props.car.drivetrain,
      transmission: props.car.transmission,
      nickname: props.car.nickname ?? "",
      photoUrl: props.car.photoUrl ?? "",
      notes: props.car.notes ?? "",
    };
  }

  return {
    make: "",
    model: "",
    year: new Date().getFullYear(),
    horsepower: 0,
    drivetrain: "FWD",
    transmission: "MANUAL",
    nickname: "",
    photoUrl: "",
    notes: "",
  };
}

export function CarFormDialog(props: CarFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CarInput>({
    resolver: zodResolver(carSchema),
    defaultValues: defaultValues(props),
  });

  const onSubmit = handleSubmit(async (data) => {
    const result =
      props.mode === "edit"
        ? await updateCar(props.car.id, data)
        : await createCar(data);

    if (!result) {
      setIsOpen(false);
      reset(defaultValues(props));
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
        onClick={() => setIsOpen(true)}
      >
        {props.mode === "edit" ? (
          <>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            Add car
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
            {props.mode === "edit" ? "Edit car" : "Add a car"}
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="make" className="text-sm font-semibold">
              Make
            </label>
            <input id="make" className={inputClasses} {...register("make")} />
            {errors.make && (
              <p className="text-sm text-accent-600">{errors.make.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="model" className="text-sm font-semibold">
              Model
            </label>
            <input
              id="model"
              className={inputClasses}
              {...register("model")}
            />
            {errors.model && (
              <p className="text-sm text-accent-600">
                {errors.model.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="year" className="text-sm font-semibold">
              Year
            </label>
            <input
              id="year"
              type="number"
              className={inputClasses}
              {...register("year", { valueAsNumber: true })}
            />
            {errors.year && (
              <p className="text-sm text-accent-600">{errors.year.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="horsepower" className="text-sm font-semibold">
              Horsepower
            </label>
            <input
              id="horsepower"
              type="number"
              className={inputClasses}
              {...register("horsepower", { valueAsNumber: true })}
            />
            {errors.horsepower && (
              <p className="text-sm text-accent-600">
                {errors.horsepower.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="drivetrain" className="text-sm font-semibold">
              Drivetrain
            </label>
            <select
              id="drivetrain"
              className={inputClasses}
              {...register("drivetrain")}
            >
              <option value="FWD">FWD</option>
              <option value="RWD">RWD</option>
              <option value="AWD">AWD</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="transmission" className="text-sm font-semibold">
              Transmission
            </label>
            <select
              id="transmission"
              className={inputClasses}
              {...register("transmission")}
            >
              <option value="MANUAL">Manual</option>
              <option value="AUTOMATIC">Automatic</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nickname" className="text-sm font-semibold">
              Nickname (optional)
            </label>
            <input
              id="nickname"
              className={inputClasses}
              {...register("nickname")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="photoUrl" className="text-sm font-semibold">
              Photo URL (optional)
            </label>
            <input
              id="photoUrl"
              className={inputClasses}
              {...register("photoUrl")}
            />
            {errors.photoUrl && (
              <p className="text-sm text-accent-600">
                {errors.photoUrl.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className="text-sm font-semibold">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              className={inputClasses}
              rows={3}
              {...register("notes")}
            />
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
              {props.mode === "edit" ? "Save" : "Add car"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Verify lint and types**

Run: `pnpm lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/garage/ui/car-form-dialog.tsx
git commit -m "feat: add car add/edit form dialog"
```

---

### Task 7: Delete car button

**Files:**
- Create: `src/features/garage/ui/delete-car-button.tsx`

**Interfaces:**
- Consumes: `Button`, `Dialog` from `@/shared/ui`; `deleteCar` from `../model/actions`.
- Produces: `DeleteCarButton({ carId, carLabel }: { carId: string; carLabel: string })`.

- [ ] **Step 1: Create `src/features/garage/ui/delete-car-button.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { deleteCar } from "../model/actions";

type DeleteCarButtonProps = {
  carId: string;
  carLabel: string;
};

export function DeleteCarButton({ carId, carLabel }: DeleteCarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteCar(carId);
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
            Remove {carLabel} from your garage?
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

- [ ] **Step 2: Verify lint and types**

Run: `pnpm lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/garage/ui/delete-car-button.tsx
git commit -m "feat: add delete car button with confirmation"
```

---

### Task 8: Car card and list

**Files:**
- Create: `src/features/garage/ui/car-card.tsx`
- Create: `src/features/garage/ui/car-list.tsx`

**Interfaces:**
- Consumes: `Tag` from `@/shared/ui`; `CarFormDialog` from `./car-form-dialog`; `DeleteCarButton` from `./delete-car-button`; `Car` from `../model/types`.
- Produces: `CarCard({ car }: { car: Car })`; `CarList({ cars }: { cars: Car[] })`.

- [ ] **Step 1: Create `src/features/garage/ui/car-card.tsx`**

```tsx
import Image from "next/image";
import { Car as CarIcon } from "lucide-react";
import { Tag } from "@/shared/ui";
import { CarFormDialog } from "./car-form-dialog";
import { DeleteCarButton } from "./delete-car-button";
import type { Car } from "../model/types";

const drivetrainLabels: Record<Car["drivetrain"], string> = {
  FWD: "FWD",
  RWD: "RWD",
  AWD: "AWD",
};

const transmissionLabels: Record<Car["transmission"], string> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automatic",
};

export function CarCard({ car }: { car: Car }) {
  const label = `${car.year} ${car.make} ${car.model}`;
  const heading = car.nickname || label;
  const subheading = car.nickname ? label : null;

  return (
    <div className="flex flex-col gap-4 border border-divider p-5">
      <div className="relative h-40 w-full overflow-hidden bg-foreground/5">
        {car.photoUrl ? (
          // Photo URLs are arbitrary user-supplied hosts, so we skip Next's
          // image optimizer (which requires an allow-listed domain).
          <Image
            src={car.photoUrl}
            alt={label}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <CarIcon className="h-10 w-10 text-foreground/30" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="font-heading text-lg font-extrabold">
          {heading}
        </span>
        {subheading && (
          <span className="text-sm text-foreground/60">{subheading}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Tag variant="neutral">{car.horsepower} hp</Tag>
        <Tag variant="neutral">{drivetrainLabels[car.drivetrain]}</Tag>
        <Tag variant="neutral">{transmissionLabels[car.transmission]}</Tag>
      </div>

      {car.notes && <p className="text-sm text-foreground/70">{car.notes}</p>}

      <div className="mt-auto flex gap-2.5">
        <CarFormDialog mode="edit" car={car} />
        <DeleteCarButton carId={car.id} carLabel={label} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/features/garage/ui/car-list.tsx`**

```tsx
import { CarCard } from "./car-card";
import type { Car } from "../model/types";

export function CarList({ cars }: { cars: Car[] }) {
  if (cars.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        No cars yet — add your first one.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify lint and types**

Run: `pnpm lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/garage/ui/car-card.tsx src/features/garage/ui/car-list.tsx
git commit -m "feat: add car card and list"
```

---

### Task 9: Wire it all up

**Files:**
- Modify: `src/features/garage/ui/garage-bar.tsx`
- Modify: `src/features/garage/index.ts`
- Modify: `src/views/home/ui/home-view.tsx`
- Modify: `src/views/my-garage/ui/my-garage-view.tsx`

**Interfaces:**
- Consumes: `getCarCount` from `../model/cars` (in `garage-bar.tsx`); `getCars`, `CarList`, `CarFormDialog` from `@/features/garage` (in `my-garage-view.tsx`).
- Produces: `features/garage` public API gains `CarList`, `CarFormDialog`, `getCars`, `type Car`.

- [ ] **Step 1: Update `src/features/garage/ui/garage-bar.tsx`**

```tsx
import { ArrowRight, Car } from "lucide-react";
import { Button } from "@/shared/ui";
import { getCarCount } from "../model/cars";
import { mockGarage } from "../model/mock";

export async function GarageBar({ userId }: { userId: string }) {
  const carCount = await getCarCount(userId);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-6 border-b-2 border-divider py-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-accent-500 text-background">
        <Car className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs tracking-wide text-foreground/55 uppercase">
          Your garage
        </span>
        <span className="text-sm font-semibold">
          {carCount} cars · PB {mockGarage.personalBest} at{" "}
          {mockGarage.personalBestTrack} · Rank #{mockGarage.rank} overall
        </span>
      </div>
      <Button href="/my-garage" variant="ghost" className="ml-auto">
        Manage garage
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
```

(Also fixes the trigger link, which pointed at the never-built `/garage` route instead of `/my-garage`.)

- [ ] **Step 2: Update `src/features/garage/index.ts`**

```ts
export { GarageBar } from "./ui/garage-bar";
export { CarList } from "./ui/car-list";
export { CarFormDialog } from "./ui/car-form-dialog";
export { getCars } from "./model/cars";
export type { Car } from "./model/types";
```

- [ ] **Step 3: Update `src/views/home/ui/home-view.tsx`**

Change the `GarageBar` line:

```tsx
{user && <GarageBar userId={user.id} />}
```

- [ ] **Step 4: Update `src/views/my-garage/ui/my-garage-view.tsx`**

```tsx
import type { AuthUser } from "@/features/auth";
import { CarFormDialog, CarList, getCars } from "@/features/garage";

type MyGarageViewProps = {
  user: AuthUser;
};

export async function MyGarageView({ user }: MyGarageViewProps) {
  const cars = await getCars(user.id);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-extrabold">
          {user.name}&apos;s Garage
        </h1>
        <CarFormDialog mode="create" />
      </div>
      <CarList cars={cars} />
    </main>
  );
}
```

- [ ] **Step 5: Verify lint and types**

Run: `pnpm lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual smoke check in the browser**

Run: `pnpm dev`, then in a browser: log in, go to `/my-garage`, add a car via the dialog, confirm it appears in the grid, edit it, confirm the change shows, delete it (cancel once, then confirm), confirm it's removed, then check the homepage `GarageBar` reflects the current car count.
Expected: all of the above work with no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/garage/ui/garage-bar.tsx src/features/garage/index.ts src/views/home/ui/home-view.tsx src/views/my-garage/ui/my-garage-view.tsx
git commit -m "feat: wire garage CRUD into my-garage and the homepage"
```

---

### Task 10: Playwright E2E suite

**Files:**
- Create: `tests/garage.spec.ts`

**Interfaces:**
- Consumes: the full CRUD flow through the UI (no new exported interfaces).

- [ ] **Step 1: Create `tests/garage.spec.ts`**

```ts
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL,
});

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Garage Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");
}

async function addCar(page: Page, dialog: Locator) {
  await dialog.getByLabel("Make").fill("Toyota");
  await dialog.getByLabel("Model").fill("Supra");
  await dialog.getByLabel("Year").fill("2023");
  await dialog.getByLabel("Horsepower").fill("382");
  await dialog.getByRole("button", { name: "Add car" }).click();
}

test.beforeEach(async () => {
  await prisma.car.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("adding a car shows it in the garage list", async ({ page }) => {
  await signUp(page, "owner1@example.com");
  await page.goto("/my-garage");

  await page.getByRole("button", { name: "Add car" }).click();
  await addCar(page, page.getByRole("dialog"));

  await expect(page.getByText("2023 Toyota Supra")).toBeVisible();
});

test("adding a car updates the homepage garage count", async ({ page }) => {
  await signUp(page, "owner2@example.com");
  await page.goto("/my-garage");

  await page.getByRole("button", { name: "Add car" }).click();
  await addCar(page, page.getByRole("dialog"));
  await expect(page.getByText("2023 Toyota Supra")).toBeVisible();

  await page.goto("/");
  await expect(page.getByText(/1 cars/)).toBeVisible();
});

test("editing a car updates the list", async ({ page }) => {
  await signUp(page, "owner3@example.com");
  await page.goto("/my-garage");

  await page.getByRole("button", { name: "Add car" }).click();
  await addCar(page, page.getByRole("dialog"));
  await expect(page.getByText("2023 Toyota Supra")).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Model").fill("GR86");
  await editDialog.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("2023 Toyota GR86")).toBeVisible();
});

test("deleting a car requires confirmation", async ({ page }) => {
  await signUp(page, "owner4@example.com");
  await page.goto("/my-garage");

  await page.getByRole("button", { name: "Add car" }).click();
  await addCar(page, page.getByRole("dialog"));
  await expect(page.getByText("2023 Toyota Supra")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("2023 Toyota Supra")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("2023 Toyota Supra")).toHaveCount(0);
});

test("submitting the add form without required fields shows a field error and creates nothing", async ({
  page,
}) => {
  await signUp(page, "owner5@example.com");
  await page.goto("/my-garage");

  await page.getByRole("button", { name: "Add car" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Add car" }).click();

  await expect(page.getByText("Make is required")).toBeVisible();

  const carCount = await prisma.car.count();
  expect(carCount).toBe(0);
});
```

- [ ] **Step 2: Run the new suite**

Run: `pnpm test:e2e tests/garage.spec.ts`
Expected: all 5 tests pass.

- [ ] **Step 3: Run the full suite to check for regressions**

Run: `pnpm test:e2e`
Expected: all tests in both `tests/auth.spec.ts` and `tests/garage.spec.ts` pass.

- [ ] **Step 4: Commit**

```bash
git add tests/garage.spec.ts
git commit -m "test: add Playwright E2E suite for garage CRUD"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), auth refactor (Task 2), DAL/schema (Task 3), actions/authorization (Task 4), Dialog primitive (Task 5), add/edit form (Task 6), delete confirmation (Task 7), card/list UI (Task 8), `GarageBar`/view wiring (Task 9), Playwright coverage (Task 10) — every section of `0003-garage-crud-design.md` maps to a task.
- **Type consistency checked:** `Car`, `CarInput`, `Drivetrain`, `Transmission` field names and shapes match across `model/types.ts`, `model/schema.ts`, `model/actions.ts`, `model/cars.ts`, `car-form-dialog.tsx`, and `car-card.tsx`. `CarActionResult`'s `fieldErrors` keys (`keyof CarInput`) match every field `car-form-dialog.tsx` registers with RHF.
- **No placeholders:** every step has runnable code or an exact command.
