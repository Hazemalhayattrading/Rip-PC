# WP-B1 — build-lead status

Branch `feat/build-tokens-wiring`, worktree `C:\Projects\Rip-PC\.claude\worktrees\build-lead`,
from the integration branch at `d620f19`. Brief: `docs/reports/phase-0-briefs.md`, build-lead.
This file is deleted in the final hand-off commit.

**Updated:** 2026-10-01, build-lead. Evidence (git-ignored): `artifacts/logs/wp-b1/`.

## Done

**Part 1 and its follow-up are merged** into the integration branch as `c7a099b` (Director,
2026-10-01; verify there 266 unit, 112 e2e):
1. **Category ids** (`cfa2376`). `gpu` became `gpu-card`; every one-letter code is unchanged.
   data-lead confirmed it: a build selects from `PRICED_CATEGORIES`, `gpu-chip` is never a
   selection, and no other id changes. Test-first evidence: `tdd-categories-red.log` (6
   failures, 3 `tsc` errors) and `tdd-categories-green.log` (97/97). The rewritten file is
   byte-identical to `cfa2376`.
2. **README** (`d29c053`): the `perf:*` and `audit:sample` scripts, the Windows set-up, and the
   cloud-container notes marked as history.
3. **ESLint** (`8957a10`): `@typescript-eslint/no-import-type-side-effects`. The spec-import rule
   was skipped, because it would only repeat `tests/harness/spec-imports.test.ts`.

**Part 1 follow-up** (the Director, at RESUME):
- Merged the integration branch: `8a8a645` (Context7 out of `.mcp.json`), `4467930`, `8edb6a1`.
- README "MCP servers for Claude Code": Playwright is in `.mcp.json`; each person adds Context7
  at user scope with their own key; a project-scope entry would hide it. Both points were
  checked in the Claude Code and Context7 docs.
- `scripts/install-skills.sh`: the echo no longer says `.mcp.json` declares Context7.
- `.gitignore`: `.playwright-mcp/` (design-lead's tip). git and Prettier both skip it (tested).

## Waiting

- **Part 2** (wire the tokens) waits for the Director to say WP-DS1 is accepted and merged.
  - design-lead's wiring notes arrived: `docs/design/tokens.md` §1 on `feat/design-tokens` @
    `0f4b8eb`. The app.css order; in `index.html`, `data-theme="dark"`, `theme-color` `#131416`,
    the font preload and the inline theme script; a "Light theme" toggle with `aria-pressed`;
    `localStorage` key `rig-lab-theme`; never `prefers-color-scheme`.
  - **design-lead confirmed** (2026-10-01):
    - the light theme is a visible toggle, and the inline head script restores the stored
      choice before the first paint;
    - the toggle is a text-only `<button type="button" aria-pressed>` named "Light theme", at
      the end of `<header>`. It moves to the round top-bar button in Phase 2;
    - **no URL parameter**: the theme is never part of a share link;
    - QA loads light by setting `localStorage` `rig-lab-theme` = `light` before navigating
      (`addInitScript` or `storageState`). Tell qa-lead at the Part 2 hand-off; don't wake
      the leads before the purge;
    - no invented spacing on the placeholder pages (tokens.md §5);
    - `role="list"` on the three real lists, with the jsx-a11y `no-redundant-roles` exception
      for that pair;
    - the JS delta is measured against 77.40 KB. design-lead fixes tokens.md §1.5 after the
      purge.
- **Plan for Part 2, test first:**
  - `src/state/theme.ts` with `currentTheme` and `applyTheme`, and tests that:
    - pin `theme-color` to `--stage` in `tokens.css`;
    - run the inline snippet from `index.html` in `node:vm`, with fake storage (light, none,
      junk, throws).
  - The wiring.
  - A before/after built-output check: preload = CSS font URL, one font request,
    `data-theme` on every page.
  - Measure:
    - verify, perf:bundle, perf:vitals;
    - Lighthouse with `LHCI_PORT=4181` until qa-lead's `258c76e` merges;
    - 12 screenshots: `/` and `/build/cpu` at 390, 768 and 1440, dark and light.
  - Ask qa-lead for a permanent smoke check that the preload is used: their fixture catches
    console errors and failed requests, not warnings.
- After WP-D0 merges: a test, written first, that `PART_CATEGORIES` equals `PRICED_CATEGORIES`
  (a test-only import).

## Notes for later phases

- **Games in the share URL** (data-lead, 2026-10-01). If the URL ever stores games (v1
  doesn't), store `franchiseSlot` (`call-of-duty`, `ea-sports-fc`) for the yearly titles, not
  their id. The id changes with each release, so old links would break.
- **The 3D scene** must re-read `--stage`, `--stage-floor`, `--stage-floor-deep` and
  `--scene-light` whenever the theme changes (tokens.md §1.3). That's Phase 3.

## Part 2 (started 2026-10-01, after WP-DS1 merged as `21ac5fb`)

Done and pushed:
- `e67b855`, `b0ce76b`: `src/state/theme.ts`, `theme.test.ts` and `index.html` (dark default,
  `theme-color`, the inline restore). Test first: 20 of 23 failed against a stub, then all passed.
- `5a6a55b`: `app.css` wiring and the font preload. Unit tests are left out of Tailwind's class
  detection: CSS 17,307 to 9,254 B raw.
- `9c1c4c6`: the "Light theme" toggle (`min-h-6`), and `role="list"` with the jsx-a11y exception.
- `0bee054`: README paragraph.
- Merged the integration tip `7c2afa2` (WP-D0, design's selection and `--ink-3` changes) as
  `4e2db5e`.
- The `PART_CATEGORIES` membership test against `PRICED_CATEGORIES` (`src/state/categories.test.ts`).
  A mutation (`gpu-card` back to `gpu`) fails it at runtime and in `tsc`.

Evidence so far (`artifacts/logs/wp-b1/`), measured on `0bee054`, before the WP-D0 merge:
- verify: 384 unit and 112 e2e.
- Built pages: all pass.
- Toggle: 18/18.
- JS: +505 B gzip.
- Web vitals: pass.
- Lighthouse:
  - simulated: LCP 1,354 to 1,657 ms;
  - applied throttling: preload 2,117 ms, no preload 1,775 ms, `fetchpriority=low` 2,142 ms.
- 12 screenshots.

## Next step

Re-run the full suite on the final head:
- verify, then the built-pages check;
- bundle, vitals, Lighthouse with `LHCI_PORT=4181`;
- 12 screenshots, then the toggle check.

Then delete this file in the hand-off commit, push, and hand off to `team-lead` (copy
qa-lead and design-lead on their items).
