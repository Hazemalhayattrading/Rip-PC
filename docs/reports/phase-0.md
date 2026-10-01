# Phase 0 — Foundations: report

Date: 2026-10-01 · Author: Director · **Status: draft, waiting for QA's report
(`docs/qa/report-phase-0.md`, WP-Q2).** The phase closes only on a green QA report.

Phase goal (BUILD_PROMPT §2): data schemas and seed data, a design direction with tokens, the
scaffold with CI, Pages deploy, test harness and empty routes, and QA's test plan with budget checks
in CI. No product UI yet. Commit IDs below are after the evidence purge;
`docs/reports/evidence/purge-sha-map.txt` maps the older ones.

---

## 1. What shipped

| WP | Owner | Result | Merged |
|---|---|---|---|
| WP-B0 Scaffold, CI, Pages deploy, harness, empty routes | build-lead | Accepted on day 1. QA re-verified it independently today: 11 of 11 criteria pass | `c612eed` (day 1) |
| WP-Q0 Test plan and budget tooling | qa-lead | Accepted on day 1. QA re-verified it with a fresh worker: 5 pass; the 1 partial (the web-vitals window) is fixed as QA-P0-004 | `aff5383` (day 1) |
| WP-DS0 Reference study and three directions | design-lead | Accepted on day 1; Hazem picked **C, Studio**. QA re-verified it, and its doc findings are fixed (`d3799da`) | `139c873` (day 1) |
| WP-Q1 Playwright set-up and budget checks in CI | qa-lead | Accepted on day 1. QA re-verified it: both criteria pass | `0fdc265` (day 1) |
| **WP-D0** Data foundations | data-lead | Accepted after one round of review (details below) | `c04e2a5`, then `a3d88a8` |
| **WP-DS1** Tokens for Studio | design-lead | Accepted, plus an addendum with two AA fixes | `424107a`, then `3b7f645` |
| **WP-B1** Wire the tokens, and build follow-ups | build-lead | Accepted in two parts, plus an addendum | `c823146`, `91fa4b4`, `9286430` |
| **WP-Q2** Independent verification | qa-lead | **In progress** | — |

### WP-D0, data foundations
- **Schemas and validation.** Zod schemas for every plan §5 category. The validator has 34 rules,
  each with named tests; among them source coverage, the publisher registry, rule-1 checks on
  prices, archive rules on benchmarks, and sanity rules.
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
- **data-lead's own 20% audit:** 78 items, 8 findings, all fixed.
- **The Director's review found one wrong value.** The Fractal North TG Light was recorded at the
  Mesh-only 145 mm cooler limit; this SKU's limit is 170 mm. data-lead's follow-up sweep found a
  second conditional value, the North's PSU limit by HDD-tray count. The schema now holds
  conditional PSU limits.

### WP-DS1, tokens for Studio
- **`tokens.css`:** the Tailwind v4 `@theme`, dark first, with light. All 34 contrast pairs pass AA,
  covering both ends of the floor gradient and the key-light worst case. The lowest is 4.54:1.
- **Rig Lab Sans:** a renamed, OFL-licensed Mona Sans subset, 72,332 B. Its fallback is calibrated
  to 103.14%; HarfBuzz and Windows Chromium agree. The corpus width error is 0.00%, and the swap's
  CLS is 0.0008 on the specimen and 0.0000 in the app.
- **Docs:** `tokens.md`, `studio-3d-brief.md` (with the paid-asset options for Hazem), and
  `specs-view.md`.
- **Two AA defects, found after acceptance and fixed in the addendum:**
  - `::selection` had no text colour (3.06:1). It's now solid `--stage` on `--ink`, 16.75:1 or
    better.
  - Light `--ink-3` on the darker floor tone was 4.08:1, found by QA's DS0-01. It's now 4.61:1.
- **`backlog.md`:** 46 spec items for WP-DS2.

### WP-B1, the tokens wired into the app
- **Category ids.** The build state uses data-lead's ids: `gpu` became `gpu-card`, with the v1 URL
  code `g` unchanged. A test pins it to data-lead's buyable categories.
- **New lint rule:** `no-import-type-side-effects`. A probe showed that a type-only import from
  `src/three` put three.js on every page: initial JS went from 77.40 to 320.49 KB gzip.
- **The app shell** follows `tokens.md` §1: tokens.css with no layer, then Preflight and
  `base.css`, the font preload, `data-theme`, and a script that restores a light choice before
  the first paint. `theme.ts` was written test first.
- **A "Light theme" toggle.**
- **The R3F THREE.Clock deprecation warning is filtered** (QA-P0-001). That lets QA fail the
  smoke tests on app warnings.

## 2. Measured (home PC, Ryzen 7 9800X3D and RTX 5080, Windows 11, Node 24; not the Arc laptop)

| Bar (BUILD_PROMPT §8) | Budget | Measured on the integration branch | By |
|---|---|---|---|
| Initial JS, gzip | < 250 KB | **77.92 KB** (31.2%). CSS 3.32 KB gzip; the 3D chunk is lazy | Director, `perf:bundle` on `9286430` |
| Lighthouse performance, mobile | ≥ 0.90 | 1.00 | QA (Part 1); build-lead after the wiring |
| LCP | < 2.5 s | Lighthouse mobile (simulated) 1.36–1.66 s; web vitals 44–216 ms; devtools-throttled with preload 2.12 s | QA; build-lead |
| CLS | < 0.05 | 0 on every route; font swap 0.0000 in the app | QA; build-lead |
| Console errors, unhandled rejections | 0 | 0 in 112/112 smoke tests. A late-rejection gap (QA-P0-005) is being closed with a per-route soak | QA |
| Unit and e2e | green | 486 unit, 112 e2e smoke. `npm run verify` takes 50–57 s here | Director, after every merge |
| WCAG 2.1 AA (non-3D UI) | AA | Token contrast 34/34 pairs. axe on every route at 390/768/1440, 0 violations; dark and light projects pending (QA Part 2) | design-lead; QA |
| 60 fps 3D on the Arc iGPU | 60 fps | n/a: no scene until Phase 3. A headless fps run counts as INVALID (QA-P0-003) | — |

**Pending in QA's report:**
- the seeded 10% data audit (43 of 355 records);
- axe in both themes;
- QA's independent check of the evidence purge;
- the final measured numbers on the closing commit.

## 3. How Phase 0 ran (home PC, 2026-10-01)

- **Agent teams work here.** The four leads ran as real teammates (in-process); each spawned
  unnamed workers. Limits we found and worked around:
  - A worker's final hand-back reaches the Director, not its lead. Workers now report by
    SendMessage, and also to a file.
  - A teammate receives messages only between its turns. A lead that's blocked on workers can't
    be reached until they finish.
  - Teammates have no task list tools.
  All of this is recorded in `docs/reports/phase-0-briefs.md` and `progress.md`.
- **Windows fixes.**
  - 365 and then 974 CRLF checkouts, left over from a `main` checkout made before `.gitattributes`
    existed. `core.autocrlf=false` is now set for this repo.
  - A path-separator bug in one QA test (`45c0bae` → `0114261`).
  - 45 project-skill symlinks restored, after Hazem turned on Developer Mode.
- **Evidence purge** (Hazem's decision). The 222 MB of third-party page captures left the public
  repo and the history of all 5 branches: 11 binary files, 87 commits rewritten.
  - **Kept locally**, in `C:\Projects\rig-lab-evidence`, checksum-listed in `docs/reports/evidence/`.
  - **Verified:** a fresh mirror clone of GitHub holds 0 of the 11 blobs; the pack is 12 MB, down
    from 236 MB.
  - **Untouched:** `main` and every older commit kept their IDs.
- **Context7.** No API key was ever in the repo. The keyless project entry that hid Hazem's
  user-level server was removed (`0c30135`).
- **Rule 12** (`a7db85b`). `progress.md` was updated after every accepted task.

## 4. Decisions

- **Hazem:**
  - golden rule 12;
  - purge the captures now, the 2 bundles included;
  - remove `context7` from `.mcp.json`;
  - keep the 27 design reference screenshots in the repo;
  - Developer Mode on.
- **Director, within remit:**
  - WP-B1 Part 1 accepted early;
  - the WP-D0 blocker;
  - the font preload kept for Phase 0, revisited in Phase 2 with the shell text in static HTML;
  - KB means 1,000 bytes;
  - Tesla waived (DS0-11);
  - QA-P0-006 deferred to Phase 2 entry;
  - QA's method changes approved (`minObserveMs` 5 s, headless fps INVALID, the per-route soak);
  - the R3F warning filter.

## 5. Open issues

**For Hazem** (details in `progress.md`, "Open items"):
1. **The `main` ruleset requires a check named `verify`, but CI reports `npm run verify`.** As
   things stand, the PR to `main` can't pass. Rename the required check, or have build-lead rename
   the job.
2. **The GitHub Support request** to drop the purged commits' cached views. The draft text is in
   `progress.md`.
3. **Rotate the Context7 API key.** It was printed in a session transcript, never in the repo.
4. **Paid 3D assets** (`studio-3d-brief.md` §7): A now, B before Phase 3 (about USD 1,440, an
   estimate), skip C. Three questions are attached.
5. **KTX2 (`toktx`) install** before Phase 3.
6. Optional:
   - a private backup of `C:\Projects\rig-lab-evidence`, which is now the only full copy;
   - Node 22 (per `.nvmrc`);
   - Docker, needed for visual baselines in Phase 2.

**Phase 1 backlog:**
- **Data:**
  - BIOS "All" listings need a sourced board launch or first-BIOS date, so the BIOS rule can warn
    instead of passing silently;
  - more SA retailers (all 45 SA prices are marketplace offers from one retailer);
  - benchmark coverage: 5 of 15 games, and nothing for the RTX 5060 or 7 CPUs;
  - the Newegg seller selector in the price runner;
  - the North's RAM clearance under a top radiator;
  - a re-price batch before launch;
  - the reseller rule in the validator.
- **Design:** WP-DS2, 46 backlog items (accessibility, motion, the Specs view, copy, 3D brief).
- **QA:** QA-P0-006, an LCP check with applied throttling, at Phase 2 entry.

## 6. Next

1. **QA:** report-phase-0.md, green or not. If it has no blockers, this report becomes final.
2. **Stage 3 of the purge,** the local gc, once QA's workers no longer read old commit IDs.
3. **Ask Hazem** to fix the ruleset check name, then **open the PR** from
   `claude/keen-lamport-0794zj` to `main`. Merging it deploys GitHub Pages.
4. **Phase 1, the engine:** only after Hazem has read this report.
