# WP-Q2 — QA work in progress

Owner: qa-lead (restarted 2026-10-02) · Branch: `feat/qa-phase0-verification` · Worktree:
`C:\Projects\Rip-PC\.claude\worktrees\qa-lead` · Integration branch merged at `3966db1` (`73005aa`).

This file is deleted in the final hand-off commit. The hand-off message replaces it. It cites
post-purge commit IDs only.

## Done (2026-10-02)

1. Merged the integration branch (`73005aa`). `npm run verify`: 591 unit, 166 e2e.
2. Yesterday's two "stopped" re-verifications had in fact finished before the stop. Their reports
   are recovered into `artifacts/qa/phase-0/wp-d0/` and `wp-ds1/` (`worker-report-*.txt`).
   - WP-DS1, WP-B1 wiring and the DS0 fixes: the code under test is unchanged since (`git diff
     944081f 73005aa` touches only `data/`, `src/data/` and `docs/reports/`), so that run stands.
   - WP-D0 ran on the data before data-lead's fixes, so a fresh worker re-checks the merged data.
3. QA-P0-001 re-checked on today's build: 0 THREE.Clock warnings (`artifacts/qa/phase-0/qa-p0-001-retest/2026-10-02/`).
4. The warnings gate: console warnings fail the e2e run, with two environment notices allowed
   (test plan v3.2, §13.2). Smoke 166 of 166; 48 GPU-stall notices allowed.
5. Rule 1 on the merged data: 0 failures (97 prices, 27 gaps, 143 benchmark rows).
6. Audit and purge evidence copied into `artifacts/qa/phase-0/audit/`; the purge re-checked on
   GitHub today (`artifacts/qa/phase-0/audit/purge-recheck-2026-10-02/`).

## In progress

- A data-auditor worker re-verifies WP-D0 on the merged data, including QA-P0-008 to 012.
- An e2e-tester worker independently checks QA's own changes since the WP-Q0/Q1 check: the soak,
  the theme projects, the budget pins, the test-plan fixes and the warnings gate.

## Exact next step

Read both workers' results (`artifacts/qa/phase-0/wp-d0-merged/`, `artifacts/qa/phase-0/qa-own/`),
re-measure the budgets on the final commit, write `docs/qa/report-phase-0.md` and the evidence
SHA-256 list, delete this file, verify, push and hand off.
