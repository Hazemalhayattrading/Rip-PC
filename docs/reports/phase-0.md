# Phase 0 — Foundations: report

Date: 2026-10-02 · Author: Director · **Status: final.**
- QA closed the phase in `docs/qa/report-phase-0.md`: 0 Blockers, 0 open Majors, 15 open Minors
  with owners.
- The Director signs off (§7).
- The merge to `main` waits for Hazem.

Phase goal (BUILD_PROMPT §2): data schemas and seed data, a design direction with tokens, the
scaffold with CI, Pages deploy, test harness and empty routes, and QA's test plan with budget checks
in CI. No product UI yet.

Commit IDs below are post-purge IDs. The old-to-new map is kept outside the public repo, because
GitHub still serves pre-purge commits by ID until it acts on Hazem's Support request.

---

## 1. What shipped

| WP | Owner | Result | Merged |
|---|---|---|---|
| WP-B0 Scaffold, CI, Pages deploy, harness, empty routes | build-lead | Accepted on day 1. QA re-verified it: 11 of 11 criteria pass | `c612eed` |
| WP-Q0 Test plan and budget tooling | qa-lead | Accepted on day 1. A fresh worker re-verified it: 6 of 6 pass, after the web-vitals window fix (QA-P0-004) | `aff5383` |
| WP-DS0 Reference study and three directions | design-lead | Accepted on day 1; Hazem picked **C, Studio**. QA re-verified it: 6 of 6 pass, Tesla waived (DS0-11) | `139c873`, doc fixes `d3799da` |
| WP-Q1 Playwright set-up and budget checks in CI | qa-lead | Accepted on day 1. Re-verified: 2 of 2 pass | `0fdc265` |
| **WP-D0** Data foundations | data-lead | Accepted after one round of Director review and QA's 10% audit. 9 of 9 criteria pass on the merged data | `c04e2a5`; QA fixes `1ade3f3`, `cb188d4`, `2ec4811` |
| **WP-DS1** Tokens for Studio | design-lead | Accepted, plus an addendum with two AA fixes. QA: pass | `424107a`, `3b7f645`, `a1866ee` |
| **WP-B1** Wire the tokens, and build follow-ups | build-lead | Accepted in two parts, plus an addendum. QA: pass | `c823146`, `91fa4b4`, `9286430` |
| **WP-Q2** Independent verification | qa-lead | **Verdict CLOSED** | tests and harness `9eb3224`; report `2361fc9` |

### WP-D0, data foundations
- **Schemas and validation.** Zod schemas for every plan §5 category. The validator has 34 rules,
  each with named tests; among them source coverage, the publisher registry, rule-1 checks on
  prices, archive rules on benchmarks, and sanity rules. QA rejected 58 of 58 negative controls.
- **Seed catalogue: 73 spec records**, with specs from manufacturer pages:
  - CPU 16 (AM5 7, AM4 2, LGA1851 4, LGA1700 3);
  - motherboard 7 (one per socket, ATX, mATX and Mini-ITX, each with its lane-sharing rules and
    BIOS minimums);
  - RAM 6, GPU chip 11, GPU card 10, storage 5, PSU 5, cooler 5, case 5, case fan 3.
- **Prices**, from live retailer pages only (Owner's rule 1), each with its own capture:
  - US: 52 prices and 10 gaps;
  - SA: 45 prices and 17 gaps.
- **Benchmarks:** 116 game anchors (ComputerBase live, TechPowerUp archived), 27 creator anchors
  (Cinebench 2024 and Blender Open Data), and 15 games with dated player counts.
- **Audits:**
  - **data-lead's own 20% audit:** 78 items, 8 findings, all fixed.
  - **The Director's review:** the Fractal North TG Light was recorded at the Mesh-only 145 mm
    cooler limit, where this SKU's is 170 mm. data-lead's sweep then found the North's PSU limit
    by drive-tray count, and the schema now holds conditional PSU limits.
  - **QA's seeded 10% audit:** 43 of 355 records, 1,265 fields; 1,189 matched, 67 null as allowed,
    9 findings.
    - The findings: two ASUS CPU-support links on the wrong tab, case size classes derived
      rather than sourced, radiator limits that the user guides do publish, a missing CPU power
      profile, and two SA import-fee notes.
    - All were fixed and re-verified against their sources. The case size is now a documented
      derivation, and the maker's own words are a sourced field.
  - **Owner's rule 1:** passes on 100% of rows (97 prices, 27 gaps, 143 benchmark rows).

### WP-DS1, tokens for Studio
- **`tokens.css`:** the Tailwind v4 `@theme`, dark first, with light. All 34 contrast pairs pass AA,
  covering both ends of the floor gradient and the key-light worst case. The lowest renders at
  4.537:1.
- **Rig Lab Sans:** a renamed, OFL-licensed Mona Sans subset, 72,332 B. Its fallback is calibrated
  to 103.14%; HarfBuzz and Windows Chromium agree. The corpus width error is 0.00%, and the swap's
  CLS is 0.0000 in the app.
- **Docs:** `tokens.md`, `studio-3d-brief.md` (with the paid-asset options for Hazem), and
  `specs-view.md`.
- **Two AA defects, found after acceptance and fixed in the addendum:**
  - `::selection` had no text colour (3.06:1). It's now solid `--stage` on `--ink`, 16.75:1 or
    better.
  - Light `--ink-3` on the darker floor tone was 4.08:1, found by QA's DS0-01. It's now 4.61:1.
- **`backlog.md`:** 49 spec items for WP-DS2.

### WP-B1, the tokens wired into the app
- **Category ids.** The build state uses data-lead's ids: `gpu` became `gpu-card`, with the v1 URL
  code `g` unchanged. A test pins it to data-lead's buyable categories.
- **New lint rule:** `no-import-type-side-effects`. A probe showed that a type-only import from
  `src/three` put three.js on every page: initial JS went from 77.40 to 320.49 KB gzip.
- **The app shell** follows `tokens.md` §1: tokens.css with no layer, then Preflight and
  `base.css`, the font preload, `data-theme`, and a script that restores a light choice before
  the first paint. `theme.ts` was written test first.
- **A "Light theme" toggle.** It works by mouse and keyboard, and a first visit is dark even when
  the OS prefers light.
- **The R3F THREE.Clock deprecation warning is filtered** (QA-P0-001). That let QA fail the
  smoke tests on app warnings.

### WP-Q2, independent verification
- **Coverage:** fresh workers checked every work package, QA's own included.
- **Smoke gates:** the smoke now fails on console warnings as well as errors, and a 1 s soak per
  route catches late rejections.
- **axe:** runs in dark and light at every width.
- **Method values:** every approved value in `budget.json` is pinned by a test.
- **QA's own defects:** 16 found in its tooling and closed (QA-P0-002 to 005, 013 to 015, and 032
  to 040).
- **Pre-purge IDs:** QA caught them still published at branch tips (QA-P0-027 and 041), and both
  are fixed.

## 2. Measured

On the home PC: Ryzen 7 9800X3D, RTX 5080, Windows 11, Node 24, Chromium 1194. **It is not the Arc
reference laptop,** so its timings are tool evidence, never gates. CI (ubuntu, Node 22) is green on
every commit.

| Bar (BUILD_PROMPT §8) | Budget | Measured | Result |
|---|---|---|---|
| Initial JS, gzip | < 250 KB | **77,920 B** on all 18 pages (31.2%). CSS 3,317 B. three.js only in the lazy 3D chunk | PASS |
| Lighthouse performance | ≥ 0.90 | 1.00 mobile and desktop (3 runs, median) | PASS |
| LCP | < 2.5 s | Lighthouse 1,651 ms mobile and 361 ms desktop. Web vitals 44–136 ms, each load watched at least 5 s | PASS |
| CLS | < 0.05 | 0 (Lighthouse); 0.0000 (web vitals) | PASS |
| TBT, the INP proxy | < 200 ms | 0 ms | PASS |
| INP | < 200 ms | not gated until Phase 2, which brings the interactions | n/a |
| Console errors and warnings, unhandled rejections | 0 | 166 smoke tests, 0 unexpected problems | PASS |
| WCAG 2.1 AA (non-3D UI) | AA | axe: 108 checks (18 pages × 3 widths × 2 themes), 0 violations. Tokens: 34 of 34 pairs | PASS |
| Unit and e2e | green | 597 unit, 166 e2e. `npm run verify` takes 79 s (QA) to 104 s (the Director's last run) here | PASS |
| 60 fps 3D on the Arc iGPU | 60 fps | no scene until Phase 3; a headless fps run counts as INVALID | n/a |

## 3. How Phase 0 ran (home PC, 2026-10-01 and 02)

- **Agent teams work here.** The four leads ran as real in-process teammates, and each spawned
  unnamed workers. Limits we found and worked around:
  - a worker's final hand-back reaches the Director, not its lead;
  - a teammate receives messages only between its turns;
  - teammates have no task list tools;
  - the harness refuses `.md` report files from any teammate. Hazem approved the Director
    committing QA's report text unchanged.
  All of this is in `docs/reports/phase-0-briefs.md`, `progress.md` and the project memory.
- **Windows fixes.**
  - CRLF checkouts, left over from a `main` checkout made before `.gitattributes` existed:
    `core.autocrlf=false` is now set for this repo.
  - A path-separator bug in one QA test (`0114261`).
  - 45 project-skill symlinks restored, after Hazem turned on Developer Mode.
- **Evidence purge** (Hazem's decision). The 222 MB of third-party page captures left the public
  repo and the history of all 5 branches: 11 binary files, 87 commits rewritten.
  - **Kept locally**, in `C:\Projects\rig-lab-evidence`, checksum-listed in `docs/reports/evidence/`.
  - **Verified** by the Director and, independently, by QA: a fresh mirror clone of GitHub holds
    0 of the 11 blobs; the pack is 12 MB, down from 236 MB.
  - **Untouched:** `main` and every older commit kept their IDs.
  - **Clean-up:** QA found pre-purge IDs still published at branch tips while GitHub serves the
    old commits. The Director deleted 7 merged branches on origin, and data-lead reworded the one
    tracked file that still cited an old ID.
- **Rule 12.** `progress.md` was updated after every accepted task. On 2026-10-01 the PC was shut
  down mid-phase: every teammate was stopped at a safe point, with all branches pushed. On
  2026-10-02 the work resumed from `progress.md` without redoing anything.
- **Context7.** No API key was ever in the repo. The keyless project entry that hid Hazem's
  user-level server was removed (`0c30135`).

## 4. Decisions

- **Hazem:**
  - golden rule 12;
  - purge the captures, the 2 bundles included;
  - remove `context7` from `.mcp.json`;
  - keep the 27 design reference screenshots in the repo;
  - Developer Mode on;
  - the `main` ruleset fixed to `npm run verify` and `Performance budgets` (2026-10-02);
  - the GitHub Support request filed (2026-10-02);
  - the Director may commit QA's refused report text.
- **Director, within remit:**
  - WP-B1 Part 1 accepted early;
  - the WP-D0 blocker (the North cooler limit);
  - the font preload kept for Phase 0, and revisited in Phase 2 with the shell text in static HTML;
  - KB means 1,000 bytes;
  - Tesla waived (DS0-11);
  - our own mock screenshots don't need the reference-capture caption (DS0-12, second part);
  - QA-P0-006 deferred to Phase 2 entry;
  - QA's method changes approved (`minObserveMs` 5 s, headless fps INVALID, the per-route soak,
    the warnings gate);
  - the R3F warning filter;
  - the Phase 1 data and schema deferrals (§5);
  - history copies of pre-purge IDs accepted (QA-P0-027);
  - merged branches deleted on origin.

## 5. Open issues

**For Hazem** (details in `progress.md`, "Open items"):
1. **The PR to `main`.** The integration branch is ready. Merging it deploys GitHub Pages, and both
   required checks match CI.
2. **GitHub's reply to the Support request.** The Director then re-checks that the old commit
   answers 404.
3. **Rotate the Context7 API key.** It was printed in a session transcript, never in the repo.
4. **Paid 3D assets** (`studio-3d-brief.md` §7): A now, B before Phase 3 (about USD 1,440, an
   estimate), skip C. Three questions are attached.
5. **KTX2 (`toktx`) install** before Phase 3.
6. Optional:
   - a private backup of `C:\Projects\rig-lab-evidence`, which is now the only full copy;
   - Node 22 (per `.nvmrc`);
   - Docker, needed for visual baselines in Phase 2.

**QA's 15 open Minors** (`docs/qa/report-phase-0.md` §9):
- **build-lead, for Phase 2:**
  - QA-P0-016: focus rings clipped at the viewport edge;
  - QA-P0-017: an unused-preload warning on repeat loads.
- **design-lead, for WP-DS2:**
  - QA-P0-018: state colours on the stage floor;
  - QA-P0-019: an inset focus ring on `--action`.
- **data-lead, for Phase 1:** QA-P0-020 to 026 and 028 to 031. These are latent validator gaps
  (conflict key, batch window, search URLs, future dates, unlisted data files, the support-tab
  test) and doc gaps, plus old player counts for three games.

**Phase 1 backlog:**
- **Data:**
  - BIOS "All" listings need a sourced board launch or first-BIOS date, so the BIOS rule can warn
    instead of passing silently;
  - more SA retailers: all 45 SA prices are marketplace offers from one retailer;
  - benchmark coverage: 5 of 15 games, and nothing for the RTX 5060 or 7 CPUs;
  - the Newegg seller selector in the price runner;
  - the North's RAM clearance under a top radiator;
  - a re-price batch before launch;
  - the reseller rule in the validator.
- **Data and engine schema** (deferred in writing on 2026-10-01):
  - **The North's drive-tray configurations,** as a structured model like the Terra's spine. Until
    then, the engine must not treat the case PSU rows as guarantees.
    - QA's input: a 255 mm PSU fits only with the tray at position A, which limits the front
      radiator to 280 mm. The fit rules must not pass a 255 mm PSU together with a front 360.
  - **A radiator width field.**
  - **A structured CPU power profile** in the benchmark test conditions. Commit 2fa3e32 is parked
    for it.
  - **The case size-class redesign:**
    - a zod-free `deriveCaseSize` module with `exteriorVolumeLiters`;
    - frozen class ids, because they become share-link filter ids;
    - boundary tests at 20 L and 70 L, missing dimensions, E-ATX and ITX-only, with today's 5
      cases pinned.
- **Design:** WP-DS2, 49 backlog items (accessibility, motion, the Specs view, copy, 3D brief).
- **QA:** QA-P0-006, an LCP check with applied throttling, at Phase 2 entry.

## 6. Next

1. **Hazem:** read this report, and approve the PR from `claude/keen-lamport-0794zj` to `main`.
   The Director opens it on request. Hazem merges, which deploys GitHub Pages.
2. **Director:**
   - park 2fa3e32 on a clean branch, then delete the last superseded branches on origin;
   - run purge stage 3, the local gc, once every lead is idle;
   - re-check the old commit for a 404 after GitHub's reply.
3. **Phase 1, the engine:** only after Hazem has read this report. A Phase 1 plan follows, with the
   backlog above.

## 7. Sign-off

Director, 2026-10-02:
- **Phase 0 is accepted.** Every plan §5 criterion passes or is waived in writing, QA's verdict is
  CLOSED, and `npm run verify` passes on the integration branch, with CI green.
- The phase is ready to merge to `main` on Hazem's approval.
