# WP-Q2 — QA work in progress

Owner: qa-lead (fresh instance, 2026-10-01) · Branch: `feat/qa-phase0-verification` · Worktree:
`C:\Projects\Rip-PC\.claude\worktrees\qa-lead` · Started from the integration branch at `d620f19`.

This file is deleted in the final hand-off commit. The hand-off message replaces it.

## Done

- Read CLAUDE.md, the briefs ("All leads", "qa-lead"), plan §4–§6 and the Owner's rules,
  hand-off §2–§3, and the test plan (§1–§7, §14, §15, Appendix A).
- `node_modules` checked: `npm ci` finished; @playwright/test 1.56.1, @lhci/cli 0.15.1,
  @axe-core/playwright 4.13.0, web-vitals 6.2.2. Node 24.21.0 here, CI uses 22.

## In progress (Part 1)

1. QA tooling on Windows: `perf:bundle`, `perf:lhci`, `perf:lhci:desktop`, `perf:vitals`,
   `audit:sample`, the fps probe as a dry run. Fix anything Windows-only in QA's files.
2. Verify WP-B0 and WP-DS0 against plan §5, criterion by criterion, with measured numbers.
   A fresh worker verifies QA's own WP-Q0 and WP-Q1.
3. Build `tests/audit/rule1.mjs`: Owner's rule 1 on 100% of price and benchmark rows.
4. Plan the seeded 10% data audit for a fresh data-auditor.

## Waiting (Part 2)

- WP-D0 merged: run the 10% audit and the rule-1 check on the merged data.
- WP-B1 merged: dark and light projects for axe; record that visual baselines need Docker.
- `docs/qa/report-phase-0.md`, then hand off.

## Exact next step

Run QA's tooling on Windows (Part 1, step 1).
