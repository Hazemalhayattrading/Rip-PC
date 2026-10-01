# WP-D0 status: in progress, 2026-10-01 (not reviewed)

Brief: `docs/reports/phase-0-briefs.md`, section "data-lead". Acceptance criteria: plan §5 WP-D0.

## Brief steps
1. Merge the integration branch, verify, commit, push: **done**.
   - Merged `claude/keen-lamport-0794zj` at d620f19 in fcacbc1. No conflicts.
   - `npm run verify` passes on Node 24.21.0: 345 unit tests in 19 files, 112 e2e smoke tests, 78 s.
     Log: `artifacts/verify/2026-10-01-step1-merge.log`.
2. Finish the seeded 20% audit (seed 20260930): **done**. Recorded in `data/audits.json`, checked by
   `src/data/audits.test.ts`.
   - 78 items in 17 batches, all checked. 8 findings, all fixed: 6 found on 2026-09-30 (25f9cc5) and 2
     on 2026-10-01, both locators that paraphrased the page (7451f52, 2cedf51). No value was wrong in
     the benchmark, creator or games samples.
   - All 80 ComputerBase rows (not only the 14 sampled) were re-read against the chart HTML: 160 of 160
     values match.
   - Logs: `artifacts/audit/` (`benchmarks-game-cb-2026-10-01.txt`, `benchmarks-games-2026-10-01.txt`,
     the two pass-1 logs, and the scripts that wrote them).
   - The sampler is committed as `data/tools/audit_sample.py` (Python, not run here).
3. README price rule: a listing filed under a reseller brand counts only if it names the maker's
   part number. **Done.** In `src/data/README.md`, "How we pick the listing".
   - All 97 observations checked against their captures (`artifacts/audit/listing-brands-2026-10-01.txt`):
     96 are filed under the maker's own brand. 1 is under a reseller brand: SA Core Ultra 9 285K,
     "Mavark". It names BX80768285K, which Intel lists as the boxed ordering code (Wayback copy of
     Intel's Ordering & Compliance page, 2026-06-08, now under `artifacts/specs/cpu/`), so it counts.
     Its note now says so.
   - intel.com answered curl with 403 (Akamai "Access Denied"). Not retried with another client; the
     Wayback copy was used, as the owner's rules allow for specs.
   - The rule is checked by review, not by the validator: CPU records carry no part numbers, and
     observations don't record the listing brand.
4. Price runner: every attempt gets its own capture name. Commit the runner under `data/tools/`.
   **Next.**
5. Font CREDITS row (Rig Lab Sans, OFL): waiting for design-lead's text.
6. Canonical category ids to build-lead: **done**, sent 2026-10-01 by message. Only `gpu` changes, to
   `gpu-card` (code `g` kept). `gpu-chip` is not a build selection.
7. Hand-off to the Director: not started.

## Acceptance items (state on 2026-09-30; the audit is now done, see step 2)
- Zod schemas, validator, Vitest: **done**. `src/data/schema/`, `src/data/validate/`; 79 data tests pass.
- Seed minimums: **done**. CPU 16/8, boards 7/6, RAM 6/5, GPU chips 11/8, GPU cards 10/8, storage 5/5, PSU 5/5, coolers 5/5, cases 5/5, fans 3/3.
- Required seed cases: **done**, all 7, tested in `src/data/seed.test.ts`.
- Prices, SA and US, live pages only, one capture each: **done**. 62 purchasable parts per market.
  - US: 52 prices, 10 gaps.
  - SA: 45 prices, 17 gaps.
  - Every gap has a reason and lists the retailers tried.
- Game anchors: **done**. 116 rows from 2 publishers:
  - ComputerBase: 80 live rows, GPU-bound 1440p and 4K.
  - TechPowerUp: 36 archived rows, CPU-bound 1080p.
  - No conflicts over 10%.
- Creator anchors: **done**. 27 rows:
  - TechPowerUp: 18 archived Cinebench 2024 rows.
  - Blender Open Data: 9 live rows.
- Games list: **done**. 15 titles as of 2026-09-30, including Black Ops 7 and EA SPORTS FC 27.
- `src/data/README.md` and the `CREDITS.md` data rows: **done**.
- Seeded 20% audit (seed 20260930): **done** on 2026-10-01; see step 2 and `data/audits.json`.

## Where I stopped
Steps 1, 2, 3 and 6 are done. Next: step 4, the price runner's capture names
(`artifacts/scratch/prices_run.py`), time-boxed.

## Blockers (never worked around)
- **Sites that refuse or challenge our fetcher:** Samsung, Kingston, Crucial, Noctua, Thermalright, Lian Li, TechPowerUp (403), Guru3D, tracker.gg and epicgames.com. Tried 1 to 2 times each (see `artifacts/specs/*/fetch-log.tsv`). Wayback copies were used where the rules allow them.
- **noon.com** (a second SA retailer): the proxy answered "upstream request failed". Tried once.
- **Best Buy**: the page timed out after 60 s. Tried once.
- **Overwritten captures:** some rejected price captures were overwritten by a later capture with the same name. The run logs and `results-*.jsonl` keep those decisions. I re-captured the P14 and SA510 rejects under `artifacts/prices/rejected/`. Step 4 stops this happening again.
- The cloud session had no Agent tool. On this PC, workers spawn without a `name` and send their reports to `data-lead` by SendMessage.
