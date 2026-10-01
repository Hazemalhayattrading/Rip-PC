# WP-Q2 — QA work in progress

Owner: qa-lead (fresh instance, 2026-10-01) · Branch: `feat/qa-phase0-verification` · Worktree:
`C:\Projects\Rip-PC\.claude\worktrees\qa-lead` · Integration branch merged at `e3a127a`.

This file is deleted in the final hand-off commit. The hand-off message replaces it.

## Done (Part 1)

1. **QA tooling on Windows** (`258c76e`). Every tool runs here. Fixed in QA's files:
   - the Lighthouse port is derived per checkout (a fixed 4173 collided with build-lead's run);
   - a headless reference fps run is always INVALID (it gave a false PASS of 6967 fps on the
     RTX 5080);
   - `perf:vitals` prints its numbers; spec test names use `/` on every platform.
   - Measured here (Ryzen 7 9800X3D, RTX 5080; not the Arc reference laptop): initial JS 77,404 B
     gzip; Lighthouse mobile 1.00 / LCP 1357 ms, desktop 1.00 / 380 ms on Chromium 1194; web
     vitals LCP 44–216 ms, CLS 0. Logs: `artifacts/qa/phase-0/wp-q2/logs/`.
2. **WP-B0 verified by qa-lead**: all 11 criteria pass. One Minor: `THREE.Clock` deprecation
   warning on every build step (three 0.186 via R3F). actionlint 1.7.12 with shellcheck 0.11.0:
   0 errors. Evidence: `artifacts/qa/phase-0/wp-b0/`, `artifacts/screenshots/phase-0/wp-q2-b0/`.
3. **Rule-1 check** `tests/audit/rule1.mjs` (`e9646d2`, built by a data-auditor worker, reviewed
   with a mutation run). On data-lead's unmerged `2cedf51`: 0 failures, 1 manual check resolved.
4. **Audit plan**: `tests/audit/strata.mjs` (`3068431`) + `sample.mjs`. Dry run on `2cedf51`:
   355 records, 15 strata, 43 sampled.

## In progress

- WP-Q0 + WP-Q1 verification by a fresh e2e-tester (agent `a166f87092c653da4`); evidence in
  `artifacts/qa/phase-0/wp-q0-q1/`. Report not yet received.
- WP-DS0 verification by a visual-tester (agent `a66b4c85b75afc62a`); evidence in
  `artifacts/qa/phase-0/wp-ds0/`. Report not yet received.
- Rule-1 worker (agent `ab002b7ef137c67a8`): report not yet received; its tool is committed.

## Waiting (Part 2)

- WP-D0 merged: the real 10% audit with seed `rig-lab-audit:phase-0:<full sha of the merge
  commit>`, run by fresh data-auditor workers; then rule1.mjs on the merged `data/`.
- WP-B1 merged: dark and light projects for axe; record that visual baselines need Docker.
- `docs/qa/report-phase-0.md`, then hand off.

## Exact next step

Review the WP-Q0/Q1 and WP-DS0 worker reports (resume the agents by id if they don't arrive),
then send the Part 1 report to `team-lead`.
