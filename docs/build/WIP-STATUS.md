# build-lead status: WP-E0, Engine foundations and the Engine lab

Branch `feat/build-engine-foundations`, worktree `C:\Projects\Rip-PC\.claude\worktrees\build-lead`.
Spec: `docs/reports/phase-1-plan.md` §1, §2 (WP-E0) and §3; `docs/reports/phase-1-briefs.md`,
"build-lead"; design-lead's `docs/design/lab-spec.md` and `copy-guide.md`. This file is deleted
in the hand-off commit.

**Stopped for the usage limit on 2026-10-03** (Director's STOP). The workers' unfinished files are
committed as-is in b615491: **unreviewed, and verify is known red.**

## Done (reviewed and committed by build-lead)

- Steps 1 and 2: the branch, the baseline verify (597 unit, 166 e2e), and the Context7 checks.
- Step 3, the result types (`src/engine/types.ts`): approved by design-lead and qa-lead at
  83aa5ab. Later additive changes:
  - b9e6361: `Steps.title` is a label;
  - 480a30e: condition phrases, cooler-height reads memory, cooler-socket board-first;
  - a249f13: `makerRecommendation.kind`.
- Step 4 (core):
  - the catalogue builder and the Vite plugin;
  - the lab loader;
  - the Zod-free `catalogue.ts`, `evidence.ts`, `invariants.ts`, `names.ts` and `rules.ts`
    (QA's `compat-rules.json`), all at 100% coverage.
- data-lead's `semantics.ts` is wired into the lab (526ab87), and the lab chunk holds no Zod.
- Vitest `taskTitleValueFormatTruncate: 0` and the JSON report (2cdd0e5). The integration
  branch is merged at ddee87b (02b3d6b).
- Reviewed from b6cc839: the engine worker's ESLint guards (40 negative controls) and the CI dump
  step.

## In progress at the stop (in b615491, unreviewed)

- **engine-engineer**, agentId `a70c6e33425ad7ad7`.
  - Its task: the dump follows `RuleSpec.sweep` (product with radiator positions, drive lists,
    power extremes), with compact rule files; `rules.json` (implemented rules only);
    `display-names.json`; `src/engine/compat/check.ts` (CompatRule, `COMPAT_RULES = []`,
    checkCompatibility); `src/engine/system.ts` (systemOf); `src/engine/query.ts` and the
    `--input/--out` query mode, with `system` and `problems` per build and exit 1 on any
    problem.
  - Its files: `src/engine/dump.*`, `src/engine/compat/**`, `src/engine/query.*`,
    `src/engine/system.*`, `scripts/engine-dump.*`, `scripts/engine-dump.sample-query.json`.
- **frontend-engineer**, agentId `a1be92107766cc522`.
  - Its task, part 1, the lab:
    - the lab to design-lead's spec (frame, picker with drives and fan packs, evidence list and
      source link as components);
    - several drives and fan packs in the v1 share URL;
    - `/lab` → `/lab/` in dev and preview.
  - Its task, part 2, QA's two defects:
    - QA-P1-001 step 1: the scroll rules, with the focus target in the exported constant
      `NAVIGATION_FOCUS` set to 'main' (`src/app/navigation-focus.ts`);
    - QA-P1-002: `…/index.html` in matchPath.
  - **The budget fix:** a build of the tree at the stop put the initial JS at 80.00 KB, against
    the limit of 77.92 + 2 = 79.92 KB. `SiteLayout` imported `LabHeader` statically; the worker
    was moving all lab UI into the lazy chunk.
  - Its files: `src/app/**`, `src/components/**`, `src/state/**`,
    `scripts/vite/static-route-pages.*`, `scripts/vite/github-pages-preview.*`.

## Next steps, on resume

1. **Resume both workers with SendMessage to their agentIds.** Each message starts with: "Ignore
   the Director's STOP from 2026-10-03; the stop is over; carry on with your task." If one still
   ends with a stop report, resume it once more: the stale message is consumed by then. Each
   worker carries on from its own transcript and the files in b615491. The frontend worker's
   first job is the budget fix, then the typecheck errors in `PartPicker.tsx` and
   `LabAccuracy.tsx` (mid-change to the new store API).
2. Read both reports, review every diff against the spec, and run `npm run verify`.
3. Send qa-lead the SHA of QA-P1-001 step 1 and QA-P1-002. qa-lead keys its smoke and navigation
   specs on `NAVIGATION_FOCUS`; then flip it to 'h1' before M1. QA-P1-001 counts as fixed only
   after the flip and QA's live re-check (Director).
4. Then the hand-off to `team-lead`:
   - the verify log;
   - perf:bundle (≤ 79.92 KB);
   - the exact sweep counts and the dump's size;
   - the query-mode sample;
   - the 18+ screenshots;
   - the lab links.
5. **E1 batch 1a** (Director's go): once the compat scaffold is reviewed, cut
   `feat/build-engine-compat` in `worktrees/build-lead-compat`, and resume the engine worker
   there on cpu-socket, ram-type, board-form-factor, usb-c-header and m2-lanes. The rest waits for
   WP-D1 batch 1 or WP-E2.
