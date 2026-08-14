# Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Tracks Inc. homepage — Tailwind design-system theme, a features-based (FSD-lite) component architecture, and a fully mocked landing page — as the design source of truth for later pages.

**Architecture:** Five layers under `src/` (`app → views/layout → features → shared`), built bottom-up: shared primitives first, then each feature slice (tracks, leaderboards, garage, activity), then the persistent nav/footer chrome (`layout/`), then the page composition (`views/home`), then wiring it all into `app/layout.tsx` + `app/page.tsx`. Every feature owns its own mock data — no shared mock file, no cross-feature imports.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, `lucide-react` (new dependency, added in Task 4), ESLint (`eslint-config-next` + `eslint-plugin-boundaries` + `eslint-plugin-unicorn`), Prettier.

**Spec:** `docs/superpowers/specs/0001-homepage-design-system-design.md`

## Global Constraints

- All filenames under `src/` are kebab-case (`site-nav.tsx`, not `SiteNav.tsx`) — enforced by `pnpm lint`. Exported component names inside stay PascalCase.
- Feature-to-feature imports are never allowed — a feature may only import `shared`. Enforced by `pnpm lint`.
- Server Components only — no `"use client"` anywhere in this plan. The mobile nav toggle uses the native `<details>`/`<summary>` disclosure element with Tailwind's `group-open:` variant instead of React state, so `site-nav.tsx` never needs client-side JS.
- No images ship in this pass — `TrackCard`'s image slot is a blank `bg-neutral-200` box.
- Light theme only. Use only the semantic tokens defined in Task 1 (`bg-background`, `text-foreground`, `bg-accent-500`, etc.) — never raw hex or Tailwind's default gray/zinc/red palettes.
- No test framework exists in this repo and none is added by this plan (out of scope, not requested) — verification is `pnpm build` (typecheck), `pnpm lint` (Next rules + architecture boundaries + kebab-case), `pnpm format:check`, and manual browser verification per task 11 and AGENTS.md's "start the dev server and use the feature in a browser" rule.
- Every route defines its own `metadata` (title/description/OpenGraph) — no page ships without it.
- Package manager is `pnpm`. Commit messages use Conventional Commits (`feat:`, etc.) per `AGENTS.md`.
- The shared `Card` component from the spec is deliberately **not** built in this plan — nothing on the homepage needs a `bg-surface` elevated card (confirmed against the reference mock). Add it in a future plan when a real consumer exists.

---

### Task 1: Tailwind theme + asset cleanup

**Files:**

- Modify: `src/app/globals.css`
- Delete: `public/next.svg`, `public/vercel.svg`, `public/window.svg`, `public/file.svg`, `public/globe.svg`

**Interfaces:**

- Produces: CSS custom properties available to every component from Task 2 onward — `bg-background`, `text-foreground`, `bg-surface`, `border-divider`, `bg-accent-{100..900}`/`text-accent-{100..900}`, `bg-neutral-{100..900}`/`text-neutral-{100..900}`, `font-heading`, `font-body`, `shadow-{sm,md,lg}` Tailwind utility classes.

- [ ] **Step 1: Replace `src/app/globals.css` entirely**

```css
@import "tailwindcss";

:root {
  --background: #f3f2f2;
  --foreground: #201e1d;
  --surface: #eae9e9;
  --divider: color-mix(in srgb, #201e1d 40%, transparent);

  --accent-100: #fff2ef;
  --accent-200: #ffe0d9;
  --accent-300: #ffc4b8;
  --accent-400: #ff9783;
  --accent-500: #ff563c;
  --accent-600: #dd2b0f;
  --accent-700: #ae1800;
  --accent-800: #7c1405;
  --accent-900: #4d170e;

  --neutral-100: #f8f4f4;
  --neutral-200: #eae7e7;
  --neutral-300: #d7d3d3;
  --neutral-400: #bab6b6;
  --neutral-500: #9b9797;
  --neutral-600: #7d7979;
  --neutral-700: #605d5d;
  --neutral-800: #444141;
  --neutral-900: #2d2b2b;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-divider: var(--divider);

  --color-accent-100: var(--accent-100);
  --color-accent-200: var(--accent-200);
  --color-accent-300: var(--accent-300);
  --color-accent-400: var(--accent-400);
  --color-accent-500: var(--accent-500);
  --color-accent-600: var(--accent-600);
  --color-accent-700: var(--accent-700);
  --color-accent-800: var(--accent-800);
  --color-accent-900: var(--accent-900);

  --color-neutral-100: var(--neutral-100);
  --color-neutral-200: var(--neutral-200);
  --color-neutral-300: var(--neutral-300);
  --color-neutral-400: var(--neutral-400);
  --color-neutral-500: var(--neutral-500);
  --color-neutral-600: var(--neutral-600);
  --color-neutral-700: var(--neutral-700);
  --color-neutral-800: var(--neutral-800);
  --color-neutral-900: var(--neutral-900);

  --font-heading: var(--font-archivo, system-ui, sans-serif);
  --font-body: var(--font-archivo, system-ui, sans-serif);

  --shadow-sm: 0 1px 2px color-mix(in srgb, var(--foreground) 14%, transparent);
  --shadow-md: 0 3px 10px color-mix(in srgb, var(--foreground) 16%, transparent);
  --shadow-lg: 0 12px 32px
    color-mix(in srgb, var(--foreground) 22%, transparent);
}
```

- [ ] **Step 2: Delete the unused default public assets**

```bash
rm public/next.svg public/vercel.svg public/window.svg public/file.svg public/globe.svg
```

- [ ] **Step 3: Verify**

Run: `pnpm build`
Expected: succeeds (the still-default `page.tsx` references Tailwind's built-in `zinc`/`black` utilities, unrelated to our theme, so it still compiles at this checkpoint — it gets replaced in Task 10).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css public/
git commit -m "feat: replace default theme with Modernist-inspired design tokens"
```

---

### Task 2: Shared utilities

**Files:**

- Create: `src/shared/lib/cn.ts`
- Create: `src/shared/config/site.ts`
- Create: `src/shared/session/mock-session.ts`

**Interfaces:**

- Produces: `cn(...classes: (string | false | null | undefined)[]): string` from `@/shared/lib/cn`; `siteConfig: { name: string; navLinks: { label: string; href: string }[] }` from `@/shared/config/site`; `isLoggedIn: boolean` from `@/shared/session/mock-session`.

- [ ] **Step 1: Create `src/shared/lib/cn.ts`**

```ts
type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Step 2: Create `src/shared/config/site.ts`**

```ts
export const siteConfig = {
  name: "Tracks Inc.",
  navLinks: [
    { label: "Leaderboards", href: "/leaderboards" },
    { label: "Tracks", href: "/tracks" },
  ],
} as const;
```

- [ ] **Step 3: Create `src/shared/session/mock-session.ts`**

```ts
export const isLoggedIn = false;
```

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm build`
Expected: both succeed (kebab-case filenames, no boundary violations — `shared` has no outgoing imports to check yet).

- [ ] **Step 5: Commit**

```bash
git add src/shared
git commit -m "feat: add shared lib/config/session utilities"
```

---

### Task 3: Shared UI primitives — Button + Tag

**Files:**

- Create: `src/shared/ui/button/button.tsx`
- Create: `src/shared/ui/tag/tag.tsx`
- Create: `src/shared/ui/index.ts`

**Interfaces:**

- Consumes: `cn` from `@/shared/lib/cn` (Task 2).
- Produces: `Button` component and `ButtonVariant` type; `Tag` component and `TagVariant` type — both from `@/shared/ui`.
  - `Button` props: `{ variant?: "primary" | "secondary" | "ghost"; href?: string; className?: string; children: ReactNode }`. Renders a `next/link` `<Link>` when `href` is given, otherwise a `<button type="button">` (kept for the near-certain next need — a real "Log out" action, form submits — even though every call site in this plan uses `href`).
  - `Tag` props: `{ variant?: "accent" | "neutral" | "outline"; className?: string; children: ReactNode }`.

- [ ] **Step 1: Create `src/shared/ui/button/button.tsx`**

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = {
  variant?: ButtonVariant;
  href?: string;
  className?: string;
  children: ReactNode;
};

const baseClasses =
  "inline-flex items-center gap-1.5 whitespace-nowrap py-2 font-heading text-sm font-extrabold outline-none transition-colors focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-500 px-4 text-background hover:bg-accent-600 active:bg-accent-700",
  secondary:
    "border border-divider px-4 hover:bg-foreground/5 active:bg-foreground/10",
  ghost: "px-1 text-accent-500 hover:bg-accent-500/10 active:bg-accent-500/20",
};

export function Button({
  variant = "primary",
  href,
  className,
  children,
}: ButtonProps) {
  const classes = cn(baseClasses, variantClasses[variant], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create `src/shared/ui/tag/tag.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type TagVariant = "accent" | "neutral" | "outline";

type TagProps = {
  variant?: TagVariant;
  className?: string;
  children: ReactNode;
};

const variantClasses: Record<TagVariant, string> = {
  accent: "bg-accent-100 text-accent-800",
  neutral: "bg-neutral-100 text-neutral-800",
  outline: "border border-accent-500 text-accent-500",
};

export function Tag({ variant = "neutral", className, children }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold tracking-wide",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Create `src/shared/ui/index.ts`**

```ts
export { Button } from "./button/button";
export type { ButtonVariant } from "./button/button";
export { Tag } from "./tag/tag";
export type { TagVariant } from "./tag/tag";
```

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui
git commit -m "feat: add shared Button and Tag primitives"
```

---

### Task 4: Feature — tracks

**Files:**

- Create: `src/features/tracks/model/types.ts`
- Create: `src/features/tracks/model/mock.ts`
- Create: `src/features/tracks/ui/track-card.tsx`
- Create: `src/features/tracks/ui/tracks-section.tsx`
- Create: `src/features/tracks/index.ts`

**Interfaces:**

- Consumes: `Tag` from `@/shared/ui` (Task 3); `lucide-react` icons (new dependency, this task).
- Produces: `TracksSection` component (zero props, renders its own mock data) from `@/features/tracks`.

- [ ] **Step 1: Add the `lucide-react` dependency**

```bash
pnpm add lucide-react
```

- [ ] **Step 2: Create `src/features/tracks/model/types.ts`**

```ts
export type Track = {
  name: string;
  country: string;
  length: string;
  corners: number;
  elevation: string;
};
```

- [ ] **Step 3: Create `src/features/tracks/model/mock.ts`**

```ts
import type { Track } from "./types";

export const mockTracks: Track[] = [
  {
    name: "Nürburgring Nordschleife",
    country: "Germany",
    length: "20.8 km",
    corners: 154,
    elevation: "300m",
  },
  {
    name: "Circuit de la Sarthe",
    country: "France",
    length: "13.6 km",
    corners: 38,
    elevation: "30m",
  },
  {
    name: "Spa-Francorchamps",
    country: "Belgium",
    length: "7.0 km",
    corners: 20,
    elevation: "100m",
  },
];
```

- [ ] **Step 4: Create `src/features/tracks/ui/track-card.tsx`**

```tsx
import { ArrowRight, Mountain, Ruler } from "lucide-react";
import { Button, Tag } from "@/shared/ui";
import type { Track } from "../model/types";

export function TrackCard({ track }: { track: Track }) {
  return (
    <div className="flex flex-col gap-3.5 bg-background p-6">
      <div className="flex h-[180px] items-center justify-center bg-neutral-200" />
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-extrabold">{track.name}</h3>
        <p className="text-sm text-foreground/60">
          {track.country} · {track.length}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Tag>
          <Ruler className="h-3 w-3" />
          {track.corners} corners
        </Tag>
        <Tag>
          <Mountain className="h-3 w-3" />
          {track.elevation} elevation
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

- [ ] **Step 5: Create `src/features/tracks/ui/tracks-section.tsx`**

```tsx
import { mockTracks } from "../model/mock";
import { TrackCard } from "./track-card";

export function TracksSection() {
  return (
    <section className="flex flex-col gap-7 py-14">
      <div className="flex items-baseline justify-between border-b-2 border-divider pb-4">
        <h2 className="font-heading text-3xl font-extrabold">Tracks</h2>
        <span className="text-sm text-foreground/60">
          {mockTracks.length} circuits
        </span>
      </div>
      <div className="grid grid-cols-1 gap-px bg-divider sm:grid-cols-2 lg:grid-cols-3">
        {mockTracks.map((track) => (
          <TrackCard key={track.name} track={track} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Create `src/features/tracks/index.ts`**

```ts
export { TracksSection } from "./ui/tracks-section";
```

- [ ] **Step 7: Verify**

Run: `pnpm lint && pnpm build`
Expected: both succeed.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml src/features/tracks
git commit -m "feat: add tracks feature"
```

---

### Task 5: Feature — leaderboards

**Files:**

- Create: `src/features/leaderboards/model/types.ts`
- Create: `src/features/leaderboards/model/mock.ts`
- Create: `src/features/leaderboards/ui/leaderboard-card.tsx`
- Create: `src/features/leaderboards/ui/leaderboards-section.tsx`
- Create: `src/features/leaderboards/index.ts`

**Interfaces:**

- Consumes: `cn` from `@/shared/lib/cn` (Task 2).
- Produces: `LeaderboardsSection` component (zero props) from `@/features/leaderboards`.

- [ ] **Step 1: Create `src/features/leaderboards/model/types.ts`**

```ts
export type PodiumEntry = {
  rank: string;
  car: string;
  time: string;
  highlight: boolean;
};

export type Leaderboard = {
  title: string;
  trackName: string;
  podium: PodiumEntry[];
};
```

- [ ] **Step 2: Create `src/features/leaderboards/model/mock.ts`**

```ts
import type { Leaderboard } from "./types";

export const mockLeaderboards: Leaderboard[] = [
  {
    title: "Fastest overall",
    trackName: "Nürburgring Nordschleife",
    podium: [
      { rank: "01", car: "Porsche 911 GT3", time: "7:12.450", highlight: true },
      { rank: "02", car: "BMW M3", time: "7:24.810", highlight: false },
      {
        rank: "03",
        car: "Renault Mégane R.S.",
        time: "7:48.220",
        highlight: false,
      },
    ],
  },
  {
    title: "Fastest RWD",
    trackName: "Nürburgring Nordschleife",
    podium: [
      { rank: "01", car: "Porsche 911 GT3", time: "7:12.450", highlight: true },
    ],
  },
  {
    title: "Fastest overall",
    trackName: "Circuit de la Sarthe",
    podium: [
      { rank: "01", car: "Porsche 911 GT3", time: "3:48.900", highlight: true },
      { rank: "02", car: "BMW M3", time: "3:55.200", highlight: false },
    ],
  },
  {
    title: "Fastest overall",
    trackName: "Spa-Francorchamps",
    podium: [
      { rank: "01", car: "Porsche 911 GT3", time: "2:18.760", highlight: true },
      { rank: "02", car: "BMW M3", time: "2:22.140", highlight: false },
      {
        rank: "03",
        car: "Renault Mégane R.S.",
        time: "2:31.500",
        highlight: false,
      },
    ],
  },
];
```

- [ ] **Step 3: Create `src/features/leaderboards/ui/leaderboard-card.tsx`**

```tsx
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import type { Leaderboard } from "../model/types";

export function LeaderboardCard({ leaderboard }: { leaderboard: Leaderboard }) {
  return (
    <div className="flex flex-col gap-4 bg-background p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-accent-700 uppercase">
          <MapPin className="h-3 w-3" />
          {leaderboard.trackName}
        </div>
        <h3 className="font-heading text-xl font-extrabold">
          {leaderboard.title}
        </h3>
      </div>
      <div className="flex flex-col">
        {leaderboard.podium.map((entry) => (
          <div
            key={entry.rank}
            className={cn(
              "flex items-center gap-3 border-l-2 px-3 py-2.5",
              entry.highlight
                ? "border-accent-500 bg-accent-100"
                : "border-transparent",
            )}
          >
            <span
              className={cn(
                "w-5 font-heading text-sm font-extrabold",
                entry.highlight ? "text-accent-700" : "text-foreground",
              )}
            >
              {entry.rank}
            </span>
            <span className="flex-1 text-sm font-semibold">{entry.car}</span>
            <span className="font-heading text-sm font-extrabold tabular-nums">
              {entry.time}
            </span>
          </div>
        ))}
      </div>
      <Button href="/leaderboards" variant="ghost" className="mt-1">
        View full leaderboard
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/features/leaderboards/ui/leaderboards-section.tsx`**

```tsx
import { mockLeaderboards } from "../model/mock";
import { LeaderboardCard } from "./leaderboard-card";

export function LeaderboardsSection() {
  return (
    <section className="flex flex-col gap-7 py-14">
      <div className="flex items-baseline justify-between border-b-2 border-divider pb-4">
        <h2 className="font-heading text-3xl font-extrabold">
          Hottest Leaderboards
        </h2>
        <span className="text-sm text-foreground/60">
          {mockLeaderboards.length} active
        </span>
      </div>
      <div className="grid grid-cols-1 gap-px bg-divider md:grid-cols-2">
        {mockLeaderboards.map((leaderboard) => (
          <LeaderboardCard
            key={`${leaderboard.title}-${leaderboard.trackName}`}
            leaderboard={leaderboard}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create `src/features/leaderboards/index.ts`**

```ts
export { LeaderboardsSection } from "./ui/leaderboards-section";
```

- [ ] **Step 6: Verify**

Run: `pnpm lint && pnpm build`
Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add src/features/leaderboards
git commit -m "feat: add leaderboards feature"
```

---

### Task 6: Feature — garage

**Files:**

- Create: `src/features/garage/model/types.ts`
- Create: `src/features/garage/model/mock.ts`
- Create: `src/features/garage/ui/garage-bar.tsx`
- Create: `src/features/garage/index.ts`

**Interfaces:**

- Produces: `GarageBar` component (zero props) from `@/features/garage`.

- [ ] **Step 1: Create `src/features/garage/model/types.ts`**

```ts
export type Garage = {
  cars: number;
  personalBest: string;
  personalBestTrack: string;
  rank: number;
};
```

- [ ] **Step 2: Create `src/features/garage/model/mock.ts`**

```ts
import type { Garage } from "./types";

export const mockGarage: Garage = {
  cars: 2,
  personalBest: "7:12.450",
  personalBestTrack: "Nürburgring Nordschleife",
  rank: 1,
};
```

- [ ] **Step 3: Create `src/features/garage/ui/garage-bar.tsx`**

```tsx
import { ArrowRight, Car } from "lucide-react";
import { Button } from "@/shared/ui";
import { mockGarage } from "../model/mock";

export function GarageBar() {
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
          {mockGarage.cars} cars · PB {mockGarage.personalBest} at{" "}
          {mockGarage.personalBestTrack} · Rank #{mockGarage.rank} overall
        </span>
      </div>
      <Button href="/garage" variant="ghost" className="ml-auto">
        Manage garage
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/features/garage/index.ts`**

```ts
export { GarageBar } from "./ui/garage-bar";
```

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm build`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add src/features/garage
git commit -m "feat: add garage feature"
```

---

### Task 7: Feature — activity

**Files:**

- Create: `src/features/activity/model/types.ts`
- Create: `src/features/activity/model/mock.ts`
- Create: `src/features/activity/ui/activity-ticker.tsx`
- Create: `src/features/activity/index.ts`

**Interfaces:**

- Produces: `ActivityTicker` component (zero props) from `@/features/activity`.

- [ ] **Step 1: Create `src/features/activity/model/types.ts`**

```ts
export type ActivityItem = {
  text: string;
};
```

- [ ] **Step 2: Create `src/features/activity/model/mock.ts`**

```ts
import type { ActivityItem } from "./types";

export const mockActivity: ActivityItem[] = [
  { text: "Porsche 911 GT3 set a new PB at Spa-Francorchamps — 2:18.760" },
  { text: "BMW M3 logged 3:55.200 at Circuit de la Sarthe" },
  {
    text: "Renault Mégane R.S. joined Fastest Overall — Nürburgring Nordschleife",
  },
];
```

- [ ] **Step 3: Create `src/features/activity/ui/activity-ticker.tsx`**

```tsx
import { mockActivity } from "../model/mock";

export function ActivityTicker() {
  return (
    <div className="flex items-center gap-5 overflow-x-auto border-y-2 border-divider py-3.5">
      <span className="shrink-0 text-xs font-extrabold tracking-wide text-accent-500 uppercase">
        Recent
      </span>
      {mockActivity.map((item) => (
        <span
          key={item.text}
          className="border-r border-divider pr-5 text-sm whitespace-nowrap text-foreground/85 last:border-r-0"
        >
          {item.text}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/features/activity/index.ts`**

```ts
export { ActivityTicker } from "./ui/activity-ticker";
```

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm build`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add src/features/activity
git commit -m "feat: add activity feature"
```

---

### Task 8: Layout — site-nav + site-footer

**Files:**

- Create: `src/layout/site-nav/ui/site-nav.tsx`
- Create: `src/layout/site-nav/index.ts`
- Create: `src/layout/site-footer/ui/site-footer.tsx`
- Create: `src/layout/site-footer/index.ts`

**Interfaces:**

- Consumes: `Button` from `@/shared/ui` (Task 3); `siteConfig` from `@/shared/config/site` (Task 2); `isLoggedIn` from `@/shared/session/mock-session` (Task 2).
- Produces: `SiteNav` component from `@/layout/site-nav`; `SiteFooter` component from `@/layout/site-footer`. Both zero-prop.

- [ ] **Step 1: Create `src/layout/site-nav/ui/site-nav.tsx`**

Uses the native `<details>`/`<summary>` disclosure element for the mobile menu, so the whole component stays a Server Component — no `"use client"`, no `useState`. `<details>` has `group` on it; the `Menu`/`X` icons swap via Tailwind's `group-open:` variant (targets the ancestor's `open` attribute), and the panel is the sibling content `<details>` shows/hides natively when `<summary>` is activated. The panel is positioned `absolute` under a `relative` `<header>` so it overlays full-width below the nav bar rather than being constrained to the hamburger's own flex-item column.

```tsx
import { Menu, X } from "lucide-react";
import { Button } from "@/shared/ui";
import { siteConfig } from "@/shared/config/site";
import { isLoggedIn } from "@/shared/session/mock-session";

export function SiteNav() {
  return (
    <header className="relative border-b-2 border-divider">
      <nav className="flex items-center gap-8 px-6 py-4 md:px-12">
        <span className="font-heading text-lg font-extrabold tracking-tight">
          {siteConfig.name}
        </span>

        <ul className="ml-auto hidden items-center gap-6 md:flex">
          {siteConfig.navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-semibold hover:text-accent-500"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-2.5 md:flex">
          {isLoggedIn ? (
            <>
              <a href="/garage" className="text-sm font-semibold">
                My Garage
              </a>
              <button
                type="button"
                className="text-sm font-semibold text-accent-500"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Button href="/login" variant="secondary">
                Log in
              </Button>
              <Button href="/signup" variant="primary">
                Sign up
              </Button>
            </>
          )}
        </div>

        <details className="group ml-auto md:hidden">
          <summary
            aria-label="Toggle menu"
            className="flex h-9 w-9 list-none items-center justify-center outline-none marker:hidden focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
          >
            <Menu className="h-5 w-5 group-open:hidden" />
            <X className="hidden h-5 w-5 group-open:block" />
          </summary>

          <div className="absolute inset-x-0 top-full flex flex-col gap-4 border-t-2 border-divider bg-background px-6 py-5 shadow-lg">
            {siteConfig.navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold"
              >
                {link.label}
              </a>
            ))}
            {isLoggedIn ? (
              <>
                <a href="/garage" className="text-sm font-semibold">
                  My Garage
                </a>
                <button
                  type="button"
                  className="text-left text-sm font-semibold text-accent-500"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="flex gap-2.5">
                <Button href="/login" variant="secondary">
                  Log in
                </Button>
                <Button href="/signup" variant="primary">
                  Sign up
                </Button>
              </div>
            )}
          </div>
        </details>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Create `src/layout/site-nav/index.ts`**

```ts
export { SiteNav } from "./ui/site-nav";
```

- [ ] **Step 3: Create `src/layout/site-footer/ui/site-footer.tsx`**

```tsx
import { siteConfig } from "@/shared/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto flex flex-col items-center justify-between gap-2 border-t-2 border-divider px-6 py-8 sm:flex-row md:px-12">
      <span className="font-heading text-sm font-extrabold">
        {siteConfig.name}
      </span>
      <span className="text-xs text-foreground/50">
        Lap times logged by the community. Not affiliated with any circuit.
      </span>
    </footer>
  );
}
```

- [ ] **Step 4: Create `src/layout/site-footer/index.ts`**

```ts
export { SiteFooter } from "./ui/site-footer";
```

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm build`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add src/layout
git commit -m "feat: add site-nav and site-footer layout chrome"
```

---

### Task 9: View — home

**Files:**

- Create: `src/views/home/ui/hero.tsx`
- Create: `src/views/home/ui/home-view.tsx`
- Create: `src/views/home/index.ts`

**Interfaces:**

- Consumes: `Button` from `@/shared/ui` (Task 3); `isLoggedIn` from `@/shared/session/mock-session` (Task 2); `ActivityTicker` from `@/features/activity` (Task 7); `GarageBar` from `@/features/garage` (Task 6); `LeaderboardsSection` from `@/features/leaderboards` (Task 5); `TracksSection` from `@/features/tracks` (Task 4).
- Produces: `HomeView` component (zero props) from `@/views/home`.

- [ ] **Step 1: Create `src/views/home/ui/hero.tsx`**

```tsx
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui";

export function Hero() {
  return (
    <section className="flex flex-col gap-6 py-16 sm:py-20">
      <h1 className="max-w-3xl font-heading text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl md:text-6xl">
        Log the lap.
        <br />
        Own the <span className="text-accent-500">record.</span>
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-foreground/85 sm:text-lg">
        Track your lap times, compare against real drivers, and see exactly
        where you rank at Nürburgring, Le Mans, and Spa.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Button href="/signup" variant="primary">
          Create free account
        </Button>
        <Button href="/leaderboards" variant="secondary">
          Browse leaderboards
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `src/views/home/ui/home-view.tsx`**

```tsx
import { ActivityTicker } from "@/features/activity";
import { GarageBar } from "@/features/garage";
import { LeaderboardsSection } from "@/features/leaderboards";
import { TracksSection } from "@/features/tracks";
import { isLoggedIn } from "@/shared/session/mock-session";
import { Hero } from "./hero";

export function HomeView() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-6 md:px-12">
      <Hero />
      <ActivityTicker />
      {isLoggedIn && <GarageBar />}
      <LeaderboardsSection />
      <TracksSection />
    </main>
  );
}
```

- [ ] **Step 3: Create `src/views/home/index.ts`**

```ts
export { HomeView } from "./ui/home-view";
```

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/views
git commit -m "feat: add home view composing hero and feature sections"
```

---

### Task 10: Wire `app/`

**Files:**

- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**

- Consumes: `SiteNav` from `@/layout/site-nav` (Task 8); `SiteFooter` from `@/layout/site-footer` (Task 8); `HomeView` from `@/views/home` (Task 9).

- [ ] **Step 1: Replace `src/app/layout.tsx` entirely**

```tsx
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { SiteFooter } from "@/layout/site-footer";
import { SiteNav } from "@/layout/site-nav";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Tracks Inc. — Log the lap. Own the record.",
    template: "%s · Tracks Inc.",
  },
  description:
    "Track your lap times, compare against real drivers, and see exactly where you rank at Nürburgring, Le Mans, and Spa.",
  openGraph: {
    title: "Tracks Inc.",
    description:
      "Track your lap times, compare against real drivers, and see exactly where you rank at Nürburgring, Le Mans, and Spa.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-background font-body text-foreground antialiased">
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace `src/app/page.tsx` entirely**

```tsx
import type { Metadata } from "next";
import { HomeView } from "@/views/home";

export const metadata: Metadata = {
  title: "Log the lap. Own the record.",
  description:
    "Track your lap times, compare against real drivers, and see exactly where you rank at Nürburgring, Le Mans, and Spa.",
};

export default function Home() {
  return <HomeView />;
}
```

- [ ] **Step 3: Verify**

Run: `pnpm lint && pnpm build && pnpm format:check`
Expected: all three succeed.

- [ ] **Step 4: Commit**

```bash
git add src/app
git commit -m "feat: wire homepage into app router"
```

---

### Task 11: Full verification

**Files:** None (verification only).

- [ ] **Step 1: Confirm the boundaries rule actually blocks a cross-feature import**

Temporarily add this line to the top of `src/features/leaderboards/model/mock.ts`:

```ts
import { TracksSection } from "@/features/tracks";
```

`TracksSection` is a real export of `@/features/tracks` (Task 4) — using an actual export keeps this a clean boundaries-only failure, not a mix of a boundaries error and an unrelated "no exported member" error.

Run: `pnpm lint`
Expected: fails with a `boundaries/dependencies` error on that import.

Then remove the line and re-run `pnpm lint` — expected: passes clean again. Do not commit the temporary line.

- [ ] **Step 2: Full static verification**

Run: `pnpm build && pnpm lint && pnpm format:check`
Expected: all three pass with zero errors/warnings.

- [ ] **Step 3: Browser verification (per AGENTS.md — start the dev server and use the feature in a browser before reporting complete)**

Run: `pnpm dev`, open `http://localhost:3000`. Check:

- Hero, activity ticker, leaderboards grid, tracks grid (blank neutral-200 boxes where images will go), footer, and nav all render with the Modernist theme (flat, red accent, Archivo, 2px dividers, zero border radius).
- Resize to mobile (~375px), tablet (~768px), and desktop (~1280px) widths: nav collapses to a hamburger below `md:` and the slide-down panel opens/closes on click; leaderboards grid goes 1 col → 2 col at `md:`; tracks grid goes 1 col → 2 col at `sm:` → 3 col at `lg:`; garage bar wraps on narrow screens.
- Temporarily set `isLoggedIn` to `true` in `src/shared/session/mock-session.ts`, refresh, confirm the garage bar appears and the nav shows "My Garage"/"Log out" instead of "Log in"/"Sign up" (both desktop and mobile panel) — then set it back to `false` and refresh to confirm the default state. Do not commit `true`.

- [ ] **Step 4: SEO audit (per AGENTS.md's SEO section)**

Using the browser's dev tools on `http://localhost:3000`:

- View page source / the Elements panel: exactly one `<h1>` (in Hero), followed by `<h2>`s (Leaderboards, Tracks section headings) and `<h3>`s (individual card titles) — no skipped levels.
- Confirm `<header><nav>`, `<main>`, and `<footer>` landmark elements are all present exactly once.
- Confirm `<title>` renders as "Log the lap. Own the record. · Tracks Inc." (page title + layout template) and a `<meta name="description">` and `og:title`/`og:description`/`og:type` tags are present in `<head>`.
- Confirm all nav links (`Leaderboards`, `Tracks`, `Log in`, `Sign up`) and CTA links (`Create free account`, `Browse leaderboards`, `See leaderboards`, `View full leaderboard`, `Manage garage`) render as real `<a href="...">` elements (via `Button`'s `href` branch or plain `<a>`), not `<button>`/`<span>` — crawlable.

No commit for this task (verification only, and the temporary changes in Steps 1 and 3 must be reverted before finishing).
