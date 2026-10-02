# WP-D2 Benchmark coverage: in progress, 2026-10-02

Branch `feat/data-benchmarks`, from claude/keen-lamport-0794zj @ c621c15. Spec: plan §2 WP-D2;
briefs, "data-lead" step 6. Hand-offs go to `team-lead` by SendMessage, in the briefs' format.

1. Set-up: **done.** `npm ci`; verify 597 unit, 166 e2e
   (`artifacts/logs/verify-d2-setup-2026-10-02.log`).
2. Batch 1: the first of the 10 games with no anchors. **Next.**

Rules: one or two reviews per game (QA needs unused results for the held-out set); each batch lists
its sources, one line per review (publisher, title, URL, date, row count); 2 tries per game or
workload, then a written gap.
