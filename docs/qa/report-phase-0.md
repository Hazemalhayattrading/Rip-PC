# QA report: Phase 0 (Foundations)

Status: **CLOSED** (QA; the Director's sign-off pending) · Date: 2026-10-02 · QA: qa-lead

- **Integration commit verified:** `b8facf616171174e02d342e5ad3311bbbeaa0c2e`, the integration head at
  hand-off. Its app and data are unchanged since `3966db1f62ed989f5435ec429a08f2949ef5800a`.
  - CI on the integration branch: run 36972164952 (`3966db1`) and run 36979162145 (`b8facf6`),
    both green.
  - QA measured on its own branch, `feat/qa-phase0-verification`, at `73005aa`, `1027152`,
    `e3f58fc`, `3ef6c6f`, `e947529` and `c1f265e`. That branch differs from the integration head
    only in QA's files (`tests/**`, `docs/qa/**`, `playwright.config.ts`), so the app and data
    measured are the integration head's.
  - CI on QA's branch: runs 36972797469, 36973853810, 36979509770, 36985783771 and 36986727581,
    all green. The run on `3ef6c6f` was cancelled by the next push, which carries the same changes.
- **Environments:**
  - Hazem's home PC: Windows 11 Pro 26200, Ryzen 7 9800X3D, RTX 5080, Node 24.21.0. **It is not
    the Arc iGPU reference laptop.** Its timings are tool evidence, never gates.
  - CI: GitHub `ubuntu-24.04`, Node 22.22.2.
  - The reference laptop and the CI-docker image are not used in Phase 0.
- **Tool versions:** @playwright/test 1.56.1 with Chromium 1194 (141.0.7390.37), @lhci/cli 0.15.1
  (Lighthouse 12.6.1), @axe-core/playwright 4.13.0, web-vitals 6.2.2, Vitest 5.0.3, actionlint
  1.7.12 with shellcheck 0.11.0.
- **Evidence:** paths below are relative to the QA worktree,
  `C:\Projects\Rip-PC\.claude\worktrees\qa-lead`, in its git-ignored `artifacts/`.
  - Every file is listed by SHA-256 in
    [`evidence/report-phase-0.sha256`](evidence/report-phase-0.sha256): 1,584 files, and that list's
    own SHA-256 is `431a6cb61a602e9c1c569f358a811d8c28b11e2bba81742abf5d9d4ed65693cc`.
  - Run `sha256sum -c` from the worktree root to check them.
- **Commit IDs** here are post-purge IDs. This report publishes no pre-purge commit ID (§10).
- **Who committed this file:** the Director, from qa-lead's hand-off message, unchanged. The
  harness refuses `.md` report files from a teammate.

## Verdict

**CLOSED: 0 Blockers, 0 open Majors, 15 open Minors.**

- Every plan §5 criterion passes, or is waived in writing.
- Every other exit criterion in test plan §15 is met:
  - the seeded 10% audit has no unresolved mismatch;
  - Owner's rule 1 passes on 100% of the price and benchmark rows;
  - P1, P2 and P4 to P7 pass;
  - axe is clean on every route in both themes;
  - the smoke has zero console errors.
- The last Major, **QA-P0-041** (data-lead), is fixed in `e64f241`: `data/audits.json` now cites
  the audit sample by its checksum, and no file in that tree names a pre-purge commit. QA verified
  it on 2026-10-02 (`final/qa-p0-041-retest/`).
- The 15 open Minors are tracked with owners (§9).

## 1. Acceptance criteria

Who checked what:
- **Fresh workers** checked every work package, so no lead's work was checked only by itself.
  QA's own work packages were checked by fresh workers as well.
- **2026-10-01:** WP-B0, WP-Q0, WP-Q1 and WP-DS0 at `7fde97f`; WP-DS1 and WP-B1's wiring at
  `0c2c709`.
- **2026-10-02:** WP-D0 on the merged data, and QA's later changes to its own tooling.
- **Yesterday's checks still stand.** Since `944081f` only data, QA's files and the Director's
  reports changed; `src/` outside `src/data`, `index.html`, `public/` and `docs/design/` did not.

### WP-D0, data foundations (data-lead)

Re-verified on the merged data (`73005aa`, equal to `3966db1`) by a fresh data-auditor, 2026-10-02
06:37 to 07:15 UTC. Evidence: `artifacts/qa/phase-0/wp-d0-merged/`; for unchanged parts, the full
check of 2026-10-01 in `artifacts/qa/phase-0/wp-d0/`.

| # | Criterion (short) | Result | Evidence |
|---|---|---|---|
| 1 | Zod schemas for the 16 types, every §4 field, `z.infer` types | PASS: 68 of 68 required-field paths resolve; the walker's own control comes back missing | `c1-required-fields.txt`, `c1-zinfer-exports.txt` |
| 2 | The validator rules | PASS: 58 of 58 negative controls rejected, each by the expected rule; 7 of 7 boundary controls accepted. The new rules (case size, maker size class, radiator-plus-fan range, support tab) are covered. Latent gaps: QA-P0-020 to 024, 028 | `c2-negative-controls.json` |
| 3 | Seed minimums | PASS: 73 records, 36 of 36 count and mix checks. The case minimum now holds from maker data: 3 ATX mid-towers (Fractal North and Pop Air, "Regular"; DeepCool CH560, "mid-tower"), 1 mATX, 1 Mini-ITX. Lane sharing matches the manuals word for word; every board has a BIOS minimum per CPU family | `c3-seed-minimums.txt`, `fix009-case-size.txt` |
| 4 | Prices from live retailer pages, captures, gaps | PASS: US 52 prices and 10 gaps; SA 45 and 17. All 62 purchasable parts are covered once per market. The validator rejects an `archiveUrl`, a non-retailer and a date outside the batch | `c4-prices.txt`; rule 1 in §3 |
| 5 | Benchmarks | PASS: 116 game rows from 2 publishers (ComputerBase 80 live, TechPowerUp 36 archived). GPU-bound: 50 at 1440p, 30 at 4K. CPU-bound: 36 at 1080p on the RTX 5090. 27 creator rows (18 Cinebench 2024, 9 Blender 5.2.0). No two publishers share test conditions; the conflict rule works on a planted pair | `c5-benchmarks.txt` |
| 6 | Games list | PASS: 15 titles, 14 confirmed and 1 replacement (Battlefield 6 for Alan Wake 2). Call of Duty: Black Ops 7; EA SPORTS FC 27. Three counts are old: QA-P0-025 | `c6-games.txt` |
| 7 | README and CREDITS | PASS, with doc Minors QA-P0-026 and 030 | `c7-readme-credits.txt`, `c7-rule-check.txt` |
| 8 | Validation in Vitest; `npm run verify` | PASS: `src/data`: 6 files, 106 tests; verify passes (§2) | `c8-vitest-src-data-final.log` |
| 9 | data-lead's 20% audit | PASS: QA replayed seed 20260930 exactly (17 batches, 78 items; 8 findings, all fixed). QA's audit entry matches QA's own results | `wp-d0/c9-audit-draw-replay.txt`, `c9-fixedin.txt`, `c9-audit-counts.txt` |

The five fixes (QA-P0-008 to 012) are all FIXED against their sources, and all 31 values that
changed since `944081f` match their sources (§3).

### WP-B0, scaffold, CI, deploy, harness, empty routes (build-lead)

Checked 11 of 11 on 2026-10-01 at `7fde97f`. Re-checked on 2026-10-02 at `e3f58fc` and `e947529`
where WP-B1 changed the code.

| # | Criterion (short) | Result | Evidence |
|---|---|---|---|
| 1 | Vite, React 19, TypeScript strict with `noUncheckedIndexedAccess`, Tailwind v4, current at acceptance; the TypeScript pin explained | PASS: React 19.3.0, Vite 8.3.1, Tailwind 4.3.3; TypeScript 6.0.3 for typescript-eslint, while 7.0.2 is current. Vite 8.3.2, motion 13.5.0 and wouter 3.13.0 came out after acceptance: not a defect | `wp-b0/` |
| 2 | §7 dependencies; the 3D stack only in a lazy chunk | PASS: lazy-only check passes on all 18 pages; three.js sits in the lazy `Garage` chunk only | `final/perf-bundle-e3f58fc.log` |
| 3 | Scripts, `verify` included | PASS: verify runs typecheck, lint, unit tests, build and e2e smoke | `final/verify-handoff.log` |
| 4 | Empty routes, each with a unique `<h1>` and a `<main>` | PASS: 17 routes, one `<h1>` each (17 different), one `<main>`, `lang` en | `qa-p0-001-retest/2026-10-02/routes-check.json` |
| 5 | Base `/Rip-PC/`: direct loads answer 200; unknown paths show the 404 view; `?b=` survives | PASS: 17 of 17 answer 200 with no redirect. `/nope`, `/build/nope` and `/build` answer 404 with "Page not found". `?b=` survives a click, Back and reload | same file |
| 6 | Zustand store; versioned, Zod-validated URL codec with round-trip tests | PASS: codec, store and URL-sync tests pass in verify | `src/state/*.test.ts` |
| 7 | CI: `ci.yml`, `deploy.yml`, actionlint clean | PASS: actionlint 0 errors in both files; CI green on every commit QA pushed today | `final/actionlint-e3f58fc.log` |
| 8 | Harness: Vitest; a smoke for every route with no console or page errors | PASS: 166 smoke tests, 0 unexpected problems (§8) | `final/smoke-gate-v3.3.json` |
| 9 | Initial JS under 250 KB gzip; the 3D chunk apart | PASS: 77,920 B (§2) | `final/bundle-budget-e3f58fc.json` |
| 10 | No `any`, lint clean, zero console errors; README with the commands and Pages set-up | PASS: lint is strict and clean; README has "One-time setup Hazem must do on GitHub" | verify log |
| 11 | Evidence: verify log, size table, screenshots at 390, 768 and 1440, actionlint | PASS: the hand-off's own files were not kept, so QA made them again | `wp-b0/`, `final/`, `artifacts/screenshots/phase-0/wp-q2-qa-p0-001/` |

### WP-DS0, design direction (design-lead)

Checked on 2026-10-01 by a fresh visual-tester. `docs/design` was identical to the WP-DS0 merge
`139c873`. Evidence: `artifacts/qa/phase-0/wp-ds0/`.

| # | Criterion (short) | Result | Evidence |
|---|---|---|---|
| 1 | Reference study; Wayback stated; images at most 1600 px and 300 KB, with URL, date and notice | PASS with a waiver. 8 of 9 sites studied; **Tesla waived in writing by the Director** (DS0-11). The Bench image is now 292,116 B, under 300,000 B (KB is 1,000 bytes, DS0-12). Open question: whether our own mock screenshots need the reference caption (§11) | `worker-report-2026-10-01.txt`, `images.json` |
| 2 | Three directions, every item, AA contrast | PASS after the DS0-01 fix: light `--ink-3` on the floor's near edge went from 4.0799 to 4.6078:1 (`11ea665`). All 108 stated ratios recomputed; the largest difference is 0.005 | `contrast-recompute.json`; `wp-ds1/contrast-qa.json` |
| 3 | A mock per direction with screenshots; real products; values labelled illustrative | PASS: 18 runs, 0 console errors; all 17 product names are real. Its Minors closed with the directions Hazem did not pick, or moved to `backlog.md` items 42 to 46 | `mocks-run.json` |
| 4 | None of the rejection-on-sight patterns | PASS: 0 purple gradients among 32 measured, 0 emoji, no default shadcn, no centred hero | `static-scan.json` |
| 5 | A recommendation; one-screen summaries; the pick recorded | PASS: B recommended with 5 reasons; Hazem picked C, Studio, recorded in the plan, the briefs and `direction.md` | report |
| 6 | 3D asset survey | PASS: all 6 categories, plus PSU and M.2; 5 of 5 spot checks; nothing downloaded; author handles added (DS0-13) | `survey-spotcheck.json` |

### WP-Q0 and WP-Q1, test plan, budget tooling, Playwright and CI (qa-lead)

Checked on 2026-10-01 by a fresh e2e-tester at `7fde97f`. Everything QA changed since was checked by
two more fresh workers on 2026-10-02. Evidence: `artifacts/qa/phase-0/wp-q0-q1/`, `qa-own/` and
`qa-own-retest/`.

| WP | # | Criterion (short) | Result | Evidence |
|---|---|---|---|---|
| Q0 | 1 | Test plan covers every §8 bar and §9 item, and the listed topics | PASS. Its gaps were fixed (QA-P0-015, 037) | `wp-q0-q1/worker-report-2026-10-01.txt` |
| Q0 | 2 | `budget.json` is the single source of truth | PASS: every §8 number matches the text. Three rounds of one-key mutations on 2026-10-02 found approved values no test pinned; now every such mutation fails a test (QA-P0-014, 036 and 039) | `qa-own/budget-mutations.log`, `qa-own-retest/budget-mutations.log`, `final/qa-p0-039-mutations/` |
| Q0 | 3 | Bundle checker: initial JS from the entry; lazy chunks apart; unit-tested | PASS: an independent recompute matched it to the byte | worker report |
| Q0 | 4 | Lighthouse CI asserts perf ≥ 0.90, LCP < 2500 ms, CLS < 0.05, TBT, as errors, median of 3 | PASS | worker report |
| Q0 | 5 | A Playwright web-vitals spec for LCP and CLS | PASS after QA-P0-004 (it was PARTIAL): every load is now watched for at least 5 s | `wp-q2/nc-fix/` |
| Q0 | 6 | The wave-2 wiring list | PASS: Appendix B matches what was applied | worker report |
| Q1 | 1 | Owns the config and smoke; projects at 390, 768 and 1440; console fixture; axe on every route; visual scaffolding | PASS. Now 6 e2e projects, width by theme. Since today the fixture also fails on console warnings. A late problem at the soak width fails (QA-P0-005). axe runs 108 checks | `qa-own/results.json` |
| Q1 | 2 | Budget checks run in CI and block | PASS: both jobs are green. Since 2026-10-02 `main` requires both by their real names (QA-P0-007, fixed) | `final/ruleset/` |

### WP-DS1, tokens for Studio (design-lead)

Checked on 2026-10-01 by a fresh visual-tester at `0c2c709`. The app and design files are unchanged
since. Evidence: `artifacts/qa/phase-0/wp-ds1/`, screenshots in
`artifacts/screenshots/phase-0/wp-q2-ds1/`.

| Criterion | Result | Evidence |
|---|---|---|
| `tokens.css` for dark and light, with the Tailwind v4 `@theme` mapping, AA-verified, plus `tokens.md` | PASS, with doc Minors QA-P0-018 and 019. Both themes; dark is the default; 96 tests in `src/styles`. QA recomputed 180 matrix cells and design's 34 pairs: the largest difference is 0.0049. The lowest declared pair renders at 4.537:1; DS0-01's pair is 4.6078:1. Fallback face at 103.14%: corpus width error 0.00%; font-swap CLS 0.0000 in 12 of 12 cells | `contrast-qa.json`, `swap-loads.json`, `docs-check.json` |

### WP-B1, the tokens wired into the app (build-lead; added by the Director, not in plan §5)

| Part | Result | Evidence |
|---|---|---|
| Part 1: category ids, README, lint rule | PASS: `gpu-card` keeps URL code `g`; a test ties the ids to data-lead's buyable categories; the README has Windows, performance and cloud-history sections; `no-import-type-side-effects` is an error | `src/state/categories.ts`, `eslint.config.js` line 48 |
| Part 2: the wiring | PASS, with Minors QA-P0-016 and 017. Tokens with no layer, then Preflight and `base.css`, the font preload, `data-theme` and the restore script. The 12 screenshots are pixel-identical to build-lead's. Each of 47 loads makes exactly one font request. A first visit is dark even when the OS prefers light. The "Light theme" toggle works by mouse and keyboard | `wiring-loads.json`, `theme-toggle.json`, `diff-vs-wp-b1-handoff.json` |
| Addendum: the THREE.Clock filter (QA-P0-001) | PASS: 0 THREE.Clock warnings on any route today. With the filter taken out, the new warnings gate fails 98 tests | `qa-p0-001-retest/2026-10-02/`, `qa-own/nc-w2-summary.json` |

### WP-Q2, independent verification (qa-lead)

This report.

## 2. Measured numbers

Home PC, Chromium 1194, on the final app build (`e3f58fc`; the app is the integration head's).

| Bar | Gate (`budget.json` key) | Measured | Runs and aggregation | Env | Result |
|---|---|---|---|---|---|
| Initial JS | `bundle.initialJs.maxGzipBytes` < 250,000 B | **77,920 B** gzip on all 18 pages (31.2%); CSS 3,317 B | exact | home PC; CI | PASS |
| 3D stack lazy only | `bundle.forbiddenInInitialGraph` | No three.js in the initial graph; the lazy `Garage` chunk is 243,565 B | exact | home PC; CI | PASS |
| Lighthouse performance, mobile | `lighthouse.gates.performanceScore` ≥ 0.90 | 1.00 (3 of 3) | 3 runs, median | home PC (simulated) | PASS |
| LCP, Lighthouse mobile | `largestContentfulPaintMs` < 2500 | 1,651 ms (1,650 to 1,654) | 3 runs, median | home PC | PASS |
| Lighthouse desktop | same gates | 1.00; LCP 361 ms (360 to 420) | 3 runs, median | home PC | PASS |
| CLS, Lighthouse | `cumulativeLayoutShift` < 0.05 | 0 (mobile and desktop) | 3 runs, median | home PC | PASS |
| TBT, the INP proxy | `totalBlockingTimeMs` < 200 | 0 ms (mobile and desktop) | 3 runs, median | home PC | PASS |
| LCP, web vitals | `webVitals.gates.lcpMs` < 2500 | 390 px: 44 ms at x1, 136 ms at x4. 1440 px: 44 ms at x1, 124 ms at x4 | 3 cold loads each, median, each watched at least 5 s | home PC | PASS |
| CLS, web vitals | `webVitals.gates.cls` < 0.05 | 0.0000 in all 4 cells | same | home PC | PASS |
| INP | `webVitals.gates.inpMs` < 200 | not gated until Phase 2 (no interactions yet); TBT stands in | — | — | n/a |
| 60 fps 3D | `fps.targets.*` | no scene until Phase 3. A headless reference run counts as INVALID (QA-P0-003) | — | — | n/a |
| Console and page errors | `console.*` = 0 | 166 smoke tests, 0 unexpected problems; console warnings fail too (§8) | every test | home PC; CI | PASS |
| WCAG 2.1 AA, axe | `accessibility.maxViolations` 0 | 108 checks (18 pages in 6 width-and-theme cells), 0 violations | every test | home PC; CI | PASS |
| Unit and e2e | green | 597 unit tests in 28 files; 166 e2e. `npm run verify`: 79 s | final verify (`final/verify-handoff.log`) | home PC; CI | PASS |
| Token contrast | AA | 34 of 34 declared pairs pass; lowest 4.537:1 rendered | — | home PC | PASS |

Lighthouse used Playwright's Chromium 1194 through `CHROME_PATH`, as CI does. Logs and reports are
in `artifacts/qa/phase-0/final/`.

## 3. Data audit

Seed: `rig-lab-audit:phase-0:<the WP-D0 merge's full commit ID before the purge>` · Algorithm:
sha256-rank-v1, 10%, at least 1 per stratum · Tools: `tests/audit/sample.mjs` (`cc2cdff`) and
`strata.mjs` (`02a76a1`, aligned in `ecbb414`).

- That merge is now `c04e2a5`. Its `data/` and `src/data/` trees are byte-identical to the ones
  sampled: the same git tree IDs, `3ed45faf` and `f9314172`.
- The seed string itself is not printed here, because it holds a pre-purge ID (QA-P0-041). It is in
  the git-ignored `artifacts/qa/phase-0/audit/sample-phase-0.json`, SHA-256
  `3904d1169be7eb67fd2647f939d5b0d7b7a6a2fd50462c5056e8848c7462001b`.

| Stratum | Population | Fingerprint | Sample |
|---|---:|---|---:|
| benchmarks/creator | 27 | `4f7653a8` | 3 |
| benchmarks/game | 116 | `7d848281` | 12 |
| games | 15 | `9508fbaf` | 2 |
| parts/case | 5 | `dc4b437d` | 1 |
| parts/case-fan | 3 | `42e20495` | 1 |
| parts/cooler | 5 | `dafbc662` | 1 |
| parts/cpu | 16 | `99e06be8` | 2 |
| parts/gpu-card | 10 | `00c37fac` | 1 |
| parts/gpu-chip | 11 | `9c007074` | 2 |
| parts/motherboard | 7 | `453d7ea5` | 1 |
| parts/psu | 5 | `3302f1e7` | 1 |
| parts/ram | 6 | `6edb20a3` | 1 |
| parts/storage | 5 | `69b30a03` | 1 |
| prices/sa | 62 | `c1652017` | 7 |
| prices/us | 62 | `fe99d9bb` | 7 |
| **Total** | **355** | | **43** |

**Field results.** Three fresh data-auditor workers read every field of the 43 sampled records
against its source, on 2026-10-01: 1,265 field rows. This report gives the totals. Every row, with
its value, source and outcome, is in the three `results.json` files under
`artifacts/qa/phase-0/audit/audit-phase-0/`.

| File (SHA-256) | Rows | MATCH | NULL OK | Findings |
|---|---:|---:|---:|---:|
| `parts/results.json` (`6991ad2a`) | 620 | 600 | 13 | 7 |
| `benchmarks/results.json` (`1e1d46e7`) | 493 | 438 | 54 | 1 |
| `prices/results.json` (`d99706e8`) | 152 | 151 | 0 | 1 |
| **Total** | **1,265** | **1,189** | **67** | **9** |

The nine findings, and their defects. Every one is now fixed and re-verified against its source:

| Record | Field | Outcome | Defect |
|---|---|---|---|
| asus-tuf-gaming-z890-plus-wifi | `sources.1.url`, `sources.1.title` | MISMATCH ×2 | QA-P0-008 |
| fractal-north-charcoal-black-tg-light | `size`; its note | NOT COVERED ×2 | QA-P0-009 |
| fractal-north-charcoal-black-tg-light | `radiatorSupport` thickness ×2; its note | NULL BUT PUBLISHED ×3 | QA-P0-010 |
| tpu-9850x3d-baldurs-gate-3-1080p-intel-core-ultra-9-285k | the stated CPU profile | NULL BUT PUBLISHED | QA-P0-011 |
| SA amd-ryzen-5-5600 at Amazon.sa | `notes` (the import-fee split) | MISMATCH | QA-P0-012 |

QA swept each pattern across the whole data set. QA-P0-008 covered 2 boards, QA-P0-009 3 cases,
QA-P0-010 all 5 cases, QA-P0-011 8 rows and QA-P0-012 2 offers.

**Owner's rule 1, every row,** on the merged data (`73005aa`), 2026-10-02:
- **Result:** prices 97 checked, 0 failed; gap records 27, 0 failed; benchmark rows 143, 0 failed.
- **Coverage:** every purchasable part has a price or a gap in each market. US: 52 and 10. SA: 45
  and 17.
- **Fetch dates:** each `retrievedAt` matches the capture's file time (97 of 97), the runner log (97
  of 97) and the page's own timestamp (86 of 86 that show one).
- **Manual check:** 1, resolved as a match. The Amazon capture's `currentAsin` and `landingAsin` are
  the row's ASIN; the other ASIN on the page is the variation parent.
- **Evidence:** `final/rule1-73005aa.log` and `.json`. The tool is `tests/audit/rule1.mjs`
  (`a65f74b`, `ecbb414`); a planted mutation of each of its 11 kinds was caught (2026-10-01).

**Price drift:** not checked. Every price is from the 2026-09-30 batch, and no price was fetched
again in Phase 0. A re-price batch before launch is on data-lead's Phase 1 list.

## 4. Model tests

Not in scope: `src/engine` is still the Phase 0 placeholder (its 7 unit tests pass). Golden and
held-out tests start with the performance model.

## 5. Compatibility traceability

Not in scope this phase: the rules arrive in Phase 1.

## 6. Accessibility

- **axe:** 18 pages (17 routes and the 404 page), at 390, 768 and 1440 px, in dark and light: 108
  checks, 0 violations.
  - Each light check first asserts that the page shows `data-theme="light"`.
  - With the restore script broken on purpose, exactly the 54 light checks fail, before axe runs
    (NC-T1, 2026-10-02).
- **Contrast** of the tokens: §1, WP-DS1.
- **Visible focus:** every Tab stop shows the 2 px ring at 3 px offset, at 16.87:1 or more, but its
  left side is cut off at the viewport edge (QA-P0-016, Minor; WCAG 2.4.7 is still met).
- **Not in this phase:** the keyboard path through the builder, and screen-reader checks (from
  Phase 2).

## 7. Visual regression

No baselines in Phase 0, as planned: the 54 visual tests skip until the design exists in the app.
Baselines are made only in the pinned Playwright Docker image, and this PC has no Docker. That
decision belongs to Phase 2. The WP-DS1 check compared its 12 screenshots with build-lead's at the
§11 thresholds: all 12 are pixel-identical.

## 8. Console and page errors

- **Smoke:** 166 tests in 6 projects, 0 unexpected problems.
- **Allow-list in force:** 4 entries, all qa-lead's and permanent:
  - `not-found-page-status`: 14, the declared 404 pages;
  - `not-found-page-console`: 14, Chromium's console error for those same pages;
  - `gpu-readpixels-stall-notice`: 48, ANGLE's ReadPixels notice on the `/build/*` pages. ANGLE
    logs it at most 4 times per GPU process: 6 projects × 2 workers × 4 = 48;
  - `software-webgl-notice`: 0 (every project passes `--enable-unsafe-swiftshader`).
- **Console warnings now fail,** like errors (the Director's WP-Q2 step 4, test plan §13.2).
  Negative controls on 2026-10-02:
  - NC-W1, an app warning at start-up: 164 of 166 tests fail. The 2 that pass open no page.
  - NC-W2, build-lead's THREE.Clock filter taken out: 98 fail, all on `/build/*` pages.
  - NC-W3, a warning in the lazy 3D chunk only: 106 fail.
  - NC-W4 and NC-W4b, an app copy of either allowed notice: every page test fails.
- **Late problems:** NC-F3, an unhandled rejection 1 s after start, fails exactly the 17 route
  tests at the soak width (QA-P0-005).
- **What the smoke cannot see,** all documented in test plan §13.2:
  - problems later than about 1.5 s after navigation;
  - Chrome's unused-preload warning (QA-P0-017);
  - an allowed notice logged word for word by code that runs with the page's own URL (QA-P0-038).

## 9. Open defects

Severity levels are test plan §14's. The four DS0 Minors of WP-DS0 that concern Studio became
`backlog.md` items 42 to 46. Its Bench and Folio Minors closed with those directions.

### Open

| Id | Severity | Title | Owner | Status |
|---|---|---|---|---|
| QA-P0-016 | Minor | Focus rings lose their left side at the viewport edge | build-lead | open |
| QA-P0-017 | Minor | "Preloaded but not used" warning on a repeat load in the same tab | build-lead | open |
| QA-P0-018 | Minor | `tokens.md` lets state colours sit on the stage floor, where light `--ok` and `--warn` fail AA | design-lead | open |
| QA-P0-019 | Minor | An inset focus ring, one of backlog item 45's options, would vanish on `--action` | design-lead | open |
| QA-P0-020 | Minor | The benchmark conflict rule keys on the free-text GPU name and on the limiter | data-lead | open (latent) |
| QA-P0-021 | Minor | A price batch window is self-declared and unbounded | data-lead | open (rule 1 check R1-P4 covers it) |
| QA-P0-022 | Minor | A retailer's search-results page passes as a price URL | data-lead | open (R1-P3b covers it) |
| QA-P0-023 | Minor | `date-future` does not cover launch and release dates | data-lead | open |
| QA-P0-024 | Minor | Data files outside `DATA_PATHS` are never validated | data-lead | open |
| QA-P0-025 | Minor | Three games rest on player counts 22 to 61 months old | data-lead | open |
| QA-P0-026 | Minor | The docs and the practice differ in three places | data-lead | open |
| QA-P0-028 | Minor | The ASUS support-tab test accepts a URL for another board | data-lead | open (latent) |
| QA-P0-029 | Minor | Some sources' `fields` cover the new user-guide-only case values | data-lead | open |
| QA-P0-030 | Minor | The README does not mention `maker-pages.test.ts` | data-lead | open |
| QA-P0-031 | Minor | SA `priceBasis` describes only global-store import charges | data-lead | open |

**QA-P0-016: focus rings lose their left side at the viewport edge**
Severity: Minor · Owner: build-lead (FYI design-lead) · Found: 2026-10-01, home PC, `0c2c709`
- **Rule:** `tokens.md` §2.1 rule 6, "Focus is always visible". WCAG 2.4.7 is still met: the ring
  shows on 2 or 3 sides at 16.87:1 or more.
- **Steps:** 1. Serve `dist/`. 2. Open `/Rip-PC/` at any width and theme. 3. Press Tab.
- **Expected:** the ring shows on all four sides. **Actual:** every focusable element starts at
  x = 0, so the ring's left side is off-screen at every stop: 9 on `/`, 22 on `/build/cpu`, in all
  12 cells. The skip link also loses its top side.
- **Evidence:** `artifacts/screenshots/phase-0/wp-q2-ds1/defect-focus-ring-clipped-side-by-side.png`,
  `wp-ds1/focus-rings.json`.
- **Suggestion:** the Phase 2 frame (`--gutter`, `--inset`), with backlog item 45 extended to the
  viewport edge.

**QA-P0-017: a "preloaded but not used" warning on repeat loads**
Severity: Minor · Owner: build-lead (FYI design-lead) · Found: 2026-10-01, home PC, `0c2c709`
- **Steps:** 1. In a new browser context, open `/Rip-PC/` and wait 4.5 s: no warning. 2. Reload,
  or go to `/Rip-PC/build/cpu` in the same tab, and wait 4.5 s.
- **Expected:** no warning. **Actual:** Chromium logs "The resource …rig-lab-sans….woff2 was
  preloaded using link preload but not used within a few seconds from the window's load event". It
  came on 12 of 12 repeat loads, and on none of 15 first loads or 3 new tabs. Each load still makes
  exactly one font request; on a repeat load that is a 304 of 300 bytes.
- **Evidence:** `wp-ds1/preload-repro.json` and `.log`, `wp-ds1/preload-repro-newtab.json`.
- **Suggestion:** fold it into backlog item 22, the Phase 2 preload decision. The smoke cannot see
  this warning (§8).

**QA-P0-018: state colours on the stage floor**
Severity: Minor (a documentation gap; no use today) · Owner: design-lead · Found: 2026-10-01
- **Expected:** every colour pair the rules allow passes 4.5:1, or the rules exclude it.
- **Actual:** in light, `--ok` on `--stage-floor` is 4.36:1, `--ok` on `--stage-floor-deep` 3.79:1
  and `--warn` on `--stage-floor-deep` 4.23:1. Rule 2 does not keep state icons and labels on
  `--surface` and `--surface-raised`, where they pass at 4.82:1 or more.
- **Evidence:** `wp-ds1/contrast-qa.json`.
- **Fix:** one sentence in rule 2, or add the pairs to `contrast.mjs`.

**QA-P0-019: an inset focus ring would vanish on `--action`**
Severity: Minor (documentation, for later) · Owner: design-lead · Found: 2026-10-01
- **Actual:** `--focus` against `--action` is 1.10:1 in dark and 1.00:1 in light. Today's 3 px
  offset puts the ring on the surface around the button (16.87:1 or more). Backlog item 45 offers an
  inset ring, which would be invisible on the primary button.
- **Fix:** "never inset on `--action`" in rule 6 and item 45. **Evidence:** `wp-ds1/contrast-qa.json`.

**QA-P0-020 to 026: latent validator gaps and doc gaps, from the WP-D0 check**
Severity: Minor · Owner: data-lead · Found: 2026-10-01, at `0c2c709`; still present at `73005aa`
- Steps, expected and actual for each are in `wp-d0/worker-report-2026-10-01T2015Z.txt` §4, as
  D0-01 to D0-07. Each control is in `wp-d0-merged/c2-negative-controls.json` (PROBE-B to F) and
  `minors-reprobe.txt`.
- **QA-P0-020:** a CPU-bound row whose GPU name is spelled differently is never compared (PROBE-B).
  The key also includes the limiter. Key on `chipId` instead.
- **QA-P0-021:** a batch window of 2025-01-01 and a price dated 2025-06-01 pass (PROBE-C). Tie the
  window to the batch date.
- **QA-P0-022:** `amazon.com/s?k=…` passes as a price URL (PROBE-D). Add a product-URL pattern per
  retailer.
- **QA-P0-023:** a CPU launch date of 2027-06 passes (PROBE-E).
- **QA-P0-024:** a new `data/parts/thermal-paste.json` with an invalid record passes all 106 tests
  (PROBE-F).
- **QA-P0-025:** VALORANT's count is from 2024-10-02, Fortnite's from 2024-11-30 and Minecraft's from
  August 2021. Each has a note, so "dated" holds; "current" does not. Newer figures are needed, or
  the Director's acceptance in `games.json`.
- **QA-P0-026:** three doc gaps:
  - `schema/motherboard.ts` line 138's comment on `laneSharing: []`;
  - the README's "without a flag";
  - no written precedence between a CPU's BIOS row and its family's row.

**QA-P0-028 to 031: from the re-check of the merged data**
Severity: Minor · Owner: data-lead · Found: 2026-10-02, at `73005aa`
- **Evidence:** `wp-d0-merged/results.json` (`newDefects`), `c2-negative-controls.json` (PROBE-G
  and H), `fix010-terra-support-article-live.txt` and `fix012-sa-import-scan.json`.
- **QA-P0-028:** `maker-pages.test.ts` checks only the tab and that `model2Name` is set. A Z890
  record pointing at the B760M's support page passes (PROBE-G and H). Today's 9 URLs are all right.
- **QA-P0-029:** some sources nominally back case values they do not state:
  - the Terra support article's `fields` cover `layoutPositions.*.radiatorFanMaxThicknessMm`, which
    only the user guide gives;
  - the Pop product pages, with no `fields`, cover the user-guide-only limits and the 140 mm front
    radiator, which those pages leave out (a record note says so).

  Every value is also backed by the right guide, so nothing is unsourced.
- **QA-P0-030:** the README's layout table lists neither `maker-pages.test.ts` nor
  `capture-name.test.ts`.
- **QA-P0-031:** `sa.json`'s `priceBasis` speaks of the global store only. The two offers fixed in
  QA-P0-012 are third-party offers whose pages say "Import Fees Deposit Included".

### Closed

| Id | Severity | Title | Owner | Fixed in · verified |
|---|---|---|---|---|
| QA-P0-001 | Minor | THREE.Clock deprecation warning on every build step | build-lead | `9286430` · 2026-10-02: 0 warnings; the warnings gate fails on it if it comes back |
| QA-P0-002 | Minor | Lighthouse CI used a fixed port and collided between worktrees | qa-lead | `03ed345` · ports per checkout; parallel runs today |
| QA-P0-003 | Major | A headless reference fps run gave a false PASS (6,967 fps) | qa-lead | `03ed345` · headless reference runs are INVALID (approved) |
| QA-P0-004 | Major | Web vitals hid the page about 2 s in, so late LCP and shifts passed | qa-lead | `a62fba6` · NC-V2b and NC-V3 fail now (approved) |
| QA-P0-005 | Major | A late unhandled rejection passed every smoke test | qa-lead | `5136864` · NC-F3 fails 17 tests; re-checked by a fresh worker today (approved) |
| QA-P0-006 | Major | The LCP gates' two blind spots: a low-priority LCP image, and bandwidth contention | qa-lead | **deferred in writing by the Director to Phase 2 entry** (test plan §6.1, §16) |
| QA-P0-007 | Major | The `main` ruleset required a check CI never reports | Hazem | fixed by Hazem on 2026-10-02 · QA read the ruleset: it requires `npm run verify` and `Performance budgets` from GitHub Actions (15368), the names CI reports on `3966db1` |
| QA-P0-008 | **Blocker** | Two ASUS CPU-support sources opened the FAQ tab | data-lead | `25e0549`, `17ba6b6` · live re-fetch and captures, 2026-10-02 |
| QA-P0-009 | **Blocker** | A case's size class was derived, not the maker's | data-lead | `4f823ff` · maker words for all 5 cases; the size rule is enforced |
| QA-P0-010 | Major | Published radiator thickness limits were recorded as unpublished | data-lead | `d97e478` · against the four Fractal user guides |
| QA-P0-011 | Major | 8 TechPowerUp rows lacked the stated Core 200S Boost profile | data-lead | `24f8265` · against the reviews' test set-ups; no number changed |
| QA-P0-012 | Major | 2 SA imported offers lacked their import-fee note | data-lead | `20b3d24` · all 12 SA captures with a split carry the note; no amount changed |
| QA-P0-013 | Minor | `lhci-config.test.mjs` failed when `LHCI_PORT` was set | qa-lead | `03ed345` · 6 of 6 with 4191, unset and 39999 |
| QA-P0-014 | Minor | Four `budget.json` values were not pinned | qa-lead | `5136864` · 19 of 19 mutations caught |
| QA-P0-015 | Minor | Test plan gaps in §6.1, §6.4, §13, B.4, D9 and D10 | qa-lead | `0c2c709`, `e3f58fc` · each gap quoted by a fresh worker |
| QA-P0-027 | Major | Pre-purge IDs were published, the full map at two branch tips, while GitHub serves the old commits | Director | 2026-10-02: the two branches deleted, plus four more merged ones. History copies **accepted in writing by the Director** (`b8facf6`). Hazem's Support request covers all 87 orphaned commits |
| QA-P0-032 | Minor | The software-WebGL entry allowed any warning that began with its words | qa-lead | `e3f58fc` · re-tested by a fresh worker; the prefix was narrowed in `3ef6c6f` (QA-P0-038) |
| QA-P0-033 | Minor | An app that logged the exact ReadPixels text passed | qa-lead | `e3f58fc` · re-tested; the remaining limit is QA-P0-038 |
| QA-P0-034 | Minor | The ReadPixels notice was put down to the GPU driver; it is ANGLE on SwiftShader | qa-lead | `e3f58fc` · re-tested |
| QA-P0-035 | Minor | §13.2's self-test table, and what catches a broken fixture | qa-lead | `e3f58fc` · re-tested |
| QA-P0-036 | Minor | Seven more method values were not pinned; two switched coverage off | qa-lead | `e3f58fc` · 9 of 9 mutations fail; the web-vitals spec refuses an empty plan |
| QA-P0-037 | Minor | §3.2 D10 had empty columns | qa-lead | `e3f58fc` · re-tested |
| QA-P0-038 | Minor | Inline handlers that a script sets carry the page's URL; the software-WebGL prefix was too broad | qa-lead | `3ef6c6f` · a unit test; checked by qa-lead only |
| QA-P0-039 | Minor | The rest of the approved method values were not pinned | qa-lead | `3ef6c6f` · 19 of 19 mutations fail; checked by qa-lead only |
| QA-P0-040 | Minor | Two slips in §13.2 | qa-lead | `3ef6c6f` · checked by qa-lead only |
| QA-P0-041 | Major | `data/audits.json` published the WP-D0 merge's pre-purge commit ID in the audit seed string | data-lead | `e64f241` · only that value changed; no file in the tree names a pre-purge commit; the seed is kept outside the repo, byte for byte |
| DS0-01 | Major | Light `--ink-3` on the floor's near edge, 4.08:1 | design-lead | `11ea665` · 4.6078:1, recomputed and rendered |
| DS0-11 | Minor | Tesla not studied | design-lead | **waived in writing by the Director**, 2026-10-01 |
| DS0-12 | Minor | One image over 300,000 bytes | design-lead | `761133d` · 292,116 B |
| DS0-13 | Minor | 3D survey author handles and the Poly Haven URL | design-lead | `761133d` · 39 of 39 rows checked |

QA-P0-001 to 015 were found on 2026-10-01, and QA-P0-027 to 041 on 2026-10-02. Each was re-tested
on the integration branch, or on QA's branch where the fix is QA's own, before it was closed.

## 10. Evidence purge check

Hazem approved the purge of 11 binary files (9 archive parts and 2 git bundles) from the history of
all 5 branches on 2026-10-01. QA checked it independently on 2026-10-01 and again on 2026-10-02 at
06:19 and 08:44 UTC.

- **The purged blobs,** taken from the pre-purge backup bundle (SHA-256 `f730028e…`;
  `git bundle verify` exits 0). Re-derived twice from the bundle, with the same list both times.
  - The 11 IDs, as 8-character prefixes: `10bd12f2` `350491cd` `45314786` `5f1e85aa` `69d463af`
    `6e05bf59` `799512d0` `8b65a833` `928b72ff` `a4832014` `d41767f1`.
  - SHA-256 over the sorted full IDs, one per line with LF endings:
    `3cd06ffa8b5eef9f69ae20cf05b5d155fbba5a44e92a44d3e635d7b0fdeb4967`.
- **GitHub today** (a fresh `git clone --mirror`, 08:44 UTC):
  - 5 branches; no tags and no pull refs. The mirror is 12 MB, with 2,271 objects reachable.
  - **0 of the 11 blobs** are in its object store, or reachable from any ref. **The purge holds.**
- **Commit history:** 87 pre-purge commits were rewritten; 72 older ones, `main` among them, kept
  their IDs.
- **Not closed, outside the repo's control:** GitHub still serves the old commits by ID. The commits
  API answers 200 for the commit that added the archives. Hazem's Support request is filed. After
  GitHub replies, the Director re-checks for a 404.
- **Old IDs in what origin serves** (QA-P0-027, QA-P0-041):
  - At 06:19 UTC, all 87 orphaned IDs appeared somewhere, the whole old-to-new map at the tips of
    two merged branches among them. The Director deleted those branches that morning.
  - At 08:44 UTC the only tip file with an old ID is `data/audits.json` (QA-P0-041). The history
    still holds them in 15 commit messages and 61 older file versions. The Director accepts that in
    writing; it ends when GitHub removes the old commits.
  - data-lead's `e64f241` removes it. At 09:17 UTC the old line was still at the tips of the
    integration branch (until the merge), `feat/qa-phase0-verification` (fully merged) and
    `feat/data-qa-fixes` (kept for 2fa3e32).
  - Five of those 15 messages are QA's own, from 2026-10-01, on QA's branch: the rewrite kept the
    text they were written with. Merging the branch adds them to the integration history. They are
    already on origin.
- **Evidence:** `audit/purge-verify-2026-10-01/`, `audit/purge-recheck-2026-10-02/` and
  `audit/purge-recheck-2026-10-02-after-deletions/`, with the scripts in
  `audit/purge-recheck-scripts/`. Their full IDs stay in those git-ignored files.

## 11. Waivers, deferrals and known gaps

**In writing, by the Director:**
- DS0-11, Tesla not studied (2026-10-01).
- QA-P0-006, deferred to Phase 2 entry, owner qa-lead.
- QA-P0-027: the history copies of old IDs are accepted.
- KB means 1,000 bytes.
- The method changes `webVitals.minObserveMs` 5000, headless reference fps INVALID, the smoke
  soak and the warnings gate.
- Phase 1 data and schema items:
  - the Fractal North's drive-tray configurations as a structured model;
  - a radiator width field;
  - the structured Intel power profile;
  - the case size-class redesign;
  - the 300 mm GPU limit with a front 360, which stays.

  QA adds one input for the drive-tray model. On the North, one tray at position A allows a 255 mm
  PSU but only a 280 mm front radiator. A front 360 needs the tray further back, where the PSU limit
  is 140 to 215 mm. Phase 1's fit rules must not pass a 255 mm PSU with a front 360 (guide p. 26,
  `wp-d0-merged/results.json`, observation O-2).

**For the Director to decide:**
- DS0-12, second part: must our own mock screenshots carry the reference-capture caption (URL, date,
  trademark notice)? QA reads plan WP-DS0.1 as covering third-party captures only. The mocks are
  marked "Design mock, illustrative values, not data".
- The draft `docs/reports/phase-0.md` §1 says `backlog.md` has 46 items. It has 49, as its §5 says.

**Not measured in Phase 0, by plan:**
- 60 fps on the reference laptop (Phase 3);
- visual baselines (Phase 2, and they need Docker);
- the keyboard path and screen readers (Phase 2);
- INP (Phase 2);
- model tests (from Phase 4) and compatibility traceability (Phase 1).

**Known limits of this report:**
- **The last fix round** (QA-P0-038 to 040, `3ef6c6f`) was checked by qa-lead with unit tests and 19
  mutations, not by a fresh worker. Every earlier QA change had a fresh worker's check.
- **Yesterday's two re-verification workers were not lost in the shutdown.** Both had finished and
  sent their reports minutes before the stop. QA recovered the reports from their transcripts into
  `wp-d0/` and `wp-ds1/`, next to the evidence they wrote. Everything the WP-D0 report covered that
  the fixes changed was re-run today.
- **Node 24 here, Node 22 in CI:** no difference seen. CI passed on every commit pushed today.
- **On Windows,** the local preview answers 200 for `/build/CPU`, because NTFS ignores case. GitHub
  Pages does not. This is not an app defect.

## 12. Sign-off

QA: qa-lead, 2026-10-02. Director: pending.
