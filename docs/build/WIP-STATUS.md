# build-lead status: WP-E0, Engine foundations and the Engine lab

Branch `feat/build-engine-foundations`, worktree `C:\Projects\Rip-PC\.claude\worktrees\build-lead`.
Spec: `docs/reports/phase-1-plan.md` §1, §2 (WP-E0) and §3; `docs/reports/phase-1-briefs.md`,
"build-lead"; design-lead's `docs/design/lab-spec.md` and `copy-guide.md`. This file is deleted
in the hand-off commit.

Resumed on 2026-10-03 in a new session, after the second usage-limit stop.

## Done (reviewed and committed by build-lead)

- Steps 1 and 2: the branch, the baseline verify (597 unit, 166 e2e), and the Context7 checks.
- Step 3, the result types (`src/engine/types.ts`): approved by design-lead and qa-lead at
  83aa5ab. Later additive changes: b9e6361, 480a30e, a249f13.
- Step 4 (core): the catalogue builder and the Vite plugin; the lab loader; the Zod-free
  `catalogue.ts`, `evidence.ts`, `invariants.ts`, `names.ts` and `rules.ts`, at 100% coverage.
- data-lead's `semantics.ts` wired into the lab (526ab87).
- The engine worker's ESLint guards (40 negative controls) and the CI dump step (from b6cc839).
- 0305c5e: the integration branch merged at 2fe7148 (WP-DS2 batch 2's specs).
- **192e6a5: the lab frontend, reviewed.** A new frontend-engineer (agent ae0f02eb21683bdd5)
  finished the frame, the picker, the three pages and the components. build-lead's own verify:
  1,365 unit, 190 e2e smoke, exit 0 (`artifacts/logs/e0-lead-verify-1.log`). Initial JS
  79.49 KB of 79.92 KB. CLS 0 at 390 and 1440 on all three pages. Its report:
  `artifacts/reports/frontend-engineer-e0-report-2026-10-03.txt`.

## In progress

- **build-lead reviews the engine half of b615491** (the engine worker's last task, finished and
  reported before the stop: `artifacts/reports/engine-engineer-stop-report-2026-10-02.txt`;
  its task text: `artifacts/reports/engine-engineer-tasks-2026-10-02.txt`). Files:
  `src/engine/dump.*`, `src/engine/compat/check.*`, `src/engine/query.*`, `src/engine/system.*`,
  `src/engine/index.ts`, `scripts/engine-dump.*`.

## Next steps

1. Finish the engine review. Run `npm run engine:dump` and the query mode; record the sweep
   counts and the dump size.
2. Own Playwright pass over the lab links (screenshots), then hand off E0 to `team-lead`.
3. Tell qa-lead the SHA of QA-P1-001 step 1 and QA-P1-002 (both in 192e6a5's tree), and that
   `NAVIGATION_FOCUS` (`src/app/navigation-focus.ts`) is 'main' until QA keys its specs on it.
4. E1 batch 1a (Director's go, 2026-10-03): cut `feat/build-engine-compat` from this branch in
   `worktrees/build-lead-compat`; an engine-engineer writes cpu-socket, ram-type,
   board-form-factor, usb-c-header and m2-lanes, test first.
5. RuleSpec: `cooler-height` gets `unknownData: true` and an unknown test (QA v4.5).
6. QA-P1-001 step 2 (focus on the h1) before M1.
7. For design-lead's wording review: the field label map (`src/components/lab/field-labels.ts`;
   "overclock profile" for XMP reads oddly next to "EXPO profile"), the price table's market
   names ("The US"), and the document names the copy guide lacks (tracker page, store page,
   news article, API response).
