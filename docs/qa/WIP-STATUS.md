# QA status: WP-Q3 (test plan v4 and verification tools)

Branch `feat/qa-phase1-plan`, worktree `C:\Projects\Rip-PC\.claude\worktrees\qa-lead`. Owner: qa-lead.
Spec: `docs/reports/phase-1-plan.md` §2 (WP-Q3) and §4, and `docs/reports/phase-1-briefs.md` ("qa-lead").

## Done
1. 2026-10-02: branch cut from `origin/claude/keen-lamport-0794zj` at `c621c15`. `npm run verify`
   passes: 597 unit, 166 e2e, exit 0.
2. 2026-10-02: the tools (brief Q3 step 4), `b6d21fd`.
   - `tests/audit/compat-rules.json`, `compat-trace.mjs`, `golden-count.mjs`, with tests on real
     Vitest runs of fixture suites (`tests/audit/fixtures/`), one planted defect per scenario.
   - Finding for build-lead: Vitest 5 cuts it.each title values at 40 characters; 141 of the 143
     anchor ids are longer.
3. 2026-10-02: `models.heldOutCount` 20, `heldOutPerClassMin` 4, the five classes, pinned
   (`37c6700`).
4. 2026-10-02: brief Q3 step 2, review of build-lead's result types (`types.ts` at `4fa8a95`): not
   OK yet, 6 changes sent (C1 test-system entry point, C2 upscaler "Native" modes, C3 ok never on
   unpublished evidence, C4 which rule blocks when no layout fits, C5 `reads` and combination
   counts, C6 the PowerEstimate on CompatReport). RULE_IDS agreed as final.
5. 2026-10-02: the Director's rulings (`9f47477`) applied.
   - `compat-rules.json`: 8 rules need unknown-data tests; the other 12 name 29 validator tests
     (28 requested from data-lead, plus `bios-coverage`).
   - `compat-trace.mjs` requires those validator tests to pass in `src/data/`, and checks the
     engine's RuleSpec outcomes and numeric flags against test plan §9.2.
   - 19 of 19 bugs planted in the tools caught (runner in the session scratchpad; result in the
     git-ignored `artifacts/qa/phase-1/q3/tool-mutations.json`). 185 audit tests pass.

## In progress
- Waiting: build-lead's revised `types.ts` (re-review C1 to C6), data-lead's 28 validator tests,
  the Director's answer on the WP-E1 wording ("a list that can be empty").

## Next step
Test plan v4 (brief Q3 step 3): §8 held-out protocol, §9 rules and corpus, the mutation-test
check, the Phase 1 audit seed, the §4 worker briefs; then hand off Q3.
