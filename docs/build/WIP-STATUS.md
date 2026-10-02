# build-lead status: WP-E0, Engine foundations and the Engine lab

Branch `feat/build-engine-foundations`, worktree `C:\Projects\Rip-PC\.claude\worktrees\build-lead`.
Spec: `docs/reports/phase-1-plan.md` §1, §2 (WP-E0) and §3; `docs/reports/phase-1-briefs.md`,
"build-lead"; design-lead's `docs/design/lab-spec.md` and `copy-guide.md`. This file is deleted
in the hand-off commit.

## Done

- Step 1: branched from the integration tip. Baseline verify: 597 unit, 166 e2e.
- Step 2: Context7 checks (Vite 8 plugin API and `runnerImport`, Vitest 5 thresholds and title
  truncation, wouter 3, React 19 `use`/`lazy`/`<meta>`).
- Step 3: the result types, `src/engine/types.ts`. First version 15f9b5c; revised for qa-lead's
  C1–C6 and design-lead's M1–M3 and S1–S4 at 83aa5ab. **Approved by design-lead and qa-lead on
  2026-10-03; the E1 gate is met** (Director). Follow-ups since: Steps.title is a label
  (b9e6361); condition phrases, cooler-height reads memory, cooler-socket board-first (480a30e).
- QA's follow-ups for later WPs: `fpsEstimateProblems()` in E3 (frame generation stays a
  NoEstimate; a disagreement is never high confidence); golden-estimates.json is dropped.
- Step 4 (core): the catalogue builder (`scripts/catalogue/`), the Vite plugin
  (`scripts/vite/catalogue.ts`, `virtual:rig-lab/catalogue-url`), the lab loader, and the engine's
  Zod-free helpers (`catalogue.ts`, `evidence.ts`), 4fa8a95.
- Contract helpers at 83aa5ab: `invariants.ts` (QA's C3 and C4, PSU ranges, rebalanced builds),
  `names.ts` (displayName), `rules.ts` aligned with QA's `compat-rules.json`.
- Vitest: `taskTitleValueFormatTruncate: 0`, and the JSON report QA's trace reads (2cdd0e5).
- Merged the integration branch at 234efe9 (eeae687): DS2 batch 1 and WP-Q3.

## In progress (2026-10-03)

- **engine-engineer** (agentId `a70c6e33425ad7ad7`, resumed by SendMessage): the dump follows
  `RuleSpec.sweep` (product with radiator positions, drive lists, power extremes), compact rule
  files, `rules.json` (implemented rules only), `display-names.json`, the compatibility scaffold
  (`src/engine/compat/check.ts`, `COMPAT_RULES = []`), and the query mode (`src/engine/query.ts`,
  `--input/--out`). Files: `src/engine/dump.*`, `src/engine/compat/**`, `src/engine/query.*`,
  `scripts/engine-dump.*`.
- **frontend-engineer** (agentId `a1be92107766cc522`, resumed by SendMessage): the lab to
  design-lead's spec (frame, picker, evidence list, source link as components, the three pages),
  several drives and fan packs in the v1 share URL, `/lab` → `/lab/` in dev and preview, then
  verify, perf:bundle, CLS and 18+ screenshots. Files: `src/app/**`, `src/components/**`,
  `src/state/**`, `scripts/vite/static-route-pages.*`, `scripts/vite/github-pages-preview.*`.
- **Known red until the engine worker lands:** `src/engine/dump.test.ts` follows the old contract,
  and the full product of the complete `reads` exhausts the test worker's memory. verify is red.

- The engine worker also builds `systemOf` (src/engine/system.ts) and the query mode's `system` and
  `problems` per build (exit 1 on any problem), qa-lead's follow-up 3.
- The frontend worker also fixes QA-P1-001 (design-lead's focus and scroll rule in SiteLayout)
  and QA-P1-002 (`…/index.html` renders its directory's route). qa-lead adds `/index.html` and
  `/lab/index.html` to the e2e smoke.

## E1 plan (Director's go, 2026-10-03)

- Cut `feat/build-engine-compat` from this branch once the compatibility scaffold
  (`src/engine/compat/check.ts`) is reviewed and committed, in `worktrees/build-lead-compat`, and
  resume the same engine-engineer there.
- Batch 1a, on today's data: cpu-socket, ram-type, board-form-factor, usb-c-header, m2-lanes.
  The rest waits for WP-D1 batch 1 (semantics.ts, fixtures, structured conditions) or WP-E2.

## Next steps

1. Read the two workers' reports (they arrive by SendMessage). Review every diff against the spec.
2. **The hand-off waits for `src/data/semantics.ts` on the integration branch** (Director,
   2026-10-03: no hand-off with the "not published" gap). It is data-lead's `feat/data-semantics`
   @ 3e3bdf3, or D1 batch 1, with the same API. Then:
   1. merge the integration branch;
   2. point `src/app/lab/null-means-none.ts` at `nullMeansNone`;
   3. test that the i5-12400F's igpu reads "none";
   4. check that the lab chunk holds no Zod.
3. Handle the re-review answers of qa-lead and design-lead on the types; agree the query-mode
   format with qa-lead.
4. Full `npm run verify`, `npm run perf:bundle`, the screenshots, then the hand-off to `team-lead`.

## If a stop happens

Re-spawn or resume the two workers above with the prompts in their transcripts, and tell each to
ignore any stale STOP message first. Nothing else needs set-up.
