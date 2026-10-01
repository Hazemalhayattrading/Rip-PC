# WP-B1 — build-lead status

Branch `feat/build-tokens-wiring`, worktree `C:\Projects\Rip-PC\.claude\worktrees\build-lead`,
from the integration branch at `d620f19`. Brief: `docs/reports/phase-0-briefs.md`, build-lead.
This file is deleted in the final hand-off commit.

**Updated:** 2026-10-01, build-lead. Evidence (git-ignored): `artifacts/logs/wp-b1/`.

## Done (Part 1)

1. **Category ids** (`cfa2376`). `gpu` became `gpu-card`; every one-letter code is unchanged.
   The build categories are data-lead's `SPEC_CATEGORIES` without `gpu-chip`
   (`feat/data-foundations:src/data/schema/files.ts`). The state tests are updated.
   **data-lead confirmed** (2026-10-01): a build selects from `PRICED_CATEGORIES` (that list,
   in this order). `gpu-chip` is never a build selection, and no other id changes.
   - Redone test first, as the Director asked (skill test-driven-development). RED: the
     `d620f19` `categories.ts` with the new tests gives 6 failures for the expected reason, plus
     3 `tsc` errors. For example, encode drops the card: `v1.c_amd-ryzen-7-9800x3d`, without
     `g_…`. GREEN: the minimal rename makes 97/97 pass and `tsc` exit 0. The refactored file is
     byte-identical to `cfa2376`. Logs: `artifacts/logs/wp-b1/tdd-categories-red.log` and
     `tdd-categories-green.log`.
   - To do once WP-D0 is merged into the integration branch: a unit test that
     `PART_CATEGORIES` equals data-lead's `PRICED_CATEGORIES`, test first. A test-only import
     keeps classic `zod` out of the initial bundle. data-lead suggested it.
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
- Asked design-lead (2026-10-01), no answer yet: how the light theme is switched (and how QA
  selects it in tests), and whether the Phase 0 placeholder pages get spacing once Preflight
  removes list bullets and paragraph margins.
- Measuring in Part 2 (from qa-lead, 2026-10-01). On the integration branch, `perf:lhci` uses
  the fixed port 4173, so worktrees collide; my baseline run blocked qa-lead's. Until qa-lead's
  `258c76e` merges, run it as `LHCI_PORT=4181 npm run perf:lhci`. `perf:vitals` prints its
  numbers only after that merge too. Until then, add `--reporter=list,json` with
  `PLAYWRIGHT_JSON_OUTPUT_NAME=<file>` and read the `web-vitals.json` attachment, as the
  baseline did.
- Skills for Part 2 (Director, `e3a127a`): test-driven-development, verification-before-completion,
  systematic-debugging, core-web-vitals, performance, accessibility, and the React parts of
  vercel-react-best-practices. For worker diffs, use requesting-code-review and
  receiving-code-review.

## Next step

Part 1 is reported to the Director (2026-10-01). Wait for WP-DS1 to be accepted and merged.
Then merge the integration branch, add the `PRICED_CATEGORIES` test if WP-D0 is in, and plan
Part 2 from `docs/design/tokens.md`.
