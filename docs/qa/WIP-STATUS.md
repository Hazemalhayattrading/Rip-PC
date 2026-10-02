# QA status: WP-Q3 (test plan v4 and verification tools)

Branch `feat/qa-phase1-plan`, worktree `C:\Projects\Rip-PC\.claude\worktrees\qa-lead`. Owner: qa-lead.
Spec: `docs/reports/phase-1-plan.md` §2 (WP-Q3) and §4, and `docs/reports/phase-1-briefs.md` ("qa-lead").

## Done
1. 2026-10-02: branch cut from `origin/claude/keen-lamport-0794zj` at `c621c15`. `npm run verify`
   passes: 597 unit, 166 e2e, exit 0.
2. 2026-10-02: the tools (brief Q3 step 4).
   - `tests/audit/compat-rules.json`: QA's expected 20 rule ids, with outcomes, numeric flags,
     unknown-data flags and the two bios-version FlashBack variants.
   - `tests/audit/compat-trace.mjs`: the engine's registry against that list, and every rule's
     tests from the Vitest JSON report (Playwright report from Phase 2). Exit 0, 1 or 2.
   - `tests/audit/golden-count.mjs`: one passing `[golden] <anchor id>` case per anchor row, by
     id, not only by count; with `--estimates`, the ±5% from the engine's own output.
   - Tests: 71, through real Vitest runs of fixture suites (`tests/audit/fixtures/`), one planted
     defect per scenario file. 14 of 14 bugs planted in the tools themselves were caught (runner in
     the session scratchpad; result in the git-ignored `artifacts/qa/phase-1/q3/tool-mutations.json`).
   - On the real repo: golden-count finds 143 anchor rows and 0 golden cases (exit 1, correct
     before WP-E3); compat-trace with an empty registry exits 1, or 0 with all 20 pending.
   - Finding for build-lead: Vitest 5 cuts values interpolated into it.each titles at 40
     characters (`taskTitleValueFormatTruncate`). 141 of the 143 anchor ids are longer, so
     `[golden] $id` collapses them into 32 names.
   - verify: 668 unit, 166 e2e, exit 0.

## In progress
- Brief Q3 step 2: build-lead's result types (WP-E0) have not arrived yet. Review them in the next
  turn after they do.
- Messages to send: build-lead (rule ids, test names, dump requests, golden titles), the Director
  (unknown-data tests for 12 rules, golden conflicts).

## Next step
Test plan v4 (brief Q3 step 3): §8 held-out protocol, §9 rules and corpus, the mutation-test
check, the Phase 1 audit seed, the §4 worker briefs, `models.heldOutCount` 20 with its pin test.
