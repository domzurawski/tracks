<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git

Never commit automatically. Only run `git commit` when the user explicitly asks for a commit in that turn.

Before the first commit of any new piece of work, check the current branch (`git branch --show-current`). If it's a shared branch (`dev`, `main`), create and switch to a feature branch or worktree first — don't commit directly to the shared branch and split it out later.

Whenever asked to commit, use [Conventional Commits](https://www.conventionalcommits.org) format for the commit message (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, etc.).

## File naming

All files under `src/` are named kebab-case (`site-nav.tsx`, `track-card.tsx`, `mock-session.ts`) — including component files, which do NOT use PascalCase filenames even though the exported component/function name inside stays PascalCase. Enforced by the `unicorn/filename-case` ESLint rule in `eslint.config.mjs`; a filename that doesn't match fails `pnpm lint`.

## Architecture

Features-based, loosely inspired by [Feature-Sliced Design](https://feature-sliced.design), simplified to five layers with no `entities` and no `widgets`:

`app` → `views` / `layout` → `features` → `shared`

- **`app`** — pure Next.js router. Routing files only (`layout.tsx`, `page.tsx`, `globals.css`); no component definitions live here. Imports from `views` and `layout` only.
- **`views`** — full page compositions only: what `app/`'s routing files render as a page (e.g. `views/home`). Not for persistent chrome.
- **`layout`** — persistent app-shell chrome that isn't itself a page (`site-nav`, `site-footer`), rendered by `app/layout.tsx`. A sibling of `views`, not inside it.
- **`features`** — self-contained business capabilities (`tracks`, `leaderboards`, `garage`, `activity`, ...), each owning its own `ui/`, `model/types.ts`, `model/mock.ts`, `index.ts`.
- **`shared`** — domain-agnostic primitives only (`ui/button`, `ui/tag`, `ui/card`, `lib/`, `config/`, `session/`). Zero business/domain knowledge, ever.

Rules:

- Every slice exposes its contents only through its `index.ts` public API — never deep-import another slice's internals.
- Imports flow one direction only: `app → views/layout → features → shared`. `views` and `layout` are siblings and never import each other.
- **Feature-to-feature imports are never allowed** — a feature may only import from `shared`. If two features genuinely need to share data, that's a signal to revisit the architecture (promote the shared concept into `shared`, or reintroduce an entities-style layer) — don't bend the rule to work around it.
- Enforced by `eslint-plugin-boundaries` in `eslint.config.mjs` — a disallowed import fails `pnpm lint`, it isn't just a convention.

Full rationale and the current file tree live in `docs/superpowers/specs/0001-homepage-design-system-design.md`.

## Rendering

Server Components by default. Add `"use client"` only to the smallest leaf component that actually needs it — browser state, effects, event handlers, or browser-only APIs. Never mark a whole page or layout as a client component to make one small piece interactive; isolate the interactive part instead (e.g. the mobile nav's open/close toggle is a client component, the rest of the nav and the page around it are not).

## Performance

The app needs to be fast and well-optimized. In practice:

- Use `next/font` (not manual `<link>`/`@import` font loading) — already how Archivo is loaded.
- Use `next/image` for any real image once one exists — no plain `<img>` for content images.
- Fetch data at the server/RSC level, not client-side waterfalls.
- Before adding a client-side dependency, consider its bundle cost — prefer a lighter or native alternative when one exists.

## SEO

Every route defines proper metadata (title, description, OpenGraph) via Next's Metadata API — not just the homepage. Keep semantic HTML: correct heading hierarchy (one `h1` per page, no skipped levels) and landmark elements (`nav`, `main`, `footer`). Before considering a new page or feature done, audit it from an SEO perspective (metadata present, heading structure correct, links crawlable) — this is a standing, recurring check, not a one-time setup step.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
