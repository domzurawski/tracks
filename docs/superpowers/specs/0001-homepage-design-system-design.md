# Homepage design system & landing page

## Context

The project is a fresh Next.js scaffold with no product UI yet. A reference package (`~/Downloads/Homepage redesign request/`) was provided containing a "Modernist" design-system export (a design tool's `styles.css` + `readme.md` token/component reference) and a redesign mock (`Homepage Redesign.dc.html`) for "Tracks Inc." — a lap-time tracking app where drivers log times at real circuits (Nürburgring Nordschleife, Circuit de la Sarthe/Le Mans, Spa-Francorchamps) and compare against leaderboards.

The goal is to establish this project's own Tailwind design system, informed by the Modernist system's visual direction, and build the mocked homepage as the first real page — serving as the design source of truth that later pages and real data will build from. The attached CSS/component files themselves are reference material only; nothing is copied verbatim from them, and no dark theme is implemented yet, though the token architecture must support adding one later without touching component code.

## Visual direction (informed by, not copied from, the reference package)

Flat and architectural: Archivo everywhere, a near-mono red-on-white palette, strong 2px dividers between sections, zero border radius anywhere, content laid out in equal-width modular grid cells, labels flush-left (headings and button text are never centered), photography (the track diagrams) printed in grayscale. The one deliberate exception to "mostly ink on ground" is sparing accent use for the primary action and small emphasis.

## Tailwind v4 theme — brand new, authored fresh

`src/app/globals.css` holds the entire theme:

1. `@import "tailwindcss";`
2. `:root` — semantic light-mode token values
3. `@theme inline` — aliases the `:root` tokens into Tailwind's utility-generating namespaces
4. Nothing else. No base-element CSS, no component classes. Typography, focus rings, and selection color are expressed as Tailwind utilities (`focus-visible:`, `selection:` variants) directly in component JSX, not in global CSS.

### Tokens

| Token | Light value | Tailwind namespace | Notes |
|---|---|---|---|
| `--background` | `#f3f2f2` | `--color-background` | page ground |
| `--foreground` | `#201e1d` | `--color-foreground` | body text |
| `--surface` | `#eae9e9` | `--color-surface` | card/tag fills |
| `--divider` | `color-mix(in srgb, var(--foreground) 40%, transparent)` | `--color-divider` | 2px rules between sections |
| `--accent-100..900` | 9-step ramp, `#fff2ef` → `#4d170e` | `--color-accent-100..900` | single accent voice; base = 500, hover = 600, pressed = 700 |
| `--neutral-100..900` | 9-step ramp, `#f8f4f4` → `#2d2b2b` | `--color-neutral-100..900` | neutral tags, muted text |
| `--font-heading`, `--font-body` | Archivo (`next/font/google`, weights 400/600/800) | `--font-heading`, `--font-body` | same family, both roles |
| `--shadow-sm/md/lg` | ink-tinted, e.g. `color-mix(in srgb, var(--foreground) 14%, transparent)` | `--shadow-sm/md/lg` | deliberate override of Tailwind's default shadow scale — used for card elevation |

Deliberately dropped from the reference system:

- **`accent-2` ramp** — the reference readme itself calls it a machine-derived stand-in with no distinct visual role in a mono scheme; not worth carrying into a from-scratch theme.
- **`--radius-*` tokens** — no component CSS references them (nothing is ported), so they're unnecessary. Flush corners are written as the `rounded-none` utility directly wherever needed; Tailwind's own `rounded-sm/md/lg` scale is left untouched and keeps its normal meaning everywhere else in the app.
- **`--space-*` tokens** — the reference scale (4/8/12/16/24/32px) is numerically identical to Tailwind's default `p-1/2/3/4/6/8` spacing scale, so those built-ins are used directly instead.

### Dark-mode readiness

No dark values ship in this pass. The indirection (`:root` semantic vars → `@theme inline` alias) plus a strict rule that components only ever use semantic utility classes (`bg-background`, `text-foreground`, `bg-accent-500` — never raw hex or the neutral Tailwind palette) means a future dark theme is a `:root[data-theme="dark"]` override block with new values; no component changes required.

## Application architecture — Feature-Sliced Design

The project follows [Feature-Sliced Design](https://feature-sliced.design). Layers live under `src/`, alongside (not inside) the Next.js `app/` router, which stays a thin routing shell that composes from the top FSD layer:

```
src/
  app/                          # Next.js App Router — routing only, no business logic
    layout.tsx
    page.tsx                    # renders <HomeView /> from src/views/home
    globals.css

  views/                        # FSD "pages" layer, named views/ to avoid clashing with
    home/                       # Next's own app/page.tsx convention
      ui/HomeView.tsx           # composes the widgets in order
      index.ts

  widgets/
    site-nav/ui/SiteNav.tsx               # brand, links, auth-state-aware actions,
                                           # mobile hamburger (client component, local useState)
    hero/ui/Hero.tsx
    activity-ticker/ui/ActivityTicker.tsx
    garage-bar/ui/GarageBar.tsx           # rendered only when logged in
    leaderboards-section/ui/LeaderboardsSection.tsx
    tracks-section/ui/TracksSection.tsx
    site-footer/ui/SiteFooter.tsx
    # each widget slice also has its own index.ts public API

  entities/
    track/        ui/TrackCard.tsx        model/types.ts   model/mock.ts   index.ts
    leaderboard/   ui/LeaderboardCard.tsx  model/types.ts   model/mock.ts   index.ts
    garage/                                model/types.ts   model/mock.ts   index.ts
    activity/                              model/types.ts   model/mock.ts   index.ts

  features/                     # intentionally empty for now — no interaction on this page
                                 # rises to a real business use-case yet (auth, garage
                                 # management, leaderboard filtering are future candidates)

  shared/
    ui/button/, ui/tag/, ui/card/, ui/index.ts   # Button (primary/secondary/ghost/icon/block,
                                                  # polymorphic — <a> when given href), Tag
                                                  # (accent/neutral/outline), Card (+ Kicker/
                                                  # Title/Body/Meta) — no CSS ported from the
                                                  # reference styles.css, pure Tailwind utility JSX
    lib/cn.ts                   # className-merge helper, if needed
    config/site.ts              # genuinely app-wide constants (nav links, brand name)
```

Rules: every slice exposes its contents only through its `index.ts` public API — consumers never deep-import a slice's internals. Imports flow one direction only: `app → views → widgets → features → entities → shared`; nothing imports from a layer above it, and same-layer cross-slice imports are avoided. `shared` in particular must stay free of any domain knowledge (tracks, leaderboards, garages) — anything that knows about the product's nouns belongs in `entities` or above.

Icons: `lucide-react` — `MapPin`, `ArrowRight`, `Car`, `Ruler`, `Mountain`, `Menu`, `X`, used directly inside the widget/entity components that need them.

The existing `@/*` path alias (from the create-next-app scaffold) already resolves to `src/*` and needs no change to support this layout.

## Data

Mock data lives with its entity, not in a shared file: `entities/track/model/mock.ts`, `entities/leaderboard/model/mock.ts`, `entities/garage/model/mock.ts`, `entities/activity/model/mock.ts`, typed by each entity's `model/types.ts` (`Track`, `Leaderboard` + podium rows, `Garage`, `ActivityItem`) — mirroring the shapes used in the reference mock's script block: 4 leaderboard entries (1-3 podium rows each), 3 tracks (Nürburgring Nordschleife, Circuit de la Sarthe, Spa-Francorchamps), 3 activity feed lines, one garage summary. Swapping in real data later is a per-entity change (replace that slice's `model/mock.ts` usage with a real fetch), not a shared-file rewrite.

`isLoggedIn` is a single `const` at the top of `src/views/home/ui/HomeView.tsx` (default `false`), gating the nav's auth affordances and whether `GarageBar` renders — matches the reference mock's own logged-in/out toggle, easy to flip for visual QA now and to wire to real auth later.

## Mobile responsiveness

- **Nav**: brand + hamburger icon below `md:`; tapping opens a slide-out/dropdown panel with links and auth actions; full horizontal bar restored at `md:` and up
- **Hero**: responsive type scale (e.g. `text-4xl sm:text-5xl md:text-6xl`), stacks naturally in a column at all sizes
- **Activity ticker**: horizontally scrollable row (`overflow-x-auto`), already narrow-safe
- **Garage bar**: wraps (`flex-wrap`) on narrow screens instead of the desktop single row
- **Leaderboards grid**: 1 column → 2 columns at `md:`
- **Tracks grid**: 1 column → 2 columns at `sm:` → 3 columns at `lg:`
- **Grid "divider" look**: reference mock's trick of a `background` color showing through a `gap`, reimplemented with our own tokens as a `gap-px bg-divider` container with `bg-background` cells

## Assets & fonts

- Copy the three track SVGs (`nurburgring-nordschleife.svg`, `le-mans.svg`, `spa-francorchamps.svg`) from the reference package into `public/tracks/`
- Load Archivo via `next/font/google` (weights 400/600/800), replacing the current Geist fonts in `src/app/layout.tsx`
- Remove the unused default create-next-app public assets (`next.svg`, `vercel.svg`, `window.svg`, `file.svg`, `globe.svg`) since the new homepage doesn't reference them
- Light theme only — no dark-mode CSS shipped in this pass

## Verification

- `pnpm dev` — visually check hero, activity ticker, leaderboards grid, tracks grid, footer, and nav (both `isLoggedIn` states via toggling the const) at mobile, tablet, and desktop widths
- `pnpm build` — production build succeeds
- `pnpm biome check .` — lints and formats clean
