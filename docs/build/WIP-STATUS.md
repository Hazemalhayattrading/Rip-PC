# WP-B1 — build-lead status

Branch `feat/build-tokens-wiring`, worktree `C:\Projects\Rip-PC\.claude\worktrees\build-lead`,
from the integration branch at `d620f19`. Brief: `docs/reports/phase-0-briefs.md`, build-lead.
This file is deleted in the final hand-off commit.

**Updated:** 2026-10-01, build-lead. Evidence (git-ignored): `artifacts/logs/wp-b1/`.

## Done (Part 1)

1. **Category ids** (`cfa2376`). `gpu` became `gpu-card`; every one-letter code is unchanged.
   The build categories are data-lead's `SPEC_CATEGORIES` without `gpu-chip`
   (`feat/data-foundations:src/data/schema/files.ts`). The state tests are updated.
   **Waiting for data-lead's confirmation** (asked by message). If data-lead names other ids,
   change them in a new commit.
2. **README** (`d29c053`): the `perf:*` and `audit:sample` scripts; Windows set-up (Node 22,
   symlinks with Developer Mode, LF, no Docker for visual baselines, Lighthouse with the
   installed Chrome); the cloud-container notes marked as history. Every claim was checked on
   this PC.
3. **ESLint** (`8957a10`): the spec-import rule is skipped, because it would only repeat
   `tests/harness/spec-imports.test.ts`. Added `@typescript-eslint/no-import-type-side-effects`
   instead: a reverted probe showed that one inline type import from `src/three` put three.js on
   every page (initial JS 77.40 to 320.49 KB gzip), and the old config passed it.
   Evidence: `artifacts/logs/wp-b1/eslint-type-side-effects-probe.txt`.

Verify on the Part 1 tree: 266 unit tests and 112 e2e pass, in 47 s
(`artifacts/logs/wp-b1/verify-part1.log`).

Baselines on `d620f19`, for the Part 2 comparison: initial JS 77.40 KB gzip on every page,
initial CSS 0.31 KB; web vitals on `/` LCP 44 ms (x1) and 168-196 ms (x4), CLS 0; Lighthouse
mobile performance 1.0, LCP about 1,355 ms, CLS 0, TBT 0.

## Waiting

- **Part 2** (wire the tokens) waits for the Director to say WP-DS1 is accepted and merged.
  design-lead's wiring, read from `feat/design-tokens` (its `tokens-check.mjs` harness):
  `tokens.css` imported with no layer, after `tailwindcss/theme.css`; Preflight and `base.css`
  in the base layer; `<link rel="preload" href="/src/styles/fonts/rig-lab-sans.woff2"
  as="font" type="font/woff2" crossorigin>`; `<html data-theme="dark">`. To confirm against
  `docs/design/tokens.md` when it lands.
- Questions for design-lead when the notes arrive: how the light theme is switched (and how QA
  selects it in tests), and whether the Phase 0 placeholder pages get spacing once Preflight
  removes list bullets and paragraph margins.

## Next step

Report Part 1 to the Director. Then wait for WP-DS1, and plan Part 2 from design-lead's notes.
