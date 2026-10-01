# WP-B1 — build-lead status

Branch `feat/build-tokens-wiring`, worktree `C:\Projects\Rip-PC\.claude\worktrees\build-lead`,
from the integration branch at `d620f19`. Brief: `docs/reports/phase-0-briefs.md`, build-lead.
This file is deleted in the final hand-off commit.

**Updated:** 2026-10-01, build-lead.

## Done

- Read the briefs, plan §4 and §5 WP-B0, and handoff §2 and §7 step 6.
- `node_modules` checked: every top-level package resolves (`npm ls --depth=0`), and no `npm ci`
  is running.

## In progress

- **Part 1, step 1: category ids.** Asked data-lead to confirm the canonical list. Plan, from
  `feat/data-foundations:src/data/schema/files.ts`: the build categories are data-lead's
  `PRICED_CATEGORIES` (`cpu`, `motherboard`, `ram`, `gpu-card`, `storage`, `psu`, `cooler`, `case`,
  `case-fan`). `gpu-card` keeps the code `g`; every other code is unchanged.

## Waiting

- **Part 2** (wire the tokens) waits for the Director to say WP-DS1 is accepted and merged.
  Until then, read `feat/design-tokens` read-only, and wait for design-lead's wiring notes.

## Next step

Part 1, step 1: rename `gpu` to `gpu-card` in `src/state/categories.ts` and the state tests, once
data-lead confirms. Then step 2, the README.
