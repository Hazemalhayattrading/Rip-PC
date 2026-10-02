# WP-D2 Benchmark coverage: in progress, 2026-10-02 (UTC)

Branch `feat/data-benchmarks`, from claude/keen-lamport-0794zj @ c621c15. Spec: plan §2 WP-D2;
briefs, "data-lead" step 6. Hand-offs go to `team-lead` by SendMessage, in the briefs' format.

1. Set-up: **done** (149cde7). `npm ci`; verify 597 unit, 166 e2e
   (`artifacts/logs/verify-d2-setup-2026-10-02.log`).
2. Batch 1: **in progress.** Two of the 10 games with no anchors, GPU-bound and CPU-bound rows.
   - benchmark-researcher `a7c605e23b0ab2bd6`, resumed by SendMessage after the usage-limit stop,
     with the note to ignore the Director's stale STOP. Its captures are under `artifacts/benchmarks/`
     (fetch log `fetch-log-d2.tsv`); it added the publishers `tomshardware` and `techspot` (93dbabc,
     committed by the Director) and writes rows to `data/benchmarks/game.json`.
   - Next: review its report and rows, audit 20% against the captures, run verify, and hand off
     batch 1 with the counts, the coverage matrix, the source list (one line per review), the
     capture manifest and the gaps.

Rules: one or two reviews per game (QA needs unused results for the held-out set); each batch lists
its sources, one line per review (publisher, title, URL, date, row count); 2 tries per game or
workload, then a written gap.
