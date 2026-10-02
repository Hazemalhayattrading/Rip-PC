# QA status: WP-Q3 (test plan v4 and verification tools)

Branch `feat/qa-phase1-plan`, worktree `C:\Projects\Rip-PC\.claude\worktrees\qa-lead`. Owner: qa-lead.
Spec: `docs/reports/phase-1-plan.md` §2 (WP-Q3) and §4, and `docs/reports/phase-1-briefs.md` ("qa-lead").

## Done
1. 2026-10-02: branch cut from `origin/claude/keen-lamport-0794zj` at `c621c15`. `npm run verify`
   passes: 597 unit, 166 e2e, exit 0 (log in the git-ignored
   `artifacts/qa/phase-1/logs/verify-q3-step1.log`).

## In progress
- Brief Q3 step 2: build-lead's result types (WP-E0) have not arrived yet. Review them in the next
  turn after they do.
- Brief Q3 step 4: `tests/audit/compat-trace.mjs` and the golden-count check, each with a planted
  defect.

## Next step
Write `tests/audit/compat-trace.mjs` and `tests/audit/golden-count.mjs` with their tests, then test
plan v4 (brief Q3 step 3).
