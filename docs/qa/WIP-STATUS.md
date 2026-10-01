# WP-Q2 — QA work in progress

Owner: qa-lead (fresh instance, 2026-10-01) · Branch: `feat/qa-phase0-verification` · Worktree:
`C:\Projects\Rip-PC\.claude\worktrees\qa-lead` · Integration branch merged at `477cf53`.

This file is deleted in the final hand-off commit. The hand-off message replaces it.

## Done

1. **QA tooling on Windows** (`258c76e`): every tool runs here. Fixed in QA's files: the
   Lighthouse port is derived per checkout; a headless reference fps run is always INVALID
   (it gave a false PASS of 6967 fps on the RTX 5080); `perf:vitals` prints its numbers.
2. **WP-B0 verified by qa-lead**: all 11 criteria pass. QA-P0-001 (Minor, sent to build-lead):
   `THREE.Clock` deprecation warning on every build step. Evidence: `artifacts/qa/phase-0/wp-b0/`.
3. **Web-vitals window fix** (`30623bb`): `webVitals.minObserveMs` 5000. NC-V2b (LCP at 2.7 s)
   and NC-V3 (shift at 3 s) passed before and fail now. Method change, pending the Director.
4. **Rule-1 check** `tests/audit/rule1.mjs` (`e9646d2`, `b853045`). On the merged WP-D0 data
   (`98d2be5`): 97 prices, 27 gaps, 143 benchmark rows, 0 failures. One manual check resolved
   (Amazon variation parent ASIN). Evidence: `artifacts/qa/phase-0/rule1/rule1-merged-98d2be5.*`.
5. **The 10% sample is drawn**: seed `rig-lab-audit:phase-0:98d2be5a843770b8b33b8b5147c77339c1b09e92`,
   43 of 355 records in 15 strata. Files: `artifacts/qa/phase-0/audit/strata-98d2be5.json`
   (sha256 `51e679bc…`), `sample-phase-0.json` (sha256 `3904d116…`), `sample-phase-0.txt`.

## Waiting

- Worker reports: WP-Q0/Q1 (agent `a166f87092c653da4`, evidence `artifacts/qa/phase-0/wp-q0-q1/`),
  WP-DS0 (agent `a66b4c85b75afc62a`, evidence `artifacts/qa/phase-0/wp-ds0/`; its DS0-01 was
  fixed by design-lead in `06f026b`), rule-1 builder (agent `ab002b7ef137c67a8`). Messages reach
  a lead only between turns (briefs), so they should arrive when this turn ends.
- Open QA-harness gap from the WP-Q0/Q1 worker's NC-F3: an unhandled rejection 1 s after start
  passes every smoke test, because each test closes its page sooner. Proposal: a short soak per
  route in the smoke. Needs the Director's OK, since it lengthens everyone's verify.
- WP-B1 Part 2 merged: dark and light projects for axe; record that visual baselines need Docker.

## Exact next step

Read the queued messages (workers' reports and the Director's). Then spawn 2 fresh data-auditor
workers for the 43-record sample (parts 12; benchmarks, games and prices 31), each told to
write its report to `artifacts/reports/<task>.md`.
