# Homepage design system & landing page

## Context

The project is a fresh Next.js scaffold with no product UI yet. A reference package (`~/Downloads/Homepage redesign request/`) was provided containing a "Modernist" design-system export (a design tool's `styles.css` + `readme.md` token/component reference) and a redesign mock (`Homepage Redesign.dc.html`) for "Tracks Inc." — a lap-time tracking app where drivers log times at real circuits (Nürburgring Nordschleife, Circuit de la Sarthe/Le Mans, Spa-Francorchamps) and compare against leaderboards.

The goal is to establish this project's own Tailwind design system, informed by the Modernist system's visual direction, and build the mocked homepage as the first real page — serving as the design source of truth that later pages and real data will build from. The attached CSS/component files themselves are reference material only; nothing is copied verbatim from them, and no dark theme is implemented yet, though the token architecture must support adding one later without touching component code.

## Visual direction (informed by, not copied from, the reference package)

Flat and architectural: Archivo everywhere, a near-mono red-on-white palette, strong 2px dividers between sections, zero border radius anywhere, content laid out in equal-width modular grid cells, labels flush-left (headings and button text are never centered). The one deliberate exception to "mostly ink on ground" is sparing accent use for the primary action and small emphasis. The reference mock treats track photography in grayscale, but no images ship in this pass — see Assets & fonts.

## Tailwind v4 theme — brand new, authored fresh

`src/app/globals.css` holds the entire theme:

1. `@import "tailwindcss";`
2. `:root` — semantic light-mode token values
3. `@theme inline` — aliases the `:root` tokens into Tailwind's utility-generating namespaces
4. Nothing else. No base-element CSS, no component classes. Typography, focus rings, and selection color are expressed as Tailwind utilities (`focus-visible:`, `selection:` variants) directly in component JSX, not in global CSS.

### Tokens

| Token                           | Light value                                                               | Tailwind namespace              | Notes                                                                            |
| ------------------------------- | ------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| `--background`                  | `#f3f2f2`                                                                 | `--color-background`            | page ground                                                                      |
| `--foreground`                  | `#201e1d`                                                                 | `--color-foreground`            | body text                                                                        |
| `--surface`                     | `#eae9e9`                                                                 | `--color-surface`               | card/tag fills                                                                   |
| `--divider`                     | `color-mix(in srgb, var(--foreground) 40%, transparent)`                  | `--color-divider`               | 2px rules between sections                                                       |
| `--accent-100..900`             | 9-step ramp, `#fff2ef` → `#4d170e`                                        | `--color-accent-100..900`       | single accent voice; base = 500, hover = 600, pressed = 700                      |
| `--neutral-100..900`            | 9-step ramp, `#f8f4f4` → `#2d2b2b`                                        | `--color-neutral-100..900`      | neutral tags, muted text                                                         |
| `--font-heading`, `--font-body` | Archivo (`next/font/google`, weights 400/600/800)                         | `--font-heading`, `--font-body` | same family, both roles                                                          |
| `--shadow-sm/md/lg`             | ink-tinted, e.g. `color-mix(in srgb, var(--foreground) 14%, transparent)` | `--shadow-sm/md/lg`             | deliberate override of Tailwind's default shadow scale — used for card elevation |

Deliberately dropped from the reference system:

- **`accent-2` ramp** — the reference readme itself calls it a machine-derived stand-in with no distinct visual role in a mono scheme; not worth carrying into a from-scratch theme.
- **`--radius-*` tokens** — no component CSS references them (nothing is ported), so they're unnecessary. Flush corners are written as the `rounded-none` utility directly wherever needed; Tailwind's own `rounded-sm/md/lg` scale is left untouched and keeps its normal meaning everywhere else in the app.
- **`--space-*` tokens** — the reference scale (4/8/12/16/24/32px) is numerically identical to Tailwind's default `p-1/2/3/4/6/8` spacing scale, so those built-ins are used directly instead.

### Dark-mode readiness

No dark values ship in this pass. The indirection (`:root` semantic vars → `@theme inline` alias) plus a strict rule that components only ever use semantic utility classes (`bg-background`, `text-foreground`, `bg-accent-500` — never raw hex or the neutral Tailwind palette) means a future dark theme is a `:root[data-theme="dark"]` override block with new values; no component changes required.

## Application architecture — features-based

Loosely inspired by [Feature-Sliced Design](https://feature-sliced.design)'s layering, simplified to five layers with no `entities` and no `widgets`: `app` (pure Next.js router) → `views` (full page compositions only — what `app/`'s routing files render as a page) → `layout` (persistent app-shell chrome that isn't itself a page) → `features` (self-contained business capabilities) → `shared` (domain-agnostic primitives). `app` holds no component definitions of its own — `layout.tsx` and `page.tsx` only import and render from `views`/`layout`.

`views` is reserved strictly for page-ready compositions — a view is something `app/page.tsx` (or a future route) renders wholesale. `SiteNav`/`SiteFooter` don't qualify: they're not a page, they're the persistent shell every page renders inside of, so they get their own `layout` layer rather than living in `views` or being folded into `shared` (which must stay free of any app-shell/auth-state awareness, not just domain knowledge).

All filenames under `src/` are kebab-case (see File naming below) — including component files, where the exported component name inside stays PascalCase but the filename doesn't.

```
src/
  app/                             # pure router — routing files only, no component definitions
    layout.tsx                     # html/body shell, fonts, metadata; renders <SiteNav/>, {children}, <SiteFooter/> from layout/
    page.tsx                       # renders <HomeView /> from views/
    globals.css

  views/                           # full page compositions only
    home/
      ui/
        home-view.tsx               # composes Hero + the feature sections below
        hero.tsx                    # page-specific, no reusable data — lives here, not as a feature
      index.ts
    # each view slice also has its own index.ts public API

  layout/                          # persistent app-shell chrome — not a page, rendered by app/layout.tsx
    site-nav/
      ui/site-nav.tsx                # brand, links, auth-state-aware actions, mobile hamburger —
                                      # native <details>/<summary> + Tailwind's group-open: variant,
                                      # no client-side JS needed
      index.ts
    site-footer/
      ui/site-footer.tsx
      index.ts

  features/
    tracks/         ui/track-card.tsx        ui/tracks-section.tsx        model/types.ts   model/mock.ts   index.ts
    leaderboards/    ui/leaderboard-card.tsx  ui/leaderboards-section.tsx  model/types.ts   model/mock.ts   index.ts
    garage/          ui/garage-bar.tsx                                    model/types.ts   model/mock.ts   index.ts
    activity/        ui/activity-ticker.tsx                               model/types.ts   model/mock.ts   index.ts

  shared/
    ui/button/, ui/tag/, ui/index.ts   # Button (primary/secondary/ghost/icon/block,
                                        # polymorphic — <a> when given href), Tag
                                        # (accent/neutral/outline) — no CSS ported from the
                                        # reference styles.css, pure Tailwind utility JSX.
                                        # Card is deferred: nothing on the homepage actually
                                        # needs a bg-surface elevated card (the leaderboards/
                                        # tracks grids use bg-background cells in a divider-gap
                                        # grid instead) — add Card when a real page needs it.
    lib/cn.ts                    # className-merge helper, if needed
    config/site.ts               # genuinely app-wide constants (nav links, brand name)
    session/mock-session.ts       # isLoggedIn mock flag — read by site-nav and home-view, replaces real auth later
```

Rules: every slice exposes its contents only through its `index.ts` public API. Imports flow one direction only: `app → views/layout → features → shared` (`views` and `layout` are siblings — neither imports the other). **Feature-to-feature imports are never allowed** — a feature may only import from `shared`. Checked against the mock data: `leaderboards` entries carry `trackName` as a plain string rather than a reference into the tracks list, so `features/leaderboards` never needs `features/tracks` — the ban costs nothing for this page as scoped. If a future page genuinely needs to share data between two features, that's a signal to revisit the architecture (e.g. promote the shared concept into `shared` or reintroduce an entities-style layer), not to bend the rule.

Icons: `lucide-react` — `MapPin`, `ArrowRight`, `Car`, `Ruler`, `Mountain`, `Menu`, `X`, used directly inside the view/layout/feature components that need them.

The existing `@/*` path alias (from the create-next-app scaffold) already resolves to `src/*` and needs no change to support this layout.

## File naming

Every filename under `src/` is kebab-case — `site-nav.tsx`, `track-card.tsx`, `mock-session.ts` — with no exceptions for component files. The component or function exported from the file still uses ordinary PascalCase/camelCase identifiers (`export function SiteNav()` lives in `site-nav.tsx`); only the filename convention changes. Enforced by `unicorn/filename-case` (from `eslint-plugin-unicorn`, pinned to `65.0.1` — the last release supporting ESLint 9, since `eslint-config-next`'s own dependencies cap at ESLint 9) scoped to `src/**/*.{ts,tsx}` in `eslint.config.mjs`, so a wrongly-cased file fails `pnpm lint` rather than relying on convention alone. Root-level convention files (`README.md`, `AGENTS.md`, Next's own `page.tsx`/`layout.tsx`/etc., which are already lowercase single words) are unaffected — the rule only scans `src/`.

## Architecture boundary enforcement

The project lints with ESLint (`eslint-config-next` for Next/React rules, flat config in `eslint.config.mjs`) plus `eslint-plugin-boundaries` for the cross-feature import ban, and Prettier for formatting (`eslint-config-prettier` disables any ESLint stylistic rules so the two don't fight). This is a plain revert of an earlier, since-abandoned attempt to use Biome as a combined linter/formatter — Biome has no plugin system and can't express "same layer, different slice → forbidden" import rules, which the boundaries enforcement needs. `pnpm lint` runs everything (Next rules + boundaries) in one pass; no separate script is needed.

Element types are derived from folder patterns (`src/app/**` → `app`, `src/views/**` → `views`, `src/layout/**` → `layout`, `src/features/**` → `features`, `src/shared/**` → `shared`). Using `eslint-plugin-boundaries` v7's current syntax:

```js
settings: {
  "boundaries/elements": [
    { type: "app", pattern: "src/app/**" },
    { type: "views", pattern: "src/views/**" },
    { type: "layout", pattern: "src/layout/**" },
    { type: "features", pattern: "src/features/**" },
    { type: "shared", pattern: "src/shared/**" },
  ],
},
rules: {
  "boundaries/dependencies": ["error", {
    default: "disallow",
    policies: [
      { from: { element: { type: "app" } }, allow: [
        { to: { element: { type: "views" } } },
        { to: { element: { type: "layout" } } },
      ] },
      { from: { element: { type: "views" } }, allow: [
        { to: { element: { type: "features" } } },
        { to: { element: { type: "shared" } } },
      ] },
      { from: { element: { type: "layout" } }, allow: [{ to: { element: { type: "shared" } } }] },
      // "features" is deliberately absent from its own allow-list —
      // this is what blocks feature-to-feature imports.
      { from: { element: { type: "features" } }, allow: [{ to: { element: { type: "shared" } } }] },
      { from: { element: { type: "shared" } }, allow: [] },
    ],
  }],
},
```

Because `features` only allows importing `shared`, any `features/x` → `features/y` import is rejected without needing a special same-type exclusion — the simplification (no entities/widgets) is what makes this rule this simple. `layout` gets the same restriction as `features` (`shared` only) since it's app-shell chrome, not a page composition. Already implemented and verified (`pnpm lint` passes clean) ahead of the rest of this spec, since it's a foundational tooling decision rather than homepage-specific work.

## Data

Mock data lives with its feature, not in a shared file: `features/tracks/model/mock.ts`, `features/leaderboards/model/mock.ts`, `features/garage/model/mock.ts`, `features/activity/model/mock.ts`, typed by each feature's `model/types.ts` (`Track`, `Leaderboard` + podium rows, `Garage`, `ActivityItem`) — mirroring the shapes used in the reference mock's script block: 4 leaderboard entries (1-3 podium rows each), 3 tracks (Nürburgring Nordschleife, Circuit de la Sarthe, Spa-Francorchamps), 3 activity feed lines, one garage summary. Swapping in real data later is a per-feature change (replace that slice's `model/mock.ts` usage with a real fetch), not a shared-file rewrite.

`Track` has no `imageUrl` field for now — see Assets & fonts for how `TrackCard` renders in its place.

`isLoggedIn` lives as a single mock constant in `shared/session/mock-session.ts` (default `false`) — imported independently by `SiteNav` (gating auth affordances) and `HomeView` (gating whether `GarageBar` renders), since Next.js layouts can't pass props down into the page they wrap. Matches the reference mock's own logged-in/out toggle; easy to flip for visual QA now, and the whole file is deleted once real session handling exists.

## Mobile responsiveness

- **Nav**: brand + hamburger icon below `md:`; tapping opens a slide-out/dropdown panel with links and auth actions; full horizontal bar restored at `md:` and up
- **Hero**: responsive type scale (e.g. `text-4xl sm:text-5xl md:text-6xl`), stacks naturally in a column at all sizes
- **Activity ticker**: horizontally scrollable row (`overflow-x-auto`), already narrow-safe
- **Garage bar**: wraps (`flex-wrap`) on narrow screens instead of the desktop single row
- **Leaderboards grid**: 1 column → 2 columns at `md:`
- **Tracks grid**: 1 column → 2 columns at `sm:` → 3 columns at `lg:`
- **Grid "divider" look**: reference mock's trick of a `background` color showing through a `gap`, reimplemented with our own tokens as a `gap-px bg-divider` container with `bg-background` cells

## Assets & fonts

- **No images ship in this pass.** The reference package's track SVGs are not copied into the codebase — `TrackCard`'s image slot renders a blank `bg-surface` placeholder box (matching the reference mock's `height:180px` container, minus the `<img>`) until real track imagery exists. This isn't a component that needs building later — it's the same `TrackCard`, just with the `<img>` swapped in once there's something to point it at.
- Load Archivo via `next/font/google` (weights 400/600/800), replacing the current Geist fonts in `src/app/layout.tsx`
- Remove the unused default create-next-app public assets (`next.svg`, `vercel.svg`, `window.svg`, `file.svg`, `globe.svg`) since the new homepage doesn't reference them
- Light theme only — no dark-mode CSS shipped in this pass

## Verification

- `pnpm dev` — visually check hero, activity ticker, leaderboards grid, tracks grid (blank placeholder boxes where images will go), footer, and nav (both `isLoggedIn` states via toggling the mock flag) at mobile, tablet, and desktop widths
- `pnpm build` — production build succeeds
- `pnpm lint` — Next/React rules and the feature-isolation boundary rule pass clean; introduce a deliberate feature-to-feature import once to confirm the rule actually catches it, then revert
- `pnpm format:check` — Prettier reports no changes needed
