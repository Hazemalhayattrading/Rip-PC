# Rig Lab test plan

Owner: qa-lead · Version 4.1 · 2026-10-02 · Applies to every phase, from Phase 0 to release.

**What v4 adds (Phase 1, the engine):** the 20 compatibility rule ids agreed with build-lead and how
each is traced (§9); the held-out protocol of at least 20 results, 4 per coverage class (§8.2);
golden tests in each anchor's own source context, and the check on conflicting sources (§8.1); the
known-incompatibility corpus and the sweep (§9.4); the mutation-test check (§9.5); the Phase 1 audit
seed (§7.2); and a brief for every independent check of phase-1-plan §4, in
`docs/qa/phase-1-worker-briefs.md` (§17). The Phase 1 CI wiring is in Appendix C.

This is a working document. Every team follows it. It says how each quality bar in BUILD_PROMPT §8
and each item of the definition of done in §9 is measured, where, how often, by whom, and what
blocks a merge.

- **Numbers live in `tests/perf/budget.json`.** Every threshold below is quoted with its key. If
  this page and `budget.json` disagree, `budget.json` wins and this page has a bug.
- `tests/perf/budget.test.mjs` fails if `budget.json` drifts from the §8 text.
- Changing a gate value needs the Director's approval (Hazem's if it changes scope), recorded in
  §16.

Contents: [1 Ground rules](#1-ground-rules) · [2 Environments](#2-environments) ·
[3 Quality bars at a glance](#3-quality-bars-at-a-glance) · [4 What blocks a merge](#4-what-blocks-a-merge) ·
[5 Viewport and theme matrix](#5-viewport-and-theme-matrix) · [6 Performance](#6-performance) ·
[7 Data audit protocol](#7-data-audit-protocol) · [8 Model tests](#8-model-tests-golden-and-held-out) ·
[9 Compatibility rules](#9-compatibility-rules) · [10 Accessibility](#10-accessibility) ·
[11 Visual regression](#11-visual-regression) · [12 End-to-end flows](#12-end-to-end-flows) ·
[13 Zero console errors](#13-zero-console-errors-and-unhandled-rejections) ·
[14 Defects and severity](#14-defects-and-severity) · [15 Entry and exit criteria](#15-entry-and-exit-criteria-per-phase) ·
[16 Change log](#16-change-log) · [17 Phase 1 independent checks](#17-phase-1-independent-checks) ·
[Appendix A: report template](#appendix-a-report-template) ·
[Appendix B: wave-2 wiring](#appendix-b-wave-2-wiring-wp-q1) ·
[Appendix C: Phase 1 wiring](#appendix-c-phase-1-wiring)

---

## 1. Ground rules

1. **QA verifies. It does not fix other teams' code.** A defect goes to the owning lead with steps
   to reproduce, expected versus actual, and a screenshot or log (§14).
2. **A result is a measurement.** It names the tool and version, the environment, the commit and
   the run count. "Should work" is never a result.
3. **One source of truth for thresholds:** `tests/perf/budget.json`. Every gate there names its
   source, whether BUILD_PROMPT §8, web.dev or a labelled qa-lead proposal.
4. **Proxies are called proxies.** Some bars cannot be measured in CI (§6.1). Those are gated on
   reference hardware, and CI only watches for regressions.
5. **Estimates are checked as estimates.** Tests assert that FPS and render-time figures appear as a
   range with a confidence level and the word "estimated" (CLAUDE.md golden rule 2), and that
   frame generation is never mixed into native numbers (plan §4.7).
6. **Test code obeys the repo's gates.** Everything under `tests/` passes `npm run verify`:
   typecheck, ESLint (typescript-eslint strictTypeChecked for TypeScript), Prettier, unit tests,
   build and e2e smoke.
7. **Politeness and honesty with sources.** One request at a time per host. Never get around bot
   protection: no stealth plugins, no captcha solving, no user-agent games (plan §7).

## 2. Environments

| Id | What it is | Browser | Used for |
|---|---|---|---|
| **C** | This Claude container. 4 vCPUs shared by every team, 15 GB RAM, no GPU. Node 22.22.2, global Playwright 1.56.1. | Chromium 1194 (141.0.7390.37) at `/opt/pw-browsers/chromium`; WebGL on SwiftShader. Never run `playwright install` here. | Development runs, tool proofs, QA verification (WP-Q1, WP-Q2). |
| **CI** | GitHub Actions `ubuntu-24.04`, which is what `ubuntu-latest` resolves to. Image 20260920 ships Google Chrome 153 and Node 22.23.2. Node comes from `.nvmrc` (22.22.2). | Playwright's Chromium 1194, from `npx playwright install --with-deps chromium`. Lighthouse uses the same binary through `CHROME_PATH`, never the preinstalled Chrome 153. | Every push and PR gate, and the nightly run. |
| **CI-docker** | A CI job running inside `mcr.microsoft.com/playwright:v1.56.1-noble` (tag checked in the registry on 2026-09-30). | Chromium 1194. | Visual regression baselines and comparisons (§11). |
| **REF-LAPTOP** | Intel Core Ultra 7 155H laptop running on its Intel Arc iGPU, which needs dual-channel memory. Windows 11, mains power. Provided by Hazem. | Google Chrome stable, hardware acceleration on. | The 60 fps gate, NVDA checks, usability sessions. |
| **REF-DESKTOP** | A desktop with a high-end discrete GPU, named by the Director. | Google Chrome stable. | The 120 fps gate. |
| **PAGES** | `https://hazemalhayattrading.github.io/Rip-PC/`, once Hazem enables Pages and merges to `main`. | Chromium 1194. | Post-deploy smoke: direct loads, 404, real gzip delivery. |

Byte counts are exact anywhere, so C's initial-JS numbers are valid. Timings measured in **C**
(Lighthouse, web vitals, fps) are tool evidence, never gates: its CPUs are shared. One SwiftShader
scene measured 5.3 fps and then 8.5 fps ten minutes apart on 2026-09-30.

## 3. Quality bars at a glance

"Every PR" means every push to a pull request and every push to the integration branch or `main`.
"Test owner" is the QA worker type; "fix owner" is the team whose code fails. Values are v1 of
`budget.json`.

### 3.1 BUILD_PROMPT §8

| # | Bar | How it is tested | Tool | Threshold (`budget.json`) | Env | When | Test owner / fix owner | Blocks merge |
|---|---|---|---|---|---|---|---|---|
| P1 | Initial JS < 250 KB gzip before the 3D chunk | Static graph from every entry HTML: script and preload tags, then the static-import closure from V8's parser, each file gzipped at zlib level 6 (§6.2) | `tests/perf/bundle-budget.mjs` | `bundle.initialJs.maxGzipBytes` 250,000 B, `<`; warning at 95% | CI | Every PR | perf-tester / build-lead | Yes (exit 1 or 2) |
| P2 | The 3D stack only in a lazy chunk (plan WP-B0.2) | three.js signature `__THREE__` in any initial file | `bundle-budget.mjs`; build-lead's smoke also checks the Vite manifest | `bundle.forbiddenInInitialGraph` | CI | Every PR | perf-tester / build-lead | Yes |
| P3 | The 3D scene streams in progressively | From Phase 3: the garage draws its first frame before every part model has loaded; a part's model is fetched only when that part is picked; no model fetch on routes without the garage | Playwright network log and the perf contract (§6.5) | Structural. Time to first 3D frame is tracked | CI | Every PR from Phase 3 | perf-tester / build-lead | Yes |
| P4 | Lighthouse performance ≥ 90 on the landing page | LHCI, 3 runs, median, mobile and desktop presets (§6.3) | `@lhci/cli` 0.15.1 (Lighthouse 12.6.1) | `lighthouse.gates.performanceScore` ≥ 0.90 | CI | Every PR | perf-tester / build-lead | Yes |
| P5 | LCP < 2.5 s | Lighthouse lab (simulated), plus the web-vitals library in Playwright on cold loads at CPU x1 and x4 (§6.4) | LHCI; `tests/perf/web-vitals.spec.ts` | `lighthouse.gates.largestContentfulPaintMs` and `webVitals.gates.lcpMs`: 2500 ms, `<` | CI | Every PR | perf-tester / build-lead, design-lead (fonts, hero) | Yes |
| P6 | CLS < 0.05 | As P5. From Phase 2, also CLS per builder state in e2e | LHCI; web-vitals spec | `lighthouse.gates.cumulativeLayoutShift` and `webVitals.gates.cls`: 0.05, `<` | CI | Every PR | perf-tester / build-lead | Yes |
| P7 | INP < 200 ms | Phases 0–1: TBT as the lab proxy. From Phase 2: scripted interactions measured with web-vitals `onINP` (attribution build) and the Event Timing API, at CPU x1 and x4 (§6.4) | LHCI; web-vitals spec | `lighthouse.gates.totalBlockingTimeMs` 200 ms `<`; `webVitals.gates.inpMs` 200 ms `<`, from Phase 2 | CI | Every PR | perf-tester / build-lead | Yes (TBT now, INP from Phase 2) |
| P8 | 60 fps on the reference laptop and on desktop; 120 fps on a high-end desktop GPU | The absolute gate: scripted camera path on real hardware, frame-rate limit off, median of 3 (§6.5) | `tests/perf/fps-probe.mjs --mode reference` | `fps.targets.referenceLaptop` and `.desktop` ≥ 60 avg fps; `.highEndDesktop` ≥ 120 | REF-LAPTOP, REF-DESKTOP | Phase 3 and Phase 5 exit, and after any change the Director flags as 3D-heavy | perf-tester writes, Hazem runs / build-lead | Blocks the phase exit. CI cannot run it |
| P8p | fps regression proxy | Same path in headless Chromium on SwiftShader. Base and PR measured interleaved in one job (§6.5) | `fps-probe.mjs --mode ci` | `fps.ciProxy.maxRegressionPct` 10%, `fps.ciProxy.blocking` false | CI | Every PR from Phase 3 | perf-tester / build-lead | No, until its noise floor is measured and the Director approves |
| P9 | Zero console errors, zero unhandled rejections | A shared auto fixture on every Playwright test (§13). App console warnings fail too, since WP-Q2 | `tests/e2e/fixtures.ts` (WP-Q1) | `console.*` all 0 | CI | Every PR | e2e-tester / owner of the failing code | Yes |
| P10 | Every compatibility rule has a passing positive and negative test | Unit tests named by rule id and kind, a traceability check against QA's rule list, and the validator tests that stand in for unknown-data tests (§9.3) | Vitest; `tests/audit/compat-trace.mjs` with `tests/audit/compat-rules.json` | `compatibility.minPositiveTestsPerRule`, `.minNegativeTestsPerRule` = 1; unknown data never `ok` | CI | Every PR from WP-E1's first rule (Appendix C) | qa-lead / build-lead, data-lead (validator tests) | Yes |
| P11 | WCAG 2.1 AA for all non-3D UI | axe on every route and state, both themes, all three widths; manual keyboard and screen-reader checks (§10) | `@axe-core/playwright` 4.13.0 | `accessibility.axeTags`, `accessibility.maxViolations` 0 | CI (axe), REF (manual) | Every PR (axe), phase exit (manual) | e2e-tester / build-lead, design-lead | Yes (axe). Manual findings become defects |
| P12 | Full keyboard path through the builder | A keyboard-only Playwright flow through all 12 steps to the Buy Sheet, with focus visible at every stop (§10.2) | Playwright | The path completes with no trap | CI | Every PR from Phase 2 | e2e-tester / build-lead | Yes |
| P13 | Visual regression for every step at 390, 768 and 1440 px, dark and light | `toHaveScreenshot` in the pinned Docker image (§11) | Playwright 1.56.1 in CI-docker | `visual.threshold` 0.2, `visual.maxDiffPixelRatio` 0.001 | CI-docker | Every PR from Phase 2 | visual-tester / owner of the change | Yes, until visual-tester approves the diff |

### 3.2 BUILD_PROMPT §9, definition of done

| # | Item | How it is tested | Tool | Threshold | Env | When | Test owner / fix owner | Blocks |
|---|---|---|---|---|---|---|---|---|
| D1 | A new visitor finishes in under 5 minutes | Moderated usability sessions: first-time participants, think-aloud, timed from the landing page to a copied Buy Sheet link. The e2e happy path proves the journey exists | Stopwatch, screen recording; Playwright | `definitionOfDone.firstVisitMaxMinutes` 5 with `usabilityParticipants` 5. Approved rule (Director, 2026-09-30): at least `minFinishingUnaided` 4 of 5 finish unaided in under 5 minutes, and the median is under `maxMedianMinutes` 5 | REF-LAPTOP, a phone | Pilot at Phase 2 exit; gate at Phase 5 exit | qa-lead runs, Hazem recruits / design-lead, build-lead | Release |
| D2 | Pick a use case and budget | e2e: each of the 8 presets pre-fills a build the visitor can change; the budget changes the lists | Playwright | Pass | CI | Every PR from Phase 2 | e2e-tester / build-lead | Yes |
| D3 | Build a full PC with looks | e2e happy path per preset. A look option appears only when the product supports it | Playwright | Pass | CI | Every PR from Phase 2 | e2e-tester / build-lead | Yes |
| D4 | See it assembled in 3D | e2e: after each pick the scene reports that part as placed (perf contract `info()` or a DOM mirror); a SwiftShader screenshot with tolerance | Playwright | Pass | CI | Every PR from Phase 3 | e2e-tester / build-lead | Yes |
| D5 | Sourced FPS and creator estimates, and a bottleneck verdict | e2e: ranges plus confidence plus "estimated"; frame generation shown apart; a verdict present. Model golden and held-out tests (§8) | Playwright, Vitest | `models.goldenTolerancePct` 5; at least `models.heldOutCount` 20 held-out results, `heldOutPerClassMin` 4 per class, each within `heldOutMaxErrorPct` 10 | CI, phase exit | Every PR from Phase 4 | e2e-tester, data-auditor / build-lead | Yes |
| D6 | Switch SAR/USD | e2e: every price switches; each value equals the stored observation for that market and is never converted; a missing market shows the gap message with its date; "Price as of <date>" on every price | Playwright | A converted price is a Blocker | CI | Every PR from Phase 2 | e2e-tester / build-lead | Yes |
| D7 | Leave with a shareable Buy Sheet | e2e: the share URL opened in a fresh context rebuilds the same build; URLs from every earlier codec version still decode (fixtures); print media emulation screenshot | Playwright | Pass | CI | Every PR from Phase 4 | e2e-tester / build-lead | Yes |
| D8 | Every number on screen links to its source | Provenance check: every number rendered from data sits inside an element that carries its source ids (UI contract in §12.2). The data validator already rejects uncovered values | Playwright; data-lead's validator | 0 unsourced numbers | CI | Every PR from Phase 2 | e2e-tester / build-lead, data-lead | Yes |
| D9 | QA report is green | qa-lead writes `docs/qa/report-phase-N.md` from the template (Appendix A), with every measurement re-run on the integration commit it names | The report, and every tool behind its numbers | 0 open Blockers; every Major fixed or deferred in writing by the Director; the phase's exit criteria (§15) met | Every environment the report names | Each phase exit | qa-lead | The phase |
| D10 | Director signs off | The Director reviews the last phase report and the release, then signs `docs/reports/release-v1.md` | `docs/reports/release-v1.md` | A green `docs/qa/report-phase-5.md` | n/a: a sign-off, not a measurement | Release | Director | The release |

### 3.3 Data rules that QA enforces

| # | Rule | How | When | Blocks |
|---|---|---|---|---|
| X1 | Every number has a source (CLAUDE.md golden rule 1, plan §4.3) | data-lead's validator runs in `npm run test`; QA re-checks the 10% sample by hand (§7) | Every PR (validator); every data batch and phase exit (audit) | Yes |
| X2 | Owner's rule 1: prices live only; archived specs and archived published reviews allowed | QA checks every price and benchmark row (§7.5) | Every data batch; Phase 0 exit (WP-Q2) | Yes |
| X3 | No invented products, specs from the manufacturer | The seeded 10% audit (§7) | Every data batch; phase exit | Yes |

## 4. What blocks a merge

- **Required checks.**
  - build-lead's `npm run verify` job, which covers typecheck, lint, unit tests with coverage,
    build and e2e smoke.
    - Since WP-Q1 the unit tests include the harness self-tests (`tests/harness/`).
    - The e2e smoke carries the shared console fixture (P9) on every test, and axe on every route
      at 390, 768 and 1440 px (P11).
  - The `Performance budgets` job from WP-Q1 (Appendix B), which covers P1, P2, P4–P7. It runs
    after `verify` on every push and PR, and fails on any miss.
  - Phase 1 adds, inside `verify` (Appendix C): the Vitest JSON report, compatibility traceability
    (P10, from WP-E1's first rule) and the golden-count check (§8.1, from WP-E3 for game anchors
    and WP-E4 for creator anchors). Phase 2 adds the keyboard path (P12), visual regression (P13)
    and INP (P7).
  - Hazem makes these required status checks on `main` in GitHub branch settings.
- **Reported, not blocking.**
  - The fps proxy (P8p).
  - The 95% bundle warning.
  - Lazy chunk sizes.
  - Lighthouse categories other than performance.
- **Nightly (scheduled, from Phase 2).**
  - The full viewport and theme matrix.
  - Lighthouse on every route (tracked).
  - fps proxy noise-floor runs.
  - A source-URL availability check. It is polite and never evades bot protection. A broken
    source is a Major for data-lead.
- **Phase exit.**
  - The manual gates: P8, screen-reader checks, D1.
  - The data audit and the rule-1 compliance check.
  - Held-out model tests.
  - The QA report.
- **Waivers.** Only the Director can waive a gate, and Hazem when it changes scope. A waiver is
  written into the phase report with an owner and a date.
- **Phase 0 today.** WP-Q1 put both jobs in `.github/workflows/ci.yml` (Appendix B). They
  block a merge once Hazem makes them required status checks on `main` (B.5).

## 5. Viewport and theme matrix

- **Viewports** come from `visual.viewports`:
  - 390×844, with `isMobile` and touch;
  - 768×1024, with touch;
  - 1440×900.
- **Device scale factor** is 1.
- **Themes** are dark (the default) and light. The app ignores `prefers-color-scheme` on
  purpose (`src/state/theme.ts`): every first visit is dark, and light is the visitor's stored
  choice (`localStorage` `rig-lab-theme`), which the inline script in `index.html` restores
  before the first paint. The theme is never part of a share link.
- **As built (WP-Q2, 2026-10-01).**
  - `playwright.config.ts` makes one e2e project per width and theme, from `visual.viewports`
    and `visual.themes`: `e2e-390-dark`, `e2e-390-light`, … `e2e-1440-light` (tests/e2e). Then
    `perf` (tests/perf), and `visual-390`, `visual-768`, `visual-1440` (tests/visual, one theme
    until the baselines exist in Phase 2).
  - A dark project starts with nothing stored. A light project starts with the stored choice,
    through `storageState`, so the real restore script runs. The axe spec checks that each page
    shows its project's theme (`data-theme`) before it runs, so a light run cannot silently test
    dark.
  - The PR column below is enforced by each project's `grep`. Dark at 768 runs only `@a11y` (and,
    from Phase 2, `@keyboard`); light runs only `@a11y`. `E2E_FULL_MATRIX=1` runs everything in
    every cell, for the nightly job from Phase 2.
  - Cost, measured on the home PC with 2 workers: the three light projects add 54 axe tests and
    about 19 s to `npm run verify`.

| Suite | 390 dark | 390 light | 768 dark | 768 light | 1440 dark | 1440 light |
|---|---|---|---|---|---|---|
| Smoke (routes, 404, `?b=`) | PR | nightly | nightly | nightly | PR | nightly |
| Builder flows (§12.2) | PR | nightly | nightly | nightly | PR | nightly |
| Keyboard-only path (§10.2) | — | — | PR | — | PR | — |
| axe on every route and state (§10.1) | PR | PR | PR | PR | PR | PR |
| Visual regression (§11) | PR | PR | PR | PR | PR | PR |
| Reduced motion (§10.3) | — | PR | — | — | PR | — |
| Web vitals, CPU x1 and x4 (§6.4) | PR | — | — | — | PR | — |
| Lighthouse (§6.3) | mobile preset (emulates 412×823) | — | — | — | desktop preset (1350×940) | — |
| fps (§6.5) | — | — | — | — | CI proxy | — |

- Contrast depends on the theme and layout on the width, so axe and visual regression run in all
  six cells.
- The keyboard path runs at 768 and 1440, where people use keyboards; on phones touch is the path.
- Reference fps runs use the machine's own maximised window and device pixel ratio, because that
  is what a visitor sees.

## 6. Performance

### 6.1 What CI can and cannot measure

| Bar | CI measures | CI cannot measure | Where the real gate is |
|---|---|---|---|
| Initial JS gzip | Exactly, from the build output | The server's own gzip: GitHub Pages served 0.0% to 0.7% above zlib level 6 in our check | CI (exact), with a 95% warning |
| Lighthouse score, LCP, CLS, TBT | Lab values: simulated throttling on headless Chromium 1194 | Real devices, real networks, the field 75th percentile. Two known blind spots, below | CI lab. §8 names Lighthouse itself |
| INP | TBT as a proxy now; scripted INP in the lab from Phase 2 | Real visitors' interactions. There is no field data (RUM) by design | CI lab, labelled a proxy |
| 60 and 120 fps | A relative signal only. Headless Chromium caps `requestAnimationFrame` at 60 Hz, even with `--disable-frame-rate-limit`. SwiftShader renders on the CPU | Any absolute fps, or GPU behaviour | REF-LAPTOP and REF-DESKTOP, with the manual protocol |
| CPU throttling x4 | Main-thread slowdown in the renderer process | The GPU, heat, and an iGPU's shared memory bandwidth | REF-LAPTOP |

**Known blind spots of the LCP gates** (QA-P0-006, found in WP-Q2 on 2026-10-01; deferred in
writing by the Director to Phase 2 entry, owner qa-lead):

- **A low-priority LCP image.** Lighthouse 12.6.1's simulation leaves a Low-priority image
  request out of LCP, and an image a script inserts starts at Low priority. On a test page with
  a 720 KB script-inserted image, Lighthouse named the image as the LCP element yet reported LCP
  equal to FCP (1350 ms, "Load Time 0") and passed. With `fetchPriority = 'high'` the same page
  gave 4953 ms and failed. The web-vitals spec loads with no network throttling, so it cannot see
  this either.
- **Bandwidth contention.** build-lead measured the font preload during WP-B1 with Lighthouse's
  applied (devtools) throttling: median LCP 2117 ms with the preload, 1775 ms without. The
  simulated runs gave 1657 and 1654 ms. Simulation hides a request that competes for bandwidth
  with the one that renders the LCP element.
- Phase 0's landing page has no image, so neither changes a Phase 0 result. At Phase 2 entry,
  once part images exist, QA proposes one of these and the Director decides, because each changes
  what the gate measures: a network-throttled web-vitals run at 390 px, applied (devtools)
  throttling for one Lighthouse run, or asserting `prioritize-lcp-image`.

### 6.2 Initial JS budget

**Tool:** `node tests/perf/bundle-budget.mjs [--dist dist] [--all-html] [--json <file>]`. It has
zero dependencies; the source is `tests/perf/bundle-budget.mjs` and
`tests/perf/lib/static-imports.mjs`.

**Method** (`budget.json` → `bundle`):

1. For each entry HTML, it finds every JS resource the browser fetches at load:
   - `<script type="module" src>`;
   - classic `<script src>` without `nomodule`;
   - inline `<script>` bodies;
   - `<link rel="modulepreload">`;
   - `<link rel="preload" as="script">`.

   Commented-out tags, JSON-LD and `nomodule` scripts are ignored; `nomodule` scripts get a
   warning.
2. It follows static imports (`import … from`, `import "…"`, `export … from`) through every chunk,
   using V8's own module parser (`node:vm` `SourceTextModule`, in a child process). Strings,
   template literals, regular expressions, comments, `__vite__mapDeps` lists and dynamic
   `import()` can never be counted.
   - This matters because Vite 8 (Rolldown) writes dynamic imports as template literals, which a
     regex would miss.
3. It gzips each initial file on its own, at zlib level 6, and sums the sizes. 1 KB is 1000 B. The
   gate is strict: `total < 250,000 B`.
4. Every other emitted JS file is lazy. It is reported with its own gzip size and its on-demand
   cost (itself plus its static imports that are not already initial), and flagged if it contains
   three.js.
5. A forbidden module in the initial graph fails the check, even under budget. The only one today
   is three.js, signature `__THREE__`, which also covers R3F, drei and postprocessing because they
   all import three.
6. CSS is reported separately: the linked stylesheet is initial, the rest is lazy. §8 sets no CSS
   budget.
7. Dot-paths such as `dist/.vite/manifest.json` are skipped. Pages does not publish them, and the
   manifest names every chunk.

**Exit codes.** 0 means within budget. 1 means a budget miss: over budget, or a forbidden module
in the initial graph. 2 means the checker cannot measure. That covers:

- a missing dist, file or chunk;
- a bare import;
- an external script;
- a chunk that does not parse;
- an import map;
- a URL outside base `/Rip-PC/`, which catches a build made with the wrong Vite `base`.

**Why zlib level 6.** Measured on 2026-09-30:

- GitHub Pages served `pages.github.com/js/application.js` at exactly the level-6 size (2158 B);
  jquery.js and pages.css came in 0.57% and 0.68% above level 6.
- Vite 8.3.1's own build reporter prints about 1.1% above level 6.
- Level 9 would under-report what users download.

**Measured on the accepted scaffold** (integration branch `e2a1090` merged into
`feat/qa-foundations`, `npm run build`):

- Initial JS for `/` is `assets/index-lzMDlB1n.js`: 77,404 B (77.40 KB, 75.59 KiB). That is 31.0%
  of the budget, with 172.60 KB of headroom.
- The lazy 3D chunk `assets/Garage-B-Fp9Uje.js` is 243,453 B and contains three.js.
- All 18 HTML files (17 routes plus `404.html`) load the same initial graph.
- The Director's 75.4 KiB matches `gzip -9` output for the same file (77,213 B). The 191 B
  difference (0.25%) is gzip level 9 against level 6.

**Tests.** `tests/perf/bundle-budget.test.mjs` has 32 tests on hand-made Vite-shaped fixtures in
`tests/perf/fixtures/dist-*`. They cover:

- decoys in strings, regexes and comments;
- a chunk cycle;
- inline modules;
- uppercase and unquoted tags;
- the error cases;
- the exact-boundary comparison;
- level 6 against level 9.

Four injected bugs were each caught: counting dynamic imports, gzip level 9, an inclusive
comparison, and dropping modulepreload.

**Limit.** A route-level lazy chunk that a route needs at once is not "initial" in the static
graph. From Phase 2, a Playwright check sums the JS each route actually downloads before the 3D
chunk is requested, and applies the same 250,000 B gate.

### 6.3 Lighthouse CI

- **Config files.**
  - `lighthouserc.cjs` is mobile, Lighthouse's default: simulated slow 4G and 4x CPU slowdown.
  - `lighthouserc.desktop.cjs` uses the desktop preset.
  - Both are built by `tests/perf/lhci-config.cjs` from `budget.json` → `lighthouse`, and
    `tests/perf/lhci-config.test.mjs` pins that.
- **Collection.**
  - It starts `npm run preview -- --host 127.0.0.1 --port <port> --strictPort`, which is the
    production build under `/Rip-PC/`. build-lead's preview answers like GitHub Pages: a real file
    per route, and 404 for the rest.
  - It audits `http://127.0.0.1:<port>/Rip-PC/` 3 times per preset.
  - The port is derived from the checkout's path, in 30000–39999, as `playwright.config.ts` does
    for its own preview in 20000–29999. Several worktrees on one machine can then run Lighthouse
    at once. A fixed 4173 made two teams' runs collide on the home PC (2026-10-01).
    `LHCI_PORT` overrides it. A derived port can still meet another program: on the home PC,
    Steam listens on 27036, inside Playwright's range. A checkout whose path hashed to it would
    fail with "port in use" every time, so set `E2E_PORT` (build-lead's note, 2026-10-01).
- **Assertions,** each at `error` level with `aggregationMethod: 'median'`:
  - `categories:performance` minScore 0.90;
  - `largest-contentful-paint` < 2500 ms;
  - `cumulative-layout-shift` < 0.05;
  - `total-blocking-time` < 200 ms.

  LHCI's default aggregation is `optimistic`, the best run, so median is set explicitly. §8's
  "<" is strict, while LHCI's `maxNumericValue` is inclusive, so the ceiling sits a relative 1e-9
  below the number (2499.9999975 ms for LCP).
- **Chrome.**
  - In the cloud container: `CHROME_PATH=/opt/pw-browsers/chromium`.
  - On the home PC, with no `CHROME_PATH`: LHCI finds installed Google Chrome (151 on
    2026-10-01). Set `CHROME_PATH` to Playwright's Chromium to match CI.
  - In CI: `CHROME_PATH` is set to `require('@playwright/test').chromium.executablePath()` after
    `npx playwright install --with-deps chromium`, so CI and the container use the same Chromium
    1194, not the runner's Chrome 153.
  - `--no-sandbox` is passed, because the Chrome sandbox fails as root and under Ubuntu 24.04's
    AppArmor rules.
- **Output.** Reports go to `artifacts/lhci/<preset>/` (git-ignored), which CI uploads as an
  artifact. LHCI's working folder `.lighthouseci/` is git-ignored.
- **Proof** (`npx @lhci/cli@0.15.1`, Lighthouse 12.6.1, HeadlessChrome 141), all medians of 3:

  | Page | Preset | Exit | Performance | LCP | CLS | TBT |
  |---|---|---|---|---|---|---|
  | Trivial static page under `/Rip-PC/` | mobile | 0 | 1.00 | 757 ms | 0 | 0 ms |
  | Trivial static page | desktop | 0 | 1.00 | 206 ms | 0 | 0 ms |
  | Negative control: long tasks, late LCP, a layout shift | mobile | 1 | 0.37 ✘ | 3422 ms ✘ | 0.389 ✘ | 1746 ms ✘ |
  | Negative control | desktop | 1 | 0.78 ✘ | 866 ms | 0.094 ✘ | 399 ms ✘ |
  | **Accepted scaffold, `/`, real preview** | mobile | 0 | 1.00 | 1396 ms | 0 | 0 ms |
  | **Accepted scaffold, `/`, real preview** | desktop | 0 | 1.00 | 339 ms | 0 | 0 ms |

  The first negative-control run did not trip TBT, correctly: TBT only counts long tasks between
  FCP and TTI, and the control's first long task ran before first paint. A long task after first
  paint was added, and all four gates tripped.
- **WP-Q1 runs** (`npm run perf:lhci` and `perf:lhci:desktop`, the CI job's own steps, on the
  WP-Q1 branch build), medians of 3:

  | Build | Preset | Exit | Performance | LCP | CLS | TBT |
  |---|---|---|---|---|---|---|
  | WP-Q1 branch | mobile | 0 | 1.00 | 1399 ms | 0 | 0 ms |
  | WP-Q1 branch | desktop | 0 | 1.00 | 342 ms | 0 | 0 ms |
  | Mutation M4: an 800 ms long task, then a late 300 px banner | mobile | 1 | 0.70 ✘ | 1358 ms | **0** | 3152 ms ✘ |
  | Mutation M4 | desktop | 1 | 0.67 ✘ | 327 ms | 0.159 ✘ | 746 ms ✘ |

- **Finding: Lighthouse's default mobile run can miss a late layout shift** (WP-Q1, 2026-09-30).
  - On mutation M4, mobile Lighthouse reported CLS 0 and listed no layout shift at all.
  - The browser's own Layout Instability API measured 0.307 for the same page at 412 × 823.
  - The same Lighthouse 12.6.1 reported 0.3071 with `--throttling-method=devtools`, and 0.4107
    with screen emulation off. The miss needs both simulated throttling and mobile screen
    emulation.
  - The cause is not proven. It fits the Chromium 1194 behaviour in §6.4, where shifts under
    mobile emulation are flagged as recent input.
  - So Lighthouse's CLS assertion is not the only CLS gate at the phone width: web vitals also
    measures at 390 px (§6.4).
  - M4 still failed the job on:
    - mobile performance and TBT;
    - desktop performance, CLS and TBT;
    - web-vitals CLS at 390 and 1440 px.
- **Routes.** §8 gates the landing page. From Phase 2, `/build/cpu` (the densest list) and
  `/results` are audited nightly as tracking.

### 6.4 Web vitals in Playwright

**Spec:** `tests/perf/web-vitals.spec.ts`. It runs in a Playwright `perf` project against the
production preview (Appendix B); the dev server is refused.

**LCP and CLS, now:**

- The web-vitals attribution IIFE build is injected before any page script. Playwright evaluates
  init scripts in a function scope, so the library is reached as `webVitals`, not
  `self.webVitals` (found and fixed on 2026-09-30).
- Each sample is a cold load in a fresh browser context, at each width in
  `webVitals.viewports`: 390×844 (mobile, touch) and 1440×900, sized from `visual.viewports`.
  WP-Q1 added 390 after the Lighthouse finding in §6.3.
- CPU throttling uses the DevTools Protocol `Emulation.setCPUThrottlingRate`, at each rate in
  `webVitals.cpuThrottleRates` (x1, x4).
- After `load`, network idle and `webVitals.settleMs` (1.5 s), and never before
  `webVitals.minObserveMs` (5 s) of page time, the page is set to hidden. That is when
  web-vitals reports final values, as when a visitor leaves. Without it, a page with no layout
  shift reports no CLS at all. Each sample records when it was hidden (`hiddenAtMs`).
- **Why the 5 s floor** (WP-Q2, 2026-10-01). Without it a fast page was hidden about 2 s after
  navigation start, so the LCP gate could not fail for anything that painted later:
  - NC-V2b, an LCP element added at 2.7 s, measured LCP 48 ms and passed. With the floor:
    2740–2944 ms, fail.
  - NC-V3, a 300 px banner at 3 s, measured CLS 0 and passed. With the floor: 0.2608 at 390 px
    and 0.1393 at 1440 px, fail.
  - CPU x4 also delays the page's timers: a 1.5 s timer fired at about 2.04 s, right when the
    page was hidden, so even NC-V2a (LCP at 1.5 s) was missed at x4.
  - 5 s covers the 2.5 s LCP gate twice over and a whole CLS session window. Later content is
    still unseen: a lab run has to stop somewhere. It costs about 35 s per `perf:vitals` run.
- **CLS counts every shift.** The gated CLS is the larger of two values:
  - web-vitals' own CLS;
  - CLS over every raw layout-shift entry, grouped into the same session windows (a 1 s gap or
    5 s at most).

  web-vitals leaves out shifts flagged `hadRecentInput`. These loads have no input, yet
  Chromium 1194 under mobile emulation flags real shifts that way (measured 2026-09-30 on
  mutation M4, with and without our fixture):
  - always, while a Playwright trace records DOM snapshots;
  - sometimes, at CPU x4, with no tracing at all.

  Such shifts would read CLS 0 at 390 px. Each sample records both values and the count of
  flagged shifts, and an annotation names any route and rate where they differed. The `perf`
  project records no trace, and mobile e2e projects keep traces without DOM snapshots
  (`playwright.config.ts`).
- The median of `webVitals.runs` (3) is compared with `webVitals.gates`, and soft assertions
  report every failing route, width and rate.
- The attached JSON records each sample, the LCP element and the largest shift target.
- Proof, medians of 3:

  | Site | CPU x1 | CPU x4 | Result |
  |---|---|---|---|
  | Trivial page | LCP 32 ms, CLS 0 | LCP 68 ms, CLS 0 | pass, in both CommonJS and ESM packages |
  | Negative control (fixed CPU work, then a late banner) | LCP 740 ms, CLS 0.0774 ✘ | LCP 3152 ms ✘, CLS 0.0774 ✘ | fail |
  | **Accepted scaffold, `/`** | LCP 92 ms, CLS 0 | LCP 316 ms, CLS 0 | pass. LCP element `#main>p` |
  | **WP-Q1 branch, `/`, 390 px** | LCP 124 ms, CLS 0 | LCP 340 ms, CLS 0 | pass. LCP element `#root>footer>p` |
  | **WP-Q1 branch, `/`, 1440 px** | LCP 136 ms, CLS 0 | LCP 300 ms, CLS 0 | pass. LCP element `#main>p` |
  | Mutation M4, 390 px | CLS 0.2914 ✘ | CLS 0.2914 ✘ (web-vitals alone: 0) | fail |
  | Mutation M4, 1440 px | CLS 0.1562 ✘ | CLS 0.1562 ✘ | fail |

  The negative control shows why x4 exists: LCP passes at x1 and fails at x4.

**INP, from Phase 2** (`webVitals.gates.inpMs`, 200 ms):

- **Script.** A fixed list of trusted Playwright interactions on the builder, each followed by the
  next paint:
  - pick a use case;
  - move the budget slider with the keyboard;
  - toggle a filter;
  - change the sort;
  - pick a part;
  - open and close compare;
  - toggle SAR/USD;
  - switch theme;
  - change a look option with the 3D view present.
- **Two measurements.**
  - web-vitals `onINP` from the attribution build with `reportAllChanges`, which gives the INP
    value and its attribution (target, input delay, processing, presentation delay, long
    animation frames).
  - A raw `PerformanceObserver` for `event` entries with `durationThreshold: 16`, so every
    interaction's duration is logged, not only the worst.
- **Pass rules.** INP < 200 ms at CPU x1 and at x4 blocks (`webVitals.gates.inpMs`
  `gatedAtCpuThrottleRates`). Any single interaction at 200 ms or more is still a Major defect
  even when INP passes (§14).
- **Spread at x4** (approved by the Director, 2026-09-30). The x4 runs can disagree on a busy
  runner. When they spread by more than `webVitals.gates.inpMs.maxRunSpreadPct` (15%), measured
  as (max − min) / median, the x4 result is INCONCLUSIVE, not FAIL, and is re-run.

### 6.5 3D frame rate: CI proxy and the reference-hardware gate

**Scene contract** (build-lead's 3d-engineer, Phase 3; spelled out in `tests/perf/fps-meter.js`).
When the URL has `perf=1`, the garage exposes `window.__RIG_LAB_PERF__`:

```js
{
  version: 1,
  ready,            // Promise: every part of the build loaded, first frame drawn
  runCameraPath(),  // plays the fixed camera path and resolves at its end
  info(),           // { drawCalls, triangles, textures, geometries, dpr, canvasWidth, canvasHeight }
}
```

- The camera path is **time-based**: the pose is a function of elapsed time. A slow machine draws
  fewer frames over the same path, never a longer path.
- It also exposes `window.__RIG_LAB_BUILD__ = { sha, builtAt }`.
- The reference build codes are fixed in `tests/perf/fps-scenarios.json` (Phase 3). The first is
  the heaviest realistic build: full ATX, glass panel, RGB on, every fan.

**Metrics** (`budget.json` → `fps`), from `requestAnimationFrame` timestamps:

- avg fps = (frames − 1) / elapsed.
- 1% low = 1000 / p99 frame interval, nearest rank.
- min fps = 1000 / max interval.
- p50, p95 and p99 frame time.
- The share of frames over 25 ms, which is 1.5 × a 60 Hz interval, i.e. frames that missed a 60 Hz
  deadline. A 16.7 ms threshold would count ordinary vsync jitter; a unit test proves that.
- Idle calibration first, then 1 warm-up pass, then 3 measured passes, reporting the median.

**Verdicts** (`verdictFor` in `tests/perf/fps-probe.mjs`; `tests/perf/fps.test.mjs` has 17 tests
covering it, the meter's statistics and the file naming):

- **INVALID** in reference mode when:
  - the browser is headless, whatever its renderer: headless frames never reach a screen;
  - the WebGL renderer is software (SwiftShader, llvmpipe, Microsoft Basic Render); or
  - it is not the target's `expectRenderer`. That is "Arc" for the laptop, which catches a hybrid
    laptop running on its discrete GPU.
- **INCONCLUSIVE** when:
  - the runs disagree by more than `fps.maxRunSpreadPct` (15%); or
  - the average is below target but the idle rate shows the browser was capped below 1.05 × the
    target.

  A cap can only lower the average, so a capped run proves a pass but never a miss.
- **PASS** when the median avg ≥ target.
- **FAIL** otherwise.
- **PROXY** in CI mode, which is never a §8 pass.

Exit codes: 0 PASS or PROXY · 1 FAIL · 2 INVALID, INCONCLUSIVE or error.

**Measured facts behind these rules** (Chromium 1194 in C, 2026-09-30):

- Headless `requestAnimationFrame` stays at 60 Hz with or without `--disable-gpu-vsync
  --disable-frame-rate-limit`, in both headless modes. So the uncap flags are for headed
  reference runs only.
- **That holds on SwiftShader only.** On the home PC (2026-10-01; Windows 11, RTX 5080), headless
  Chrome 151 with the uncap flags rendered on the GPU and gave 6967 fps on the fixture scene, and
  the probe called it a PASS of the 120 fps target. The renderer check cannot catch that, so a
  headless reference run is now always INVALID (`fps.test.mjs` pins it).
- With the uncap flags on SwiftShader, rAF ran ahead of the GPU queue: one scene gave 379, then
  3.8, then 2.2 fps. CI mode drops the flags, and the spread rule catches this kind of run
  anywhere.
- CPU x4 moved SwiftShader fps only from 8.47 to 7.41. Throttling slows the renderer's main thread,
  while SwiftShader rasterises in the GPU process. So the x4 run isolates main-thread cost (React,
  scene graph, JS), which is what it should do.
- The container's CPU is shared, so the same scene gave 5.3 and 8.5 fps in two invocations.

**CI proxy method** (P8p):

- Build the base commit and the PR, then measure A, B, A, B, A, B in one job on one runner.
- Compare the medians. Never compare with a stored baseline from another run.
- Before the proxy may block, run one build 10 times to measure its coefficient of variation. The
  threshold becomes max(`maxRegressionPct`, 3 × CV), and the Director approves it.
- The probe's `--baseline` option compares with an earlier JSON, for local investigation only.

**Manual protocol, reference laptop (the absolute gate for 60 fps):**

1. **Once per machine.**
   - Install Node.js 22 LTS and Git.
   - `git clone https://github.com/Hazemalhayattrading/Rip-PC && cd Rip-PC && npm ci`. No Playwright
     browser download is needed: reference mode drives the installed Google Chrome.
   - In Chrome, open `chrome://gpu` and confirm "WebGL: Hardware accelerated" with an Arc
     `GL_RENDERER`.
   - Install the current Intel graphics driver and note its version.
2. **Before each session.**
   - Mains power, battery at 80% or more, Windows power mode "Best performance".
   - Close every other app. Pause Windows Update for the session.
   - Internal display only, at its native resolution and scaling; external monitors change GPU
     routing.
   - Leave the machine idle for 2 minutes after boot.
3. **Run:**

   ```sh
   node tests/perf/fps-probe.mjs --mode reference --target referenceLaptop \
     --device "<brand model>, Core Ultra 7 155H, <RAM size and channels>" \
     --notes "Intel driver <version>; Best performance; <display resolution> @ <Hz>; mains power" \
     --url "https://hazemalhayattrading.github.io/Rip-PC/build/looks?b=<reference build>&perf=1"
   ```

   Chrome opens maximised with `--disable-gpu-vsync --disable-frame-rate-limit`. The probe runs the
   calibration, 1 warm-up and 3 measured passes. Do not touch the machine while it runs.
4. **Sustained check.** Wait 5 minutes and run it again. If the second median is more than 10%
   below the first, the laptop throttles under heat. The gate uses the lower of the two medians.
5. **Record.**
   - The probe prints a summary and writes
     `docs/qa/perf-runs/<YYYY-MM-DDTHHMMZ>-referenceLaptop-<device>.json`. The UTC minute in the
     name keeps the two runs apart.
   - Send both JSON files to qa-lead, who checks renderer, flags and spread and commits them
     (`docs/qa/perf-runs/README.md`).
   - Only a **PASS** closes the gate. INVALID and INCONCLUSIVE are re-run with the reason fixed.

**High-end desktop (120 fps):** the same steps with `--target highEndDesktop` on REF-DESKTOP. The
idle calibration must exceed 126 fps (1.05 × 120) for a miss to count. A 60 Hz monitor is fine,
because the frame-rate limit is off.

**Fallback without Node.** Start Chrome from a command line with
`--user-data-dir=%TEMP%\riglab-perf --disable-gpu-vsync --disable-frame-rate-limit` and open the
same URL. In the DevTools console, paste `tests/perf/fps-meter.js` and run:

```js
const r = await __rigLabFpsMeter.run(); copy(JSON.stringify(r))
```

Save the result with the device notes. DevTools costs a little performance, and the renderer must
be checked by hand at `chrome://gpu`. Such runs are labelled "manual" and count only when the probe
cannot be run.

**Tool proof in C** (`tests/perf/fixtures/fps-scene`, raw WebGL2 cubes):

| Case | Median avg fps | Verdict |
|---|---|---|
| CI mode, CPU x1 | 8.47, from runs of 8.79 / 8.47 / 8.28 | PROXY |
| CI mode, CPU x4 | runs 7.41 / 7.53 / 6.19 | INCONCLUSIVE (18% spread on a busy machine) |
| Heavier scene against that baseline | 1.36 | PROXY, with an 83.9% regression flagged as non-blocking |
| Reference mode in C | — | INVALID (SwiftShader), exit 2 |

Reference mode without `--device` or `--notes`, and a page without the contract, both exit 2 with
a message.

### 6.6 CPU throttling and medians

- Every automated performance number is a median:
  - Lighthouse: 3 runs, per metric;
  - web vitals: 3 cold loads per route and rate;
  - fps: 3 passes after 1 warm-up.
- A single run is never a result.
- CPU x4 approximates a slower machine's main thread. It does not approximate the GPU, heat, or an
  iGPU's memory bandwidth, which is why P8 needs REF-LAPTOP.

## 7. Data audit protocol

### 7.1 What, when, who

- **Who.** The data-auditor, independent of data-lead's own 20% check. It uses a different seed
  and may overlap.
- **Scope.**
  - Specs: every spec category.
  - Game and creator benchmarks.
  - Prices for SA and US, and price gap records.
  - The games list and its player-count sources.
- **When.**
  - Every data batch data-lead hands to the Director.
  - Every phase exit.
  - Phase 0 exit (WP-Q2).
- **Two checks:**
  - a **seeded 10% sample**, compared field by field (§7.2 to §7.4);
  - an **Owner's-rule-1 compliance check of every price and benchmark row**, which is 100%, not a
    sample (§7.5).

### 7.2 The seeded sample

- **Tool:** `node tests/audit/sample.mjs --seed <seed> (--manifest <strata.json> | --data-dir <folder>) --json <out>`.
- **Seed format** (`dataAudit.seedFormat`): `rig-lab-audit:<phase>:<full 40-hex SHA of the
  integration-branch commit being audited>`, for example `rig-lab-audit:phase-0:4319c8cc…`.
  - The commit is fixed before sampling, so the auditor cannot pick a convenient seed.
  - The tool rejects any other seed format.
  - A seed names only a post-purge commit (`git log` of the current history), never a pre-purge
    ID (QA-P0-041).
- **The Phase 1 seed** (phase-1-plan §4, wave 4): `rig-lab-audit:phase-1:<sha>`.
  - `<sha>` is the integration-branch commit the Director names for the wave 4 audit. It comes
    after the engine freeze and holds every accepted WP-D1 and WP-D2 batch, so the sample covers
    the data the frozen model ran on.
  - qa-lead writes the seed into `docs/qa/WIP-STATUS.md` and commits it before the first sample is
    drawn.
  - Every data file at that commit is a stratum. `strata.mjs` refuses a file it doesn't know, so
    each new WP-D1 or WP-D2 file (`data/compat-fixtures.json`, the power constants registry) is
    added to it in the same QA change that first audits it.
  - Benchmark rows are also re-read at 100% by the per-source workers (§17). The 10% sample still
    draws from their strata, so the report's totals cover every category.
- **Algorithm** `sha256-rank-v1` (`dataAudit.algorithm`):
  - rank = lowercase hex SHA-256 of `seed + "\n" + stratum + "\n" + id`.
  - Sort each stratum by rank and take the first k = max(1, ceil(0.10 × population)), or
    everything when the stratum is smaller (`dataAudit.sampleFraction`, `.minPerStratum`).
  - Input order does not matter.
  - Adding records never changes an existing record's rank.
  - Anyone can reproduce it:

    ```sh
    printf '%s\n%s\n%s' "<seed>" "<stratum>" "<id>" | sha256sum
    ```

    The unit tests pin two golden vectors computed that way.
- **Strata.** One per data file, since there is one category per file (plan §4.1):
  - CPU, motherboard, RAM, GPU chip, GPU card, storage, PSU, cooler, case, case fan;
  - game benchmark and creator benchmark;
  - price per market (`data/prices/sa.json`, `data/prices/us.json`, including their gap records);
  - games.

  A record without an `id`, such as a price row, is identified as
  `<partId>--<retailer>--<retrievedAt>`, the same key as its capture file name. A gap record is
  `gap--<partId>`.
- **Manifest builder:** `node tests/audit/strata.mjs --data-dir data --out <strata.json>`, then
  `sample.mjs --manifest <strata.json>`. Each stratum is named by its file's path under `data/`
  (`parts/cpu`, `benchmarks/game`, `prices/sa`, `games`, …), and the name is part of the rank.
  - `publishers.json` is the source registry, not a record set, so it is not sampled. Titles in
    `games.json` → `considered` are not on the list, so they are not sampled either.
  - Any other data file is refused, so a new file cannot drop out of the audit unnoticed.
  - Dry run on data-lead's `18bde24` (2026-10-01): 355 records in 15 strata, 43 sampled.
- **Sample size.** A sampled record has **every** field checked, so 10% of records is about 10% of
  all numbers (BUILD_PROMPT §2 Phase 1).
- **Proof of population.** The report states the seed and each stratum's population size and
  SHA-256 fingerprint of its sorted ids, both printed by the tool.

### 7.3 Comparing fields

Each field of a sampled record is compared with the source that covers it (`sources[].fields`, or
the whole record when `fields` is absent). Outcomes:

- **MATCH.**
- **MISMATCH**, a Blocker.
- **NOT COVERED:** a non-null value with no covering source. A Blocker; the validator should
  already reject it.
- **NULL OK:** unpublished, with a note.
- **NULL BUT PUBLISHED:** the source does publish it. A Major.
- **UNVERIFIABLE:** no allowed route to the source. A Major: add an `archiveUrl` or another
  source.

| Field kind | Examples | Rule |
|---|---|---|
| Identity and categories | socket, chipset, memory type, form factor, connector type, PCIe gen, efficiency rating, ATX 3.x, EXPO/XMP | Exact after normalising spelling ("LGA 1851" = "LGA1851") |
| Counts | cores, threads, DIMM slots, M.2 slots, PCIe lanes, fan mounts, slot thickness | Exact |
| Clocks | `baseClockMhz`, `boostClockMhz` | Exact after unit conversion (5.7 GHz = 5700 MHz). No tolerance beyond the source's own precision |
| Dimensions | `lengthMm`, `heightMm`, radiator sizes | Exact when the source gives mm. When it gives inches: round(in × 25.4) ± 1 mm |
| Power | TDP, PPT, TBP, recommended PSU, PSU wattage | Exact |
| Capacity and speed | GB, TB, `speedMtps`, `readMBps` | Exact as marketed. "DDR5-6000 MHz" means 6000 MT/s |
| Timings, voltage | CL-tRCD-tRP-tRAS, V | Exact to the source's precision |
| Lists | outputs, supported sockets, radiator positions | Set equality |
| Lane-sharing rules | "M2_3 disables SATA 5–6" | Each rule matches the manual's table: slot ids, trigger and effect |
| BIOS minimums | minimum BIOS per CPU family | Exact version string, from the board's CPU support page or manual |
| Benchmark results | fps, render seconds, scores | Exact to the published precision when a number is printed. Read from a chart without labels: ±1% or ±1 unit, whichever is larger, and the row must say it was read from a chart |
| Benchmark conditions | resolution, preset, upscaler and mode, frame generation, CPU and GPU used, driver, game version, `publishedAt` | Exact. A missing condition is a Blocker |
| Prices | amount, currency, retailer, `inStock`, `isMarketplace` | Exact against the capture taken at `retrievedAt` (§7.5) |
| Dates | `retrievedAt`, `checkedAt` | Valid ISO dates, not in the future |

### 7.4 Reaching sources (Owner's rule 1, plan §7)

- **Specs.** Try in this order:
  1. the live manufacturer page;
  2. the WebFetch tool;
  3. a Wayback Machine snapshot, keeping the canonical `url` and adding `archiveUrl`;
  4. the official PDF manual or datasheet;
  5. another reachable manufacturer source.
- **Benchmarks.** The live publisher page, or an archived copy of the published review.
  - An archived row is audited against its `archiveUrl` snapshot.
  - If the original review is also reachable live, it is compared too, and any difference is
    logged.
- **Prices.** A live retailer product page only. Archives, caches, search snippets, price
  trackers and aggregators are never price sources.
- **Bot protection.** When a site blocks automated access (plan §7 lists msi.com, gigabyte.com,
  corsair.com and others), use only the allowed fallbacks. Never use stealth plugins, captcha
  solving or user-agent games. If nothing works, the field is UNVERIFIABLE.
- **Politeness.** One request at a time per host. Captures of third-party pages stay under
  `artifacts/`, never in git.

### 7.5 Owner's rule 1 compliance check: every price and benchmark row

These checks run on 100% of rows. Field names follow data-lead's validator on
`feat/data-foundations` @ `8c1fc07` (rule ids `price-capture`, `archive-form`,
`benchmark-snapshot-date`, `url-is-archive`). Any failure is a **Blocker**.

**Tool** (WP-Q2): `node tests/audit/rule1.mjs --data-dir data --evidence-root <folder holding
artifacts/> --manifest <sha256 manifest> [--today YYYY-MM-DD] [--json <out>]`. Exit 0 when every
check passes, 1 on any failure, 2 on bad input. It reads raw JSON with zero dependencies, never
data-lead's schemas, so it checks the data independently.

- On the home PC the captures are in `C:\Projects\rig-lab-evidence\data-lead-artifacts\`, and
  the manifest is `docs/reports/evidence/data-lead-evidence-manifest.sha256.txt`.
- Beyond the rows below it adds: R1-P3b (an HTML capture names the url's product id), R1-P6a
  (the amount appears in an HTML capture: an aid for R1-P6, never a pass of it, since a product
  page shows many prices), R1-P7 (real part, unique key, positive amount), gap checks R1-G1 to
  R1-G5, R1-C1 (every purchasable part has a price or a gap in each market) and R1-B6.
- R1-P4's independent evidence: the capture's modification time, Amazon's own
  `pageLoadTimestampUTC` inside the hashed capture, and the price runner's fetch log.
- Proof (2026-10-01): 78 unit tests. A mutation run that planted one violation for each of 11
  checks in a copy of the real data failed exactly those 11 checks.

**Prices** (`{partId, market, currency, amount, retailer, url, inStock, isMarketplace,
retrievedAt, capture, captureSha256}`):

| Check | Rule |
|---|---|
| R1-P1 | `url` is a retailer product page, and the retailer is in the source registry as a retailer. Never web.archive.org, archive.today or archive.ph, a search engine cache or snippet, a price tracker, or an aggregator |
| R1-P2 | No `archiveUrl` on a price row |
| R1-P3 | `capture` = `artifacts/prices/<SA\|US>/<partId>--<retailer>--<retrievedAt>[--<n>].<html\|png>`, matching the row's own market, partId, retailer and retrievedAt; `--<n>` (n ≥ 2) marks a later attempt that day (data-lead's `data/tools/capture-name.mjs`). The file exists under the evidence root (git-ignored `artifacts/`; on the home PC, `C:\Projects\rig-lab-evidence\data-lead-artifacts\artifacts\prices\`). Its SHA-256 equals `captureSha256` |
| R1-P4 | `retrievedAt` is the UTC date of that live fetch, falls in its batch's window, and matches independent evidence rather than just the file name (which is built from `retrievedAt`). The evidence is the capture file's modification time (UTC date), and, for saved HTML, any fetch timestamp the capture records. The window is the file's single `batch` in the seed format; from WP-D1, it is the window of the `batches` entry the row names in its own `batch`, and a row that names no batch, or one the file lists other than once, fails |
| R1-P5 | `currency` matches `market` (SA with SAR, US with USD) |
| R1-P6 | For the 10% sample: the captured page shows the recorded amount, stock state and seller type. A saved HTML capture is searched for the amount; a screenshot is read by eye |

A live re-check that finds a different price today is logged as **price drift**, not a data
error. The audit compares with the capture taken at `retrievedAt`. Heavy drift is reported to
data-lead as a Minor so the refresh cadence can change.

**Gap records** (`{partId, market, reasonCode, reason, retailersTried, checkedAt}` in
`data/prices/{sa,us}.json`):

- `reasonCode` and `reason` are present.
- `retailersTried` is a non-empty list of registry retailers.
- `checkedAt` is a valid date that is not in the future, inside its batch's window (as R1-P4).
- No part has both a price and a gap for the same market.

**Benchmarks** (`url`, `archiveUrl?`, `publishedAt`, `retrievedAt`, full test conditions):

| Check | Rule |
|---|---|
| R1-B1 | `url` is the publisher's original review URL, never an archive link, a cache, a search snippet, a forum repost or an aggregator |
| R1-B2 | The publisher is in the registry as a reviewer or benchmark publisher |
| R1-B3 | `publishedAt` is present on every row |
| R1-B4 | If `archiveUrl` is set: it has the form `https://web.archive.org/web/<14-digit timestamp>/<url>`; the embedded original equals `url`; the snapshot is on or after `publishedAt` and no later than `retrievedAt` |
| R1-B5 | All test conditions are present (§7.3) |

### 7.6 Recording results

The audit section of `docs/qa/report-phase-N.md` holds:

- the seed, the tool version (commit), and each stratum's population, fingerprint and sample
  list;
- for every sampled record, one row per field: value, source URL (and `archiveUrl`), found
  value, outcome;
- the R1 check totals (rows checked, failures by check id) with the failing rows listed;
- price drift observations.

Captures QA makes go to `artifacts/audit/<phase>/` (git-ignored).

## 8. Model tests: golden and held-out

### 8.1 Golden tests: every anchor row

- **What** (BUILD_PROMPT §5.3; `models.goldenTolerancePct` 5): for every anchor row in
  `data/benchmarks/game.json` and `data/benchmarks/creator.json`, the model reproduces the published
  number within ±5%.
- **In the anchor's own source context** (the Director's ruling, 2026-10-02, phase-1-plan WP-E3):
  - Each case runs the model on the anchor's publisher and its test conditions: the test system's
    CPU, GPU chip and RAM, and the resolution, preset, ray tracing and upscaling. The preset is the
    game's own English name, from WP-D2's preset map.
  - The model may calibrate per source, for example with a scene factor per publisher and game.
    The calibration comes from the anchors, and the result's explanation names it.
  - The test system is described as published, not as a catalogue build: at `c621c15`, 106 of the
    116 game anchors name a card that isn't in the catalogue, and no anchor's RAM is a catalogue
    kit. QA's review of the result types asked for a test-system entry point (change C1).
- **Generated, not copied.** The golden test reads the anchor files and makes one case per row, so
  a new row gets its case by construction.
- **Names.** Each case's own title is `[golden] <anchor id>` or `[golden] <anchor id>: <text>`, in a
  file under `src/engine/`. Build the title with a template literal: Vitest 5 cuts values
  interpolated into `it.each` and `test.for` titles at 40 characters (`taskTitleValueFormatTruncate`),
  and 141 of the 143 anchor ids at `c621c15` are longer. Cut down, they collapse into 32 names.
- **The error** is |midpoint − published| / published. The midpoint is (low + high) / 2 of the
  estimate, in the anchor's own unit: avg fps for a game row, the score for a creator row. Within
  5% passes, exactly 5% included.
- **QA's check:** `node tests/audit/golden-count.mjs --vitest <report> [--estimates <file>]`.
  - It reads the anchor files and the Vitest JSON report, never the engine's code.
  - Every anchor row must have exactly one passing golden case, matched by id. Equal counts can
    hide one missing case and one duplicate. A missing, extra, duplicated, failed, skipped or
    misnamed case fails, and a title that Vitest cut short is named as the cause.
  - With `--estimates`, it reads the engine's own estimate for each anchor (from the dump,
    `artifacts/engine/golden-estimates.json`: `[{ anchorId, low, high, confidence }]`) and checks
    the ±5% itself. A golden test that asserted a looser tolerance would pass Vitest and fail here.
  - `--anchors data/benchmarks/game.json` limits it to the game rows, while WP-E3 has landed and
    WP-E4 hasn't.
  - Exit 0 pass, 1 a failed check, 2 cannot measure. Its tests run on real Vitest output of a
    fixture suite, with one planted defect per scenario file.
  - On the real data at `c621c15` it finds 143 anchor rows and no golden cases yet (exit 1).
- **Conflicting sources** (`conflictsWith`: rows from another publisher that differ by more than
  10% on the same configuration; the Director's ruling, 2026-10-02):
  - each row still passes ±5% in its own source context;
  - and the estimate shown without a source context, which is what the lab and the builder show,
    has a range that contains both published values, at confidence `medium` or `low`.
  - QA checks the second through the dump's query mode: for each pair, the configuration without a
    source context gives `low` at most the smaller value, `high` at least the larger, and a
    confidence other than `high`.
- **Tracked, not gated:** whether each published value lies inside its estimate's range, and the
  range's width relative to its midpoint. A model that meets ±5% only with very wide ranges is
  reported to the Director.
- **Severity.** An anchor outside ±5%, a missing or duplicated golden case, and a conflicting pair
  whose range leaves out a published value are each a Blocker.
- **When.** On every PR, inside `verify`: from WP-E3 for the game rows and from WP-E4 for the creator
  rows (Appendix C).

### 8.2 Held-out results: at least 20

- **Why.** The golden test reads the anchors, so ±5% there is easy (phase-1-plan §8, risk 3). The
  held-out set is the real proof of accuracy: published results the model has never seen.
- **How many** (Hazem, 2026-10-02, phase-1-plan §6.3; `budget.json` → `models`): at least
  `heldOutCount` 20 results, and at least `heldOutPerClassMin` 4 in each of the 5 classes of
  `heldOutClasses`. Each result counts in one class only, its primary class.
- **The classes:**

  | Class | A result counts here when |
  |---|---|
  | `gpu-bound` | It is a game result at 1440p or 4K, on a test system whose CPU is the review's fastest or close to it, so the GPU limits. The chip is a catalogue GPU chip |
  | `cpu-bound` | It is a game result at 1080p or lower, with the review's fastest GPU, so the CPU limits. The CPU is a catalogue CPU |
  | `other-publisher` | It is a game result from a registry publisher whose rows are not anchors for that game at the frozen commit |
  | `creator` | It is a Blender, Cinebench 2024, video export, code compile or local AI result, for a catalogue CPU or GPU chip |
  | `interpolated-gpu` | Its catalogue GPU chip has no anchor for that game, resolution and preset, while a faster and a slower catalogue chip in the same published chart do |

- **The mix** (QA's rules, so that every check below has something to measure):
  - At least 4 results are at a configuration the data anchors from another review: the same chip
    or CPU, game or test, resolution and preset. By the confidence definitions these are the ones
    the model should call `high`, so the calibration check has a sample.
  - At most 4 results come from any one review page, and the set uses at least 3 publishers. If
    the reachable sources can't give that, the picker records why.
- **Eligible results** (each checked again by a second worker):
  1. The publisher is in `data/publishers.json` as a reviewer or a benchmark publisher.
  2. The result's page URL, and any archive of it, appears in no `sources[].url` or `archiveUrl`
     in `data/**` or `src/data/**` at the frozen commit, checked by grep.
  3. It carries the full test conditions of §7.3 and a `publishedAt`, as an anchor must, and frame
     generation is off.
  4. The model claims to cover it, checked from the data at the frozen commit:
     - for a game result, the game has at least one anchor at that resolution and preset;
     - for a creator result, the workload and its named test have at least one anchor;
     - and the chip or CPU is in the catalogue.

     A pick outside that is ineligible: for a game or workload with no anchors there, "no estimate
     yet" is the right answer, not a failure (the Director, 2026-10-02).
  5. The value is printed in the source, or read from a chart by §7.3's rule (±1% or ±1 unit) and
     marked as read from a chart.
- **The procedure** (blind; phase-1-plan §4, "Held-out results"):
  1. The Director records the frozen commit, engine and data, in `docs/reports/progress.md`. From
     then on the model doesn't change until QA reports (briefs, "The engine freeze").
  2. A fresh data-auditor, the picker, chooses the results from the sources alone. It never sees
     the model's output, the lab or the dump. It writes `tests/audit/holdout/phase-1.json` (format
     below), with the frozen commit in it.
  3. qa-lead commits the picks before any run. The commit's time proves they were fixed first.
  4. A second fresh data-auditor, the checker, re-checks every pick against the eligibility rules
     and its source, also without any model output. The picker replaces an ineligible pick, and the
     replacement is committed before the run.
  5. qa-lead runs the model once, at the frozen commit, in a worktree checked out at that commit,
     through the dump's query mode. Each pick is one query: its published test system, its game or
     workload and its setting, without a source context, since that is the estimate the lab shows.
  6. QA's script computes each error and writes the results under `artifacts/qa/phase-1/holdout/`.
     A tooling crash may be fixed and the same picks run once more, and the report says so. The
     picks never change after the run.
- **Gates:**
  - Error = |midpoint − published| / published. Each result is within `heldOutMaxErrorPct` 10%.
    Over 10% is a Blocker.
  - "No estimate" on an eligible pick fails like an error over 10%, since eligibility (rule 4)
    already requires a configuration the model claims to cover.
  - **Calibration:** of the results the model labels `high`, at least half have the published value
    inside the range (plan WP-E3, "Done means"). Otherwise the confidence labels are wrong: a Major,
    and WP-E3 isn't done.
  - The `creator` class gives the at least 4 held-out creator results within 10% that plan WP-E4
    asks for.
- **The report** lists every result: its class, source, published value, the model's range and
  confidence, the midpoint, the error, and whether the value is inside the range. Then, per class,
  the mean and the largest error, and per confidence level, the share inside the range. The error
  report also goes into `docs/reports/phase-1.md` (plan WP-E3).
- **The file**, `tests/audit/holdout/phase-1.json`:

  ```json
  {
    "schemaVersion": 1,
    "phase": 1,
    "frozenCommit": "<40-hex commit of the integration branch>",
    "pickedBy": "<agent id>",
    "checkedBy": "<agent id>",
    "results": [
      {
        "id": "ho1-01",
        "class": "gpu-bound",
        "kind": "game",
        "source": {
          "publisher": "<registry id>",
          "url": "<the review page>",
          "archiveUrl": null,
          "title": "<the page title>",
          "publishedAt": "YYYY-MM-DD",
          "retrievedAt": "YYYY-MM-DD",
          "locator": "<chart or table>",
          "capture": "artifacts/qa/phase-1/holdout/<file>",
          "captureSha256": "<hex>"
        },
        "testSystem": {
          "cpu": "<as published>",
          "cpuId": "<catalogue id>",
          "gpu": "<as published>",
          "gpuChipId": "<catalogue id>",
          "ram": "<as published>"
        },
        "query": {
          "gameId": "<catalogue game id>",
          "resolution": "2560x1440",
          "preset": "<the game's English preset>",
          "presetAsPublished": "<the publisher's label>",
          "rayTracing": "off",
          "upscaling": null
        },
        "published": { "value": 0, "unit": "fps", "readFrom": "number" },
        "anchoredConfig": false
      }
    ]
  }
  ```

  A creator result has `"kind": "creator"`, and its `query` names the workload, the test and the
  device (a `cpuId` or a `gpuChipId`) instead of a game. Third-party captures stay under
  `artifacts/`, never in git (briefs, "Evidence").
- **Who may read it.** build-lead never reads `tests/audit/holdout/**` (briefs, "Shared contracts"),
  and WP-E0's ESLint rule stops `src/**` from importing `tests/**`. A published held-out set may
  become anchors later, and the next phase draws a new one.

### 8.3 Frame generation and VRAM

- In build-lead's result types, `FpsEstimate.frameGeneration` can only be a `NoEstimate` in Phase 1,
  so no frame-generation number can exist. Unit and e2e tests check that frame-generation figures
  never appear in native fields or native UI rows.
- A setting that needs more VRAM than the card has is flagged (`VramCheck`, `exceeds`), never
  hidden. The lab's local-AI case, "doesn't fit in 8 GB" (plan WP-E4), is checked in e2e.

## 9. Compatibility rules

### 9.1 What every rule needs

For each of the 20 rules in §9.2:

- **A stable rule id.** The ids are agreed with build-lead: `RULE_IDS` in `src/engine/types.ts`
  equals `tests/audit/compat-rules.json`, in the same order (QA's review of the result types at
  `4fa8a95`). An id is never renamed: tests, the trace and share links name it.
- **A result** of `ok`, `warn` or `block`, with a one-sentence reason that gives the numbers with
  their units, the rule id, and the sources of every spec the rule read (`RuleResult.evidence`).
  "Can't verify" is a `warn` with `cantVerify: true`, never a fifth status.
- **Never `ok` on an unpublished value.** An `ok` result has no evidence item whose `availability`
  is `not-published` (QA's review of the result types, change C3). The sweep checks it on every
  combination (§9.4, S12).
- **Tests**, named as in §9.3:
  - at least one passing test of each status in the rule's outcomes (§9.2). `ok` is the positive
    test, and `warn` and `block` are the negative ones (`compatibility.minPositiveTestsPerRule`,
    `.minNegativeTestsPerRule`);
  - for a numeric rule, three boundary tests: **at** the limit, **inside** (1 unit on the passing
    side) and **outside** (1 unit on the failing side). One unit is the limit's own step: 1 mm,
    1 W, 1 MT/s, one module, one drive, one 8-pin cable, 0.1 slot, or the next radiator size (120,
    140, 240, 280, 360, 420 mm). The reason says what happens exactly at the limit;
  - an **unknown-data** test for each rule whose decision can depend on a value the data doesn't
    publish (`unknownData: true` in `compat-rules.json`): a field that is null with a note, a
    nullable list (a case's `psu.clearance`), or a fact the schema doesn't hold (a RAM kit's rank).
    The unpublished value gives `warn` with `cantVerify`, never `ok`
    (`compatibility.unknownDataMustNotReturn`). An empty list is a real answer ("none"), not an
    unpublished one.
- **The unknown-data ruling** (the Director, 2026-10-02, phase-1-plan WP-E1):
  - A rule whose every input is required by the schema or the validator has no unknown-data test,
    since valid data can't be unpublished there. Instead, `compat-rules.json` names, for each field
    it reads, the validator test that proves a null (or an empty list) there is rejected.
    compat-trace fails when that test is missing, failed or skipped.
  - A field whose schema defines null or `[]` as "the part has none" (`cpu.igpu`,
    `case.frontIo.usbC`) holds a real answer, not an unpublished one.
  - The lists are re-checked whenever a rule starts to read a new field, every WP-D1 field
    included. The first re-check, against WP-D1 batch 1 (`c588afb`), moved gpu-length and
    psu-form-factor into the unknown-data group, so 10 rules have unknown-data tests and 10 have
    validator proofs.
- **Real products.** Fixtures use real, sourced catalogue products (`data/compat-fixtures.json`,
  WP-D1). A boundary or unknown-data test may take a real product and override the one field under
  test, and its title says so ("Sapphire Pulse RX 9070 XT with its length set to 355 mm"). No test
  adds an invented product to the catalogue (CLAUDE.md rule 8).

### 9.2 The 20 rules

`tests/audit/compat-rules.json` is the machine copy of this table, and `compat-trace.test.mjs`
pins its ids. In "Unknown data", **yes** means the rule has an unknown-data test, and the file
lists the values that can be unpublished; **no** means the file names the validator tests instead.
The examples are phase-1-plan §3's real products.

| # | Rule id | Checks | Outcomes | Numeric | Unknown data | Examples (plan §3) |
|---|---|---|---|---|---|---|
| 1 | `cpu-socket` | The CPU socket matches the board | ok, block | no | no | Ryzen 7 9800X3D on the TUF Gaming Z890-Plus WiFi: block, "Needs AM5 — your board is LGA1851" |
| 2 | `cpu-chipset` | The board's CPU support list includes the CPU | ok, block | no | no | A CPU left off the support list of a board with its socket (WP-D1 adds one) |
| 3 | `bios-version` | Whether the CPU needs a newer BIOS than the board shipped with, and whether the board has BIOS FlashBack | ok, warn | no | yes | Ryzen 7 9850X3D on the TUF Gaming X870-Plus WiFi: warn, with the update steps. Core i5-14600K on the Prime B760M-A WiFi D4: warn, naming BIOS 1205 and the retailer advice. Never block (Hazem, §6.1) |
| 4 | `ram-type` | DDR4 or DDR5 matches the board | ok, block | no | no | Trident Z Neo DDR4-3600 on the TUF Gaming B650-Plus WiFi: block |
| 5 | `ram-slots` | The kit's modules fit the DIMM slots | ok, block | yes | no | A 4-module kit on the 2-slot ROG Strix B650E-I: block |
| 6 | `ram-speed` | The kit's speed against the board's and the CPU's official speeds | ok, warn | yes | yes | Trident Z5 CK DDR5-8200 with the Core Ultra 9 285K on the TUF Gaming Z890-Plus WiFi: warn, naming the official speed and explaining XMP |
| 7 | `gpu-length` | Card length against the case, per layout | ok, block | yes | yes | Sapphire Pulse RX 9070 XT (320 mm) in the Fractal North: ok (355 mm). With the ARCTIC Liquid Freezer III Pro 360 at the front: block (300 mm) |
| 8 | `gpu-thickness` | Card thickness against slot spacing and the case's slots | ok, warn, block | yes | yes | Fractal Terra with the Sapphire Pulse RX 9060 XT and the DeepCool AN400: names the spine positions where both fit |
| 9 | `cooler-height` | Air-cooler height against the case, per layout | ok, block | yes | no | DeepCool AK620 (160 mm) in the Fractal Terra: block |
| 10 | `ram-cooler-clearance` | RAM height under an air cooler | ok, warn, block | yes | yes | TeamGroup T-Force Delta RGB (46.1 mm) under the AK620 (43 mm): block, or warn if the fan can move up. DeepCool AN400 (clearance not published): warn, can't verify |
| 11 | `radiator-fit` | Radiator size and position against the case | ok, block | yes | yes | ARCTIC Liquid Freezer III Pro 360 in the Fractal Pop Mini Air (240 mm at most): block |
| 12 | `psu-form-factor` | The PSU form factor against the case | ok, warn, block | no | yes | DeepCool PN850M (ATX) in the Fractal Terra (SFX and SFX-L only): block |
| 13 | `psu-length` | PSU length against the case, per layout | ok, block | yes | yes | NZXT C1200 Gold (160 mm) in the Pop Mini Air (150 mm): block. In the North it fits with one drive tray, but not with two |
| 14 | `psu-wattage` | Wattage against the estimated load, with transient headroom | ok, warn, block | yes | yes | RTX 5090 Founders Edition with the DeepCool PN650M: block, showing the recommended range |
| 15 | `gpu-power-connector` | A native 12V-2x6 where needed, and enough 8-pin cables | ok, warn, block | yes | yes | A PSU without a native 12V-2x6, and a real case of too few cables (WP-D1 adds both) |
| 16 | `m2-lanes` | M.2 count, and lane-sharing side effects | ok, warn, block | yes | no | Three NVMe drives on the ROG Strix B650E-I (2 slots): block. A drive in a shared slot on the TUF Gaming B550-Plus WiFi II: warn, quoting the manual |
| 17 | `board-form-factor` | The board's form factor against the case | ok, block | no | no | TUF Gaming B650-Plus WiFi (ATX) in the Pop Mini Air: block |
| 18 | `usb-c-header` | A front USB-C port needs a header on the board | ok, warn | no | no | Fractal North with the TUF Gaming B550-Plus WiFi II (no header): warn |
| 19 | `cooler-socket` | The cooler's mounting kit fits the CPU socket | ok, block | no | no | A cooler that doesn't list every socket (WP-D1 adds one) |
| 20 | `display-output` | A build with no graphics card needs a CPU with integrated graphics | ok, block | no | no | Core i5-12400F with no graphics card: block |

Rows 4 and 5, and 12 and 13, each split one item of BUILD_PROMPT §5.1, as in v3. Rows 19 and 20
are Hazem's additions (phase-1-plan §6.2).

### 9.3 Enforcement

- **Unit test names.** A test counts by its own title, not its describe blocks, in a file under
  `src/engine/`: `[<rule-id>] <kind>: <description>`, where the kind is `ok`, `warn`, `block`,
  `unknown`, `boundary at`, `boundary inside` or `boundary outside`. Build a title that interpolates
  a long product name with a template literal (Vitest's 40-character cut, §8.1).
- **E2E test names**, from Phase 2: `[<rule-id>] message: …`. They assert the exact reason the
  engine gives for the same build, by calling the engine in the test, so the text is never
  duplicated.
- **The bios-version variants.** Hazem's decision needs two warnings told apart. The rule needs a
  passing `warn` test whose description matches `\bwith (BIOS )?FlashBack\b` (the update steps), and
  one that matches `\b(without|no) (BIOS )?FlashBack\b` (the BIOS version and the retailer advice).
- **The check:** `node tests/audit/compat-trace.mjs --registry artifacts/engine/rules.json --vitest
  artifacts/test/vitest-report.json [--allow-pending <ids>] [--playwright <report> --require-e2e]`.
  - It reads QA's rule list, the engine's registry (the dump's `RuleSpec` list) and the Vitest JSON
    report, never the engine's code.
  - It exits 1 when:
    - a registered rule lacks a passing test of a kind it needs, or a variant;
    - any of its tests fails, or an e2e check is flaky;
    - one of its validator tests is missing, failed or skipped;
    - a rule in QA's list is missing from the registry and `--allow-pending` doesn't name it, or
      the registry has an id the list doesn't, or one id twice;
    - a `RuleSpec`'s outcomes or numeric flag differ from §9.2;
    - a test name has a known rule id but a wrong kind, a valid kind but an unknown id, or a status
      that §9.2 doesn't give that rule (usually an unknown-data test named `warn:`).
  - It exits 2 when it can't measure: bad input, or a test file under `src/engine/` or `src/data/`
    that didn't load.
  - It writes the matrix, with each input's SHA-256, to `artifacts/qa/compat-trace/compat-trace.json`
    and prints it.
  - During WP-E1, `--allow-pending` names the rules not built yet, one by one. A rule in the
    registry may not be on the list, so the list only shrinks.
  - Its tests run on real Vitest output of a fixture suite, one planted defect per scenario file.
    Of 19 bugs planted in the two tools themselves on 2026-10-02, every one was caught.
- **CI.** Inside `verify`, from WP-E1's first rule (Appendix C).

### 9.4 Hunting false negatives

A compatibility false negative is `ok` for a combination that can't work. It is a Blocker. Two
defences beyond the unit tests, both run on the engine's output through the dump's query mode,
never on its code:

- **The known-incompatibility corpus**, `tests/audit/compat-corpus.json`: real, sourced
  combinations known not to work, from makers' manuals, CPU support lists and case pages.

  ```json
  {
    "schemaVersion": 1,
    "owner": "qa-lead",
    "items": [
      {
        "id": "corpus-ddr4-kit-in-ddr5-board",
        "build": {
          "cpu": null,
          "motherboard": "<catalogue id>",
          "ram": "<catalogue id>",
          "gpu-card": null,
          "storage": [],
          "psu": null,
          "cooler": null,
          "case": null,
          "case-fan": null
        },
        "expect": [{ "ruleId": "ram-type", "status": "block" }],
        "why": "One sentence, with the numbers and their units.",
        "sources": [
          {
            "url": "<maker page or manual>",
            "publisher": "<registry id>",
            "retrievedAt": "YYYY-MM-DD",
            "locator": "<section or page>",
            "capture": "artifacts/qa/phase-1/corpus/<file>",
            "captureSha256": "<hex>"
          }
        ]
      }
    ]
  }
  ```

  - `build` has the shape of the engine's `BuildParts`, and every part id exists in the catalogue
    at the commit tested.
  - The engine chooses the case layout, so an entry must fail under every layout. A combination
    that fails in one layout only belongs in a rule's unit tests.
  - `expect` lists every rule that must not be `ok`, each with `block` or `warn`.
  - **Results:** `ok` for an expected rule, or the rule not run, is a Blocker: a false negative. A
    milder status than expected (`warn` for `block`) is a Major. `worst` must be `block` whenever an
    expected status is `block`.
  - The corpus worker (§17) builds it from sources, independently of data-lead's
    `data/compat-fixtures.json`: at least one entry for each of the 17 rules that can block, and two
    where the catalogue allows.
  - It runs on every PR once WP-E1 lands (Appendix C).
- **The sweep.** Every combination the dump enumerates for a rule, from `RuleSpec.reads`, is checked
  against invariants that QA reads from the catalogue's JSON itself:

  | # | Invariant |
  |---|---|
  | S1 | `cpu-socket`: a CPU socket other than the board's gives block; the same socket gives ok |
  | S2 | `ram-type`: a kit type other than the board's gives block |
  | S3 | `board-form-factor`: a board form factor the case doesn't list gives block |
  | S4 | `psu-form-factor`: an ATX unit in a case that takes only SFX or SFX-L gives block |
  | S5 | `gpu-length`: a card longer than the case's unconditional limit gives block, since conditional rows only tighten it |
  | S6 | `cooler-height`: an air cooler taller than every published limit of the case gives block |
  | S7 | `psu-length`: a unit longer than every published limit of the case gives block |
  | S8 | `ram-slots`: more modules than DIMM slots gives block |
  | S9 | `m2-lanes`: more NVMe drives than M.2 slots that take NVMe gives block |
  | S10 | `cooler-socket`: a CPU socket the cooler doesn't list gives block |
  | S11 | `display-output`: no graphics card, and a CPU whose `igpu` is null, gives block |
  | S12 | No `ok` result has a `not-published` evidence item, and every `cantVerify` warning has one (change C3) |
  | S13 | Every report names each rule exactly once, in `results` or `notRun`, and `worst` is the worst status in `results`, or null when none ran |
  | S14 | A report whose layout search finds no layout has `worst` = block (change C4) |
  | S15 | Each rule's combination count equals the product of its categories' sizes, plus one for each optional category (change C5) |

  - The sweep worker (§17) owns these checks. A failed invariant is a Blocker when it hides an
    incompatibility (S1 to S11, S14), and a Major otherwise.
  - The catalogue is small (16 CPUs and 7 boards make 112 socket pairs at `c621c15`), so each
    rule's sweep is exhaustive.

### 9.5 The mutation-test check

phase-1-plan WP-E1: "Mutation tests (StrykerJS) run on the rules. Every surviving mutant is killed
by a new test, or explained in writing."

- **The run.** build-lead runs StrykerJS with its Vitest runner on the rule files, with the JSON
  reporter (by default `reports/mutation/mutation.json`, in the mutation-testing report schema).
- **Statuses, as Stryker counts them:** `Killed`, `Timeout` and `RuntimeError` are detected;
  `Survived` and `NoCoverage` are not; `CompileError` mutants are invalid and don't count; `Ignored`
  mutants were disabled in the source.
- **"Explained in writing"** is a `// Stryker disable next-line <Mutator>: <reason>` comment on the
  line. The reason then sits in the code where reviewers see it, and the report carries it as the
  `Ignored` mutant's reason.
- **QA's check**, `tests/audit/mutation-check.mjs`, is written against the first real report in
  WP-Q4. It fails when:
  - a mutant in a rule file is `Survived` or `NoCoverage`. Each is listed by file, line, column,
    mutator and replacement, the identity Stryker itself keeps across runs;
  - an `Ignored` mutant has no reason, or one under 20 characters;
  - a rule file is missing from the report, or a mutant is still `Pending` (the run didn't finish).
- QA reads every `Ignored` reason and lists them in the phase report with a verdict on each. "An
  equivalent mutant: `<` and `<=` give the same result for these integer slot counts" is a reason;
  "not worth testing" isn't.
- It runs at WP-E1's hand-off and before the phase exit, not on every PR: a Stryker run takes
  minutes.

### 9.6 Each rule's own QA worker

Every rule also passes a fresh QA worker of its own (phase-1-plan §4). The worker writes its
expected results from the makers' sources before it sees the engine's output. The protocol and the
evidence are in §17 and `docs/qa/phase-1-worker-briefs.md`.

## 10. Accessibility

### 10.1 Automated checks (axe)

- **Tool.** `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`
  (`accessibility.axeTags`). A violation of any impact fails (`maxViolations` 0).
- **Incomplete results** ("needs review") are listed in the report for a manual decision.
- **Routes.** Every entry in the route table (17 routes plus 404), in both themes, at all three
  widths.
- **States:**
  - empty build;
  - partial build;
  - full build;
  - a list showing block and warn badges;
  - compare open with 3 parts;
  - the filters drawer open at 390;
  - SAR and USD;
  - no price in a market;
  - a data load error;
  - the Buy Sheet in print media.
- **The 3D canvas is not excluded.** It must have an accessible name, a text alternative (the
  parts list), and controls that work without the canvas.
- **As built (WP-Q1).**
  - `tests/e2e/a11y.spec.ts`, tagged `@smoke @a11y`, so `npm run verify` runs it.
  - It checks every route in the route table plus the 404 page, in every e2e project: 18 pages ×
    3 widths = 54 checks.
  - Build steps are checked with the 3D preview started, so the canvas and its label are in the
    tree.
  - Each check attaches `axe-results.json`, with the violations, the incomplete results and the
    counts. It also annotates the counts and every "needs review" rule.
  - One theme until the design tokens exist (§5). The states in the list above arrive with the
    builder in Phase 2.
  - Result on the WP-Q1 branch (axe-core 4.13.0): 0 violations and 0 needs-review in all 54
    checks. 15 rules pass on each plain page, and 21 on each build step.
  - Mutation M2 (an image with no alt text in `index.html`) failed all 54 checks with
    `image-alt (critical)`, and `npm run verify` exited 1.

### 10.2 Keyboard-only path (from Phase 2)

- **How.** A Playwright test drives only `page.keyboard`, with no mouse.
- **The path:**
  1. On `/`, the first Tab reaches a visible "Skip to content" link, and Enter moves focus to
     `main`.
  2. Start building.
  3. Use case: a radio group, where the arrow keys move and Space selects. Then Continue.
  4. Budget: a slider that takes arrows, Page Up/Down and Home/End, and announces its value. The
     currency toggle is reachable.
  5. Each part step:
     - filters (Space);
     - sort;
     - a part row (Enter picks);
     - compare (Space), where Escape closes the panel and focus returns to the trigger;
     - an incompatible part is focusable with `aria-disabled="true"`, and its reason is its
       accessible description.
  6. Looks: colour and RGB options. The 3D view offers keyboard orbit and zoom, or view-preset
     buttons.
  7. Review, then the Buy Sheet, then "Copy share link", confirmed through a polite live region.
- **Checks at every stop:**
  - Focus is visible: an outline or ring of at least 3:1 against its surroundings (WCAG 2.4.7,
    1.4.11).
  - The focused element is in the viewport and not covered.
  - The order is logical (2.4.3).
  - There is no trap (2.1.2).
  - Every action is available by keyboard (2.1.1).
  - A step change moves focus to the new step's heading or `main`. build-lead's smoke already
    checks this for "Next".

### 10.3 Visible focus and reduced motion

- **Focus.** A helper asserts after each Tab that the focused element has a non-zero outline or a
  box-shadow ring; visual regression also captures focus states.
- **Reduced motion.** `page.emulateMedia({ reducedMotion: 'reduce' })`, then:
  - no running CSS or Web Animations longer than 0.01 s after interactions (checked through
    `document.getAnimations()`);
  - numbers jump instead of animating;
  - 3D auto-rotation is off;
  - parts appear in place or fade in 150 ms or less.
- **WCAG 2.2.2 (Level A).** Any movement lasting more than 5 seconds, such as auto-rotation, needs
  a pause control or must stop by itself within 5 seconds, in every motion setting.

### 10.4 Manual screen-reader checks (each phase exit from Phase 2)

- **Screen readers:**
  - NVDA (current) with Chrome and with Firefox on Windows (REF-LAPTOP);
  - VoiceOver with Safari on macOS;
  - VoiceOver with Safari on iOS at phone width.
- **Script:**
  - the landmarks list;
  - moving by heading (one `h1` per step);
  - reading a part row: name, price with its "as of" date, compatibility status and reason;
  - the live total, which announces politely and is not chatty;
  - compare;
  - toggle states (SAR/USD, theme);
  - errors;
  - the Buy Sheet table.
- **Recording.** The report records each check as pass or fail, with the reader and browser
  versions.
- **Who.** Agents cannot run a screen reader in C, so a human tester named by Hazem does these
  checks.

## 11. Visual regression

- **What.** Every step and page, in its default state, in all six viewport and theme cells.
  - Key states (a block badge, compare open, the filters drawer, focus rings) at the three widths
    in dark, and at 1440 in light.
  - From Phase 3, the 3D view is captured separately with a looser tolerance, because SwiftShader
    output is stable for one build but not across builds.
- **Determinism:**
  - The pinned image `mcr.microsoft.com/playwright:v1.56.1-noble` (Chromium 1194).
  - Self-hosted fonts only, with `document.fonts.ready` awaited before each shot.
  - `animations: 'disabled'` and `caret: 'hide'` (Playwright's defaults, set explicitly).
  - Reduced motion on.
  - A frozen clock (`page.clock.setFixedTime('2026-09-30T12:00:00Z')`).
  - `TZ=UTC` and locale `en-US`.
  - Device scale factor 1.
  - A frozen catalogue snapshot served through `page.route` (§12.3).
- **Masks.** Every element whose content can change between runs carries `data-volatile` and is
  masked. That covers dates, "Price as of", live prices and the 3D canvas in DOM shots. Masks are
  listed per test.
- **Thresholds:**
  - `visual.threshold` 0.2 is Playwright's per-pixel YIQ tolerance.
  - `visual.maxDiffPixelRatio` 0.001 means 0.1% of pixels (approved by the Director,
    2026-09-30).
  - It is re-checked in the Docker image when the first baselines are made: capture, then
    compare twice.
  - WP-Q1 could not do that check in C, which has a Docker client but no daemon. In C, a second
    capture of all 54 pages passed against the first at 0.001.
- **Baselines.**
  - Stored in `tests/visual/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}` through
    `snapshotPathTemplate`.
  - Generated only in CI-docker.
  - Viewport screenshots rather than full-page, to limit repository growth. QA reviews the size at
    Phase 2; above 50 MB, Git LFS is proposed to Hazem.
- **Updating baselines.**
  - Only visual-tester updates them, through a manual `workflow_dispatch` job that runs
    `--update-snapshots` in the Docker image and uploads the new PNGs.
  - visual-tester reviews every diff side by side, then commits with
    `qa: update visual baselines for <reason>`.
  - The PR shows before and after images.
  - CI never updates baselines by itself.
- **Also checked by visual-tester:**
  - text overflow and clipping at 390;
  - contrast of non-text elements;
  - focus rings.
- **As built (WP-Q1): scaffolding, no baselines.**
  - **Config** (`playwright.config.ts`):
    - projects `visual-390`, `visual-768` and `visual-1440`, sized from `visual.viewports`, with
      `en-US`, UTC and reduced motion;
    - `toHaveScreenshot` defaults from `visual`: threshold, maxDiffPixelRatio, animations
      disabled, caret hidden, CSS scale;
    - `snapshotPathTemplate` as above;
    - `updateSnapshots: 'none'`, so only an explicit `--update-snapshots` writes a baseline.
  - **Helpers** (`tests/visual/visual.ts`):
    - a `test` that extends the console fixture and freezes the clock at 2026-09-30T12:00:00Z;
    - `expectScreenshot()`, which waits for fonts and masks `[data-volatile]` and every
      `canvas`.
  - **Where visual tests may run** (`visualRunDecision` in `tests/visual/visual.ts`):
    - With `QA_SNAPSHOT_DIR` set: against that scratch folder, on any machine.
    - Otherwise against `tests/visual/__screenshots__`, and only when both:
      - `REPO_BASELINES_ENABLED` is true (false until Phase 2);
      - the run is inside the pinned image, detected by `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`
        and the `pwuser` account that its Dockerfile creates.
    - Anything else skips with the reason.
  - **Spec:** `tests/visual/routes.spec.ts`, every page in its default state.
  - **Docker recipe:** `tests/visual/run-in-docker.sh`. It runs the visual projects in
    `mcr.microsoft.com/playwright:v1.56.1-noble`, with `--ipc=host --init` and `node_modules`
    in a named volume; extra arguments go to Playwright.
  - **Proof in C** (tool proof only, never baselines):
    - with no scratch folder, 54 of 54 skipped;
    - a capture into a scratch folder, then a second capture compared at 0.001: 54 of 54
      passed;
    - mutation M5 changed one word of the footer, and 19 of 54 failed, each with a diff image.
      The 35 that passed are pages where the footer is below the fold, which is the limit of
      viewport-only shots.
  - **Phase 2 CI job** (not added yet, because there is nothing to compare). Paste it into
    `ci.yml` together with the first baselines:

    ```yaml
      visual:
        name: Visual regression
        needs: verify
        runs-on: ubuntu-24.04
        timeout-minutes: 20
        container:
          image: mcr.microsoft.com/playwright:v1.56.1-noble
          options: --user 1001
        steps:
          - uses: actions/checkout@v7
            with:
              persist-credentials: false
          - run: npm ci
          - run: npm run build
          - run: npx playwright test --project='visual-*'
          - name: Upload diffs
            if: failure()
            uses: actions/upload-artifact@v7
            with:
              name: visual-diffs
              path: test-results/
              retention-days: 14
    ```

## 12. End-to-end flows

### 12.1 Smoke, and how WP-Q1 expands it

build-lead's `tests/e2e/smoke.spec.ts` (tag `@smoke`) already checks:

- For each of the 17 routes in the route table:
  - it answers HTTP 200 with no redirect;
  - its own `<title>` is in the served HTML;
  - there is one `main` and the right `h1`;
  - there are no console or page errors.
- Unknown paths get HTTP 404 and the app's 404 view.
- The 3D chunk is lazy (from the Vite manifest), is never requested on `/`, draws with no layout
  shift, and falls back when WebGL 2 is missing.
- `?b=` survives navigation, Back and reload. Bad codes are dropped with a message.

WP-Q1 added, all done on 2026-09-30 except the last item:

- The shared console and page-error fixture (§13). It replaced the per-test `collectProblems`
  helper, and every spec uses it, build-lead's smoke included.
- Projects at 390, 768 and 1440 (§5). The smoke runs at 390 and 1440, and axe at all three.
- axe on every route (§10.1).
- The `perf` project for `web-vitals.spec.ts` (§6.4).
- The visual scaffolding (§11).
- `lang="en"` on `<html>` for every route and the 404 page (CLAUDE.md rule 10).
- Every request a page makes goes to this site under `/Rip-PC/`.
- The smoke's layout-shift check ("draws into a canvas without shifting the page") counts every
  shift, including one flagged as following input. The test gives no input, and at 390 px
  Chromium flags real shifts that way (§6.4). Mutation M4 fails it at 390 (0.3646) and at 1440
  (0.2205).
- Still open: a post-deploy smoke against PAGES once Pages is live. It is blocked until Hazem
  enables Pages and merges to `main`.

### 12.2 Builder flows (from Phase 2)

- **Happy path for each of the 8 presets:** use case, then budget, then all 12 steps, then
  results, then the Buy Sheet. The live total and live compatibility update within 100 ms of each
  pick (BUILD_PROMPT §6), measured with the Event Timing API.
- **Every block and warn message** (§9.2): the part is shown, disabled, with the exact reason.
- **SAR/USD** (D6), **share URL** (D7), **mobile** at 390, and the **keyboard path** (§10.2).
- **Provenance contract (D8), agreed with build-lead:**
  - Every number rendered from data sits inside an element with `data-source-ids="<id> <id>"`
    that links to its sources.
  - The check walks every visible text node that contains a digit with a unit (fps, W, mm, GB,
    MHz, MT/s, SAR, USD, %) and asserts that an ancestor carries `data-source-ids`, or that it is
    marked `data-derived` (a total or an estimate) with its inputs listed.

### 12.3 Test data

- **Frozen snapshot.** e2e and visual suites run against a frozen catalogue snapshot
  (`tests/fixtures/catalogue/<date>/`) served through `page.route`, so a data update does not
  break UI tests.
- **Live data.** A nightly smoke runs against the live data.
- **Real products only.** Test fixtures use real products (CLAUDE.md rule 8). Synthetic ids appear
  only where a test needs an id that cannot exist, such as the codec tests.

## 13. Zero console errors and unhandled rejections

### 13.1 What Chromium 1194 actually reports

Measured with Playwright 1.56.1 on 2026-09-30, one page per case:

| Case | `pageerror` | `console` (error) | `response` ≥ 400 | Our `unhandledrejection` hook |
|---|---|---|---|---|
| `Promise.reject(new Error())` | yes | — | — | yes |
| `Promise.reject("string")` | yes | — | — | yes |
| Uncaught throw in a timer | yes | — | — | — |
| `console.error(...)` | — | yes | — | — |
| Missing image (404) | — | yes ("Failed to load resource … 404") | yes | — |
| Throw inside a dedicated worker | yes | — | — | — |
| `console.error` inside a worker | — | yes | — | — |
| Rejection inside a worker | yes | — | — | — |
| Handled rejection (`.catch`) | — | — | — | — |

So `console` plus `pageerror` catch every case in Chromium, including workers. The
`unhandledrejection` hook is defence in depth, in case a future browser stops reporting
rejections as page errors.

### 13.2 The shared fixture (WP-Q1, as built)

**Files.**

- `tests/e2e/problems.ts` holds the rules, as pure data and functions: the problem kinds, the
  allow-list `ALLOWED`, its validation, `classify`, and the same-origin and aborted-request rules.
- `tests/e2e/fixtures.ts` holds the Playwright side. It exports `test` and `expect`, and every
  spec imports them from there.
- `tests/visual/visual.ts` extends that `test` for visual specs.

**How it works.**

- The automatic fixture `problemGuard` watches the test's whole browser context, so popups and
  new tabs (the Buy Sheet) are covered, and so are workers.
- It records:
  - `console.error`: every console message of type error, from pages and workers;
  - `console.warning`: every console message of type warning, the same way (since WP-Q2, below);
  - `pageerror`: an uncaught error in a page or a worker, from the context's `weberror` event;
  - `unhandledrejection`: from our own page-side hook, as defence in depth. Chromium also reports
    each one as a `pageerror`;
  - `requestfailed`: a same-origin request that fails for any reason other than
    `net::ERR_ABORTED`, which means the page itself abandoned it by navigating away or closing;
  - `http-error`: a same-origin response with status 400 or more;
  - `crash`: a page crash.
- "Same-origin" means the origin of `use.baseURL`.
- **Console warnings fail like errors** (`console.maxConsoleWarnings` 0; the Director,
  2026-10-01, `progress.md` WP-Q2 step 4). Until WP-Q2 they were only attached. With build-lead's
  THREE.Clock filter merged (QA-P0-001), the app logs no warning of its own on any route. So an
  app warning now fails the test, and only two notices from the browser's own WebGL stack are
  allowed (the allow-list below).
  - Measured on the home PC, 2026-10-02 at `1027152`, and again at `e3f58fc`: 166 smoke tests
    pass. The allow-list let
    through 48 ReadPixels notices, all on `/build/*` pages, where the 3D preview runs. ANGLE logs
    that notice at most 4 times per GPU process, so the count follows browser launches, not
    pages: 6 projects × 2 workers × 4 = 48 (QA-P0-034).
  - Self-tests: an app warning fails; ANGLE's exact notice passes when the page itself logs it,
    and fails from a script file; a GL driver message with any other text fails.
  - **A limit** (QA-P0-033, QA-P0-038): code that Chromium compiles with the page's own URL can
    log one of the two notices word for word and pass. That is an inline script in the HTML, and
    an inline event-handler attribute, even one that a script file sets. A plain console call
    from a script file, the app's bundle included, fails, and so do `eval`, `new Function` and
    string timers, which have no location.
  - **Not covered: Chrome's unused-preload warning** (QA-P0-017). Chrome logs it a few seconds
    after the load event ("not used within a few seconds from the window's load event"), and only
    on a repeat load in the same tab. That is later than any smoke test watches, so the gate never
    sees it. The WP-Q2 visual-tester caught it with a 4.5 s wait.
- **Coverage window.** The fixture only sees what happens while a test runs, and a smoke test
  ends well under a second after its page loads (WP-Q2 measured a median of 540 ms). An unhandled
  rejection 1 s after start therefore passed all 112 smoke tests (negative control NC-F3,
  QA-P0-005). So in the dark project at each width in `console.soakViewports` (1440), each
  route's smoke test keeps watching for `console.soakMs` (1000 ms) after network idle. With that
  soak the same rejection fails exactly those 17 tests, and with `soakMs` 0 it passes again
  (2026-10-01). It adds about 10.5 s to `npm run verify` with 2 workers. Approved by the
  Director, 2026-10-01. A problem later than about 1.5 s after navigation is still unseen by the
  smoke run.
- When the test ends, the fixture lets every open page hand over the events it has already sent,
  with a 2 s cap. It then classifies each problem, attaches `page-problems.json` (unexpected, and
  allowed with the entry that allowed it), and fails the test on anything unexpected.

**The API specs use.**

- `test.use({ expectNotFoundDocument: true })` declares that the test asks for a page that does
  not exist. Only then does the allow-list let through the 404 of that page and Chromium's
  console error for it. A 404 for anything else still fails.
- `problemGuard.watch(context)` covers a context the test makes itself with
  `browser.newContext()`. The web-vitals spec does this for every cold load.
- `problemGuard.problems()` is a read-only copy of what has been collected, so a test can wait
  for a problem it causes on purpose (the self-test does).

**The allow-list** (`ALLOWED` in `tests/e2e/problems.ts`). Each entry has an `id`, a `reason`,
an owning team and an `until`: `permanent`, the last day it applies, or an https issue link.

- An empty reason, an unknown owner, a repeated id, a malformed `until` or an expired date stops
  the whole run before any test starts. `npm run test` fails on it too.
- Every entry is reviewed at each phase exit.
- Four entries today, all qa-lead's and permanent:
  - `not-found-page-status`: the 404 answer of a page that a test declared it asks for.
  - `not-found-page-console`: Chromium's console error for that same page URL. It moved here
    from build-lead's `isOwnDocument404`.
  - `software-webgl-notice`: Chromium's warning that WebGL fell back to its software renderer
    without `--enable-unsafe-swiftshader`, in the wording of Chromium 141 and of its current
    source. The e2e projects pass that flag, so it should not appear; build-lead saw it from a
    browser launched without the flag.
  - `gpu-readpixels-stall-notice`: ANGLE's "GPU stall due to ReadPixels" performance warning,
    which Chromium logs as a "GL Driver Message" when it reads a WebGL canvas back on
    SwiftShader, in its two exact forms. The e2e browsers render WebGL with SwiftShader here as in
    CI, and a draw-only WebGL page that never calls `readPixels` gets it too.

  Both warning entries came from build-lead's proposal (2026-10-01), which named the NVIDIA
  driver; QA's probe showed the renderer is SwiftShader (QA-P0-034). Each matches the whole text,
  only for `console.warning`, and only when the message's location is the page's own URL, which
  is how Chromium attributes both notices (48 of 48). CI's ubuntu runners passed with these two
  entries (run 36973853810, 2026-10-02). A new variant fails the run, and QA decides whether it
  is the environment or the app.

**Enforcement and self-tests** (Vitest, so `npm run verify` runs them):

- `tests/harness/spec-imports.test.ts` is the rule the plan asked of a lint rule. ESLint's
  config is build-lead's, so the rule is a unit test instead. It checks that every
  `*.spec.ts` and `*.selftest.ts` under `tests/`:
  - imports `test` from the fixture;
  - never imports values from `@playwright/test` (an inline `type` import still loads it at run
    time, so only `import type` is allowed);
  - calls `problemGuard.watch()` if it calls `newContext()`.

  The rule is itself tested on sample sources.
- `tests/harness/problems.test.ts` unit-tests the rules and checks that `ALLOWED` is valid
  today.
- `tests/harness/guard.test.ts` runs `tests/harness/guard/guard.selftest.ts` in Chromium, with
  its own config and made-up origins served by routes. It then checks each outcome and each
  cause:

  | Self-test | Expected | Kinds the fixture reports |
  |---|---|---|
  | a clean page | passes | none |
  | `console.error` | fails | console.error |
  | a console warning | fails | console.warning |
  | ANGLE's ReadPixels notice, logged by the page itself | passes | none; allowed |
  | the same notice from a script file | fails | console.warning |
  | any other GL driver message | fails | console.warning |
  | an uncaught error | fails | pageerror |
  | an unhandled rejection, Error or string reason | fails | pageerror, unhandledrejection |
  | a same-origin 404 image | fails | console.error, http-error |
  | a same-origin request that fails (`route.abort('failed')`) | fails | console.error, requestfailed |
  | a same-origin 500 from `fetch` | fails | console.error, http-error |
  | a third-party 404 | fails | console.error only |
  | a request aborted by navigating away | passes | none |
  | a page that answers 404, not declared | fails | console.error, http-error |
  | the same page, declared | passes | none; both allowed |
  | a 404 image on a declared 404 page | fails | console.error, http-error; the page's own 404 allowed |
  | an uncaught error in a worker | fails | pageerror |
  | `console.error` in a worker | fails | console.error |
  | `console.error` in a popup | fails | console.error |
  | a page crash (its renderer killed with SIGKILL) | fails | crash |
  | a context the test makes itself, watched | fails | console.error |

  Tests the fixture must fail are marked `test.fail()`, and each first waits for its own problem
  to be recorded. A fixture that stops recording a kind therefore still ends that test as an
  expected failure, because the wait times out. The checker is what catches it: for every case it
  compares the kinds the fixture reported, and whether the fixture itself failed the test, with
  the table above (shown by mutation on 2026-10-02, QA-P0-035). When a case ends with the wrong
  outcome, the checker prints that case's own errors. The 22 cases take about 2 s on the home PC.
- **How the crash case crashes the page** (fixed 2026-09-30, after it failed on GitHub):
  - It finds the renderer through the browser's DevTools session (`SystemInfo.getProcessInfo`)
    and kills it with SIGKILL, as the out-of-memory killer does.
  - Chromium reports a killed renderer through the same `Inspector.targetCrashed` event as any
    other renderer crash, and Playwright turns that into the page's `crash` event.
  - It waits at most 10 s for that event. Otherwise it fails with the renderer's process state
    and the kernel's `core_pattern`, instead of timing out.
  - The first version used CDP `Page.crash`, which makes the renderer trap (SIGTRAP) and dump
    core. GitHub's ubuntu-24.04 runners install `systemd-coredump`, so `core_pattern` pipes
    every core to it. For a piped `core_pattern` the kernel ignores `ulimit -c 0` and keeps the
    crashing process alive until the handler has read the whole dump.
  - So the crash was reported long after the test gave up: 46 s on GitHub.
  - It was reproduced in C with a piped handler and uid 1001: the dump took 42 s, and the same
    assertion failed. SIGKILL never dumps core, and under the same conditions all 19 cases pass
    in 3 s.
- **Mutation M1** (`console.error` in `src/main.tsx`): `npm run verify` exited 1. 110 e2e tests
  failed, each with the message, its source file and the page. The 2 tests that open no page
  passed.

## 14. Defects and severity

| Severity | Meaning | Rig Lab examples |
|---|---|---|
| **Blocker** | The phase stays open and the change cannot merge | **Wrong data:** a spec that disagrees with the manufacturer; a benchmark with the wrong conditions; a price the capture does not show; a converted price shown as an observation; frame-gen mixed into native fps. **Owner's rule 1:** a price from an archive, cache, snippet, tracker or aggregator; a wrong `retrievedAt`; a price with no capture; an archived benchmark missing `url`, `archiveUrl` or `publishedAt`, or with a snapshot before `publishedAt`. **A compatibility false negative:** `ok` for DDR4 on AM5, or for a 360 mm radiator in a 280 mm case. **A crash:** an uncaught error, a white screen, a route that does not load directly with 200, lost WebGL context with no recovery. **A budget miss:** any gate in `budget.json`. **Any** console error or unhandled rejection in a test. A WCAG 2.1 AA failure on non-3D UI. A number on screen with no source. An estimate without its range, confidence or "estimated" label. A golden anchor outside ±5%, or a held-out error over 10% |
| **Major** | Fix it, or the Director defers it in writing with an owner and a date, before the phase closes | A compatibility false positive (a compatible part blocked); `ok` where `warn` belongs (a missing EXPO note); a spec left null that the source publishes; an unverifiable source with no `archiveUrl`; a flaky test; a visual layout break at one width; performance within budget but more than 10% worse than the last phase; a slow single interaction (≥ 200 ms) while INP still passes; screen-reader output that is confusing but not an AA failure |
| **Minor** | Fix when convenient; tracked | Cosmetic misalignment below the visual threshold; a typo; a console warning that the e2e run cannot see (the run itself fails on any other, §13.2); price drift found on a re-check; a documentation gap |

**Defect record** (in the phase report, and sent to the owning lead):

```
### QA-P<phase>-<nnn>: <short title>
Severity: Blocker | Major | Minor · Owner: <lead> · Found: <date>, env <C|CI|REF-…>, commit <sha>
Bar or rule: <budget.json key | BUILD_PROMPT § | rule id | acceptance criterion>
Steps to reproduce: 1. … 2. … 3. …
Expected: …
Actual: …
Evidence: artifacts/screenshots/<phase>/<task>/<file>.png · <log path> · <source URL>
Status: open → fixed in <sha> → verified by QA on <date>   (or: deferred by the Director on <date>, reason)
```

QA re-tests every fix on the integration branch before closing the defect.

## 15. Entry and exit criteria per phase

| Phase | QA can start verifying when | The phase can close when |
|---|---|---|
| 0 Foundations | WP-D0, WP-B0, WP-DS0 and WP-Q0 are accepted by the Director and merged into the integration branch; `npm run verify` passes on its head; WP-Q1's budget jobs are merged and blocking | `docs/qa/report-phase-0.md` is published. Every plan §5 criterion passes, or is waived in writing. 0 open Blockers. The seeded 10% audit of the seed data has no unresolved mismatch. R1 checks pass on 100% of price and benchmark rows. P1, P2 and P4–P7 pass on the integration head. axe is clean on the empty routes, and the smoke has zero console errors |
| 1 Engine | Per work package, as each lands (phase-1-plan §4): QA has reviewed WP-E0's result types; the engine is merged with its coverage report; the golden test is generated from the anchors; the dump's query mode covers the WP's entry point | 100% coverage on `src/engine/**` (vitest thresholds). compat-trace exits 0 for all 20 rule ids, every validator proof included (§9.3). The corpus gives no `ok` and the sweep holds (§9.4). The mutation check passes (§9.5). Every golden case passes within ±5% in its own source context, golden-count passes with the engine's estimates, and every conflicting pair's range holds both values (§8.1). At least 20 held-out results, 4 per class, each within 10%, and the calibration check passes (§8.2). Every rule, anchor source, power constant and bottleneck verdict has passed its own QA worker (§17). The seeded 10% audit is done (§7). The lab has no console errors or warnings, is axe-clean in both themes at all three widths, and stays in the JS budget; the product pages' initial JS stays within 2 KB of 77.92 KB gzip |
| 2 Builder UI | The builder flows exist behind real data, and the frozen catalogue snapshot exists | §12.2 flows pass at 390 and 1440. axe is clean on every route and state in six cells. The keyboard path passes. Visual baselines are approved in six cells. INP < 200 ms at x1 and x4. LCP, CLS and Lighthouse still pass. The provenance check passes. The usability pilot has run |
| 3 3D garage | The garage exposes the perf contract, and `tests/perf/fps-scenarios.json` exists | Reference runs **PASS**: ≥ 60 fps on REF-LAPTOP and ≥ 120 fps on REF-DESKTOP, committed in `docs/qa/perf-runs/`. The CI proxy is calibrated. Initial JS < 250 KB with three.js lazy. The progressive-streaming checks (P3) pass. The canvas has a name and a text alternative, and auto-rotation can pause. WebGL context loss recovers |
| 4 Results and Buy Sheet | The dashboard, bottleneck page and Buy Sheet are merged | Provenance passes on results, bottleneck and buy. The share URL round-trips, including fixtures from every earlier codec version. The print view is checked. SAR/USD are observations only. The bottleneck verdict text is covered by tests |
| 5 Polish and release | Feature freeze | A full regression over the matrix. Every §8 bar green, the fps bars on reference hardware. The D1 usability gate is met (5 participants). Screen-reader checks pass. `docs/qa/report-phase-5.md` is green, and the Director signs `docs/reports/release-v1.md` |

## 16. Change log

| Date | Version | Change | Approved by |
|---|---|---|---|
| 2026-09-30 | 1 | First version (WP-Q0). QA proposals pending the Director's approval: the visual `maxDiffPixelRatio` of 0.001, the viewport heights, `fps.maxRunSpreadPct` of 15%, the D1 pass rule (4 of 5 participants and the median under 5 minutes), the 95% bundle warning, and INP gated at x4 as well as x1 | — |
| 2026-09-30 | 1.1 | The six WP-Q0 proposals approved, as written in v1: `visual.maxDiffPixelRatio` 0.001; viewport heights 390×844, 768×1024 and 1440×900; `fps.maxRunSpreadPct` 15%; the D1 rule (at least 4 of 5 testers finish unaided in under 5 minutes, and the median is under 5); the 95% bundle warning; INP gated at CPU x4 as well as x1, where x4 runs that spread by more than 15% are INCONCLUSIVE, not FAIL. Recorded in `budget.json` sources (`definitionOfDone.minFinishingUnaided`, `.maxMedianMinutes`, `webVitals.gates.inpMs.maxRunSpreadPct`) with no gate value changed | Approved by: Director, 2026-09-30 |
| 2026-09-30 | 2 | WP-Q1 as built: §4, §5, §6.3 finding, §6.4, §10.1, §11, §12.1, §13.2 and Appendix B. Two method changes, with no threshold changed: web vitals also measures at 390 px (`webVitals.viewports`), and the gated CLS counts shifts that Chromium flags as recent input on loads with no input (§6.4) | pending the Director's WP-Q1 review |
| 2026-10-01 | 3 | WP-Q2, found on the home PC (§6.3, §6.4, §6.5, §7.2, §7.5). Method changes, with no gate value changed: web vitals watches each load for at least `webVitals.minObserveMs` (5 s) of page time, so late LCP and late shifts can fail the gate (§6.4, QA-P0-004); a headless reference fps run is INVALID (§6.5, QA-P0-003); the Lighthouse preview port is derived per checkout (§6.3). New tools: `tests/audit/strata.mjs` (§7.2) and `tests/audit/rule1.mjs` (§7.5) | Approved by: Director, 2026-10-01 (minObserveMs and the headless rule) |
| 2026-10-01 | 3.1 | WP-Q2: a 1 s soak per route in the dark 1440 smoke project (`console.soakMs`, `console.soakViewports`), so a late error or rejection fails (§13.2, QA-P0-005). Dark and light e2e projects at every width, with axe in all six cells on PR as §5 always planned (§5). `budget.test.mjs` pins the median-of-3 run counts, the per-rule test minimums, `minObserveMs` and the soak. The LCP blind spots documented, and their fix deferred (§6.1, QA-P0-006) | Approved by: Director, 2026-10-01 (the soak; QA-P0-006 deferred to Phase 2 entry, owner qa-lead) |
| 2026-10-02 | 3.2 | WP-Q2: console warnings fail the e2e run like errors (`console.maxConsoleWarnings` 0, §13.2), with two allow-list entries for the browser's software-WebGL notice and the GPU driver's ReadPixels note, from build-lead's proposal. `budget.test.mjs` pins it. The unused-preload warning the gate cannot see is recorded (QA-P0-017). No §8 number changed | Approved by: Director, 2026-10-01 (`progress.md`, WP-Q2 next step 4) |
| 2026-10-02 | 3.3 | WP-Q2: fixes from the independent check of v3.2, QA-P0-032 to 037. Both warning entries match the whole notice and only from the page itself, and the ReadPixels notice is attributed to ANGLE on SwiftShader, not a GPU driver (§13.2). The self-test table and how the checker catches a broken fixture (§13.2). Seven more method values pinned, and the web-vitals spec refuses an empty plan. D10's environment and blocks columns (§3.2). No gate value changed | qa-lead; no approval needed (no gate or method changed) |
| 2026-10-02 | 3.4 | WP-Q2: from the re-test of v3.3, QA-P0-038 to 040. The software-WebGL entry takes only the two prefixes Chromium's GPU logger writes, and §13.2 states the page-URL limit exactly: inline scripts and inline event handlers, even ones a script file sets. The remaining approved method values pinned (visual thresholds, viewport sizes and flags, scale, gzip level and bytes per KB, the 95% warning, fps spread and calibration, the CI proxy, INP spread and rates, the model, D1 and audit values). Two §13.2 slips | qa-lead; no approval needed (no gate or method changed) |
| 2026-10-02 | 4 | WP-Q3, Phase 1. The 20 rule ids agreed with build-lead, with their outcomes and their numeric and unknown-data flags (§9.1, §9.2), and their trace: compat-trace with `compat-rules.json`, the validator proofs of the unknown-data ruling, and the check of the engine's `RuleSpec` (§9.3). Golden tests in each anchor's own source context, the golden-count check and the conflicting-pairs check (§8.1). The held-out protocol: at least 20 results, 4 per class, blind picks committed before one run, the eligibility and mix rules, and the calibration check (§8.2); `models.heldOutCount` 20, with `heldOutPerClassMin` 4 and `heldOutClasses`, pinned. The corpus format and the sweep invariants (§9.4). The mutation-test check (§9.5). The Phase 1 audit seed (§7.2). The independent checks of phase-1-plan §4 (§17 and `docs/qa/phase-1-worker-briefs.md`). The Phase 1 wiring (Appendix C). `rule1.mjs` reads WP-D1's per-batch price windows (§7.5) | The held-out count and classes: Hazem, 2026-10-02 (phase-1-plan §6.3). The unknown-data ruling and the golden source context: the Director, 2026-10-02 (`9f47477`). The rest: pending the Director's review of WP-Q3 |
| 2026-10-02 | 4.1 | The Director's acceptance of WP-Q3 (`9d56356`): QA's v4 method proposals approved as written (the held-out mix rules, a corpus result milder than expected as a Major, Stryker reasons of at least 20 characters, the sweep severities). "No estimate" fails a held-out result only on an eligible pick, so §8.2's rule 4 now says outright that a pick for a game or workload without anchors there is ineligible | Approved by: Director, 2026-10-02 (`7f3382f`) |

## 17. Phase 1 independent checks

phase-1-plan §4 fans the verification out to fresh QA workers. Each worker's brief, with its
inputs, steps, evidence and pass rule, is in `docs/qa/phase-1-worker-briefs.md`. Rules for all of
them:

- **Fresh and independent.** One new worker per item, never the author of the work, with no shared
  context. Workers never read the engine's code. They read the catalogue, the sources, and the
  engine's output from the dump's query mode or the lab.
- **Expectations first.** A worker writes its expected results from the makers' or the publishers'
  sources, and qa-lead commits that file before the worker sees any engine output. The commit
  proves the order.
- **Evidence** is JSON under `artifacts/qa/phase-1/<check>/<item>/`, with a SHA-256 manifest.
  Third-party captures stay under `artifacts/` and are cited by path and SHA-256, never committed.
- **Defects** go to the owning lead in the §14 format. The committed expectations re-test the fix.
- **At most 4 workers at once**, and no more than 3 of them with a browser (briefs, "This PC").
  Each batch ends with a commit (CLAUDE.md rule 12).

| Check (plan §4) | Workers | When | Passes when |
|---|---|---|---|
| A. Each compatibility rule | 1 per rule: 20 | As each rule hands off, 4 at a time | Each real combination tried matches its expected result. The reason names the right parts, numbers and units, and the source links open the right page. The boundary and unknown-data cases behave as specified |
| B. Known incompatibilities and the sweep | 1 | After WP-E1 | The corpus gives no `ok`, and S1 to S15 hold (§9.4) |
| C. Each anchor source: the data | 1 per source review; a review of more than about 50 rows is split | After each WP-D2 batch the Director accepts | Every row's value and test conditions match the source (§7.3) |
| D. Each anchor: the model | None: it runs in CI | Every PR | golden-count passes, with the engine's estimates, and the conflicting pairs hold (§8.1) |
| E. Held-out results | 1 or 2 pickers, and 1 checker | After the engine freeze | §8.2 |
| F. Power constants | 1 | After WP-E2 | Every constant matches its source, every derivation is recomputed, and each card maker's recommended PSU falls in the range, or the hand-off explains the difference |
| G. Bottleneck verdicts | 1 | After WP-E5 | For 20 builds that QA picks, each sentence matches the model's numbers, and each rebalanced build passes the rules and the 5% price limit |
| H. 10% of all numbers | 2 or 3 | Wave 4, with the Phase 1 seed (§7.2) | §7 |
| I. The lab pages (WP-Q4) | an e2e-tester and a perf-tester | As the lab pages land | No console errors or warnings; axe clean in both themes at all three widths; the lab marked internal, not indexed and out of the nav; the engine and the catalogue loaded only on lab pages; the JS budgets hold |

Today's 143 anchors, by source, for check C: ComputerBase's "Gaming-Grafikkarten 2026 im Test",
page 4 (48 rows) and page 5 (32 rows); TechPowerUp's Ryzen 7 9850X3D review, page 18 (36 rows);
TechPowerUp's Ryzen 7 9800X3D review, page 9 (18 rows); Blender Open Data 5.2.0 (9 rows).

---

## Appendix A. Report template

Copy this to `docs/qa/report-phase-N.md`.

```markdown
# QA report: Phase N (<name>)

Status: OPEN | CLOSED · Date: <YYYY-MM-DD> · QA: qa-lead
Integration commit verified: <full sha> · CI run: <URL> · Environments: C, CI, REF-LAPTOP, …
Tool versions: Node <v>, @playwright/test 1.56.1 (Chromium 1194), @lhci/cli 0.15.1, …

## Verdict
<CLOSED or OPEN>, <n> Blockers, <n> Majors, <n> Minors. <One sentence on what decides it.>

## 1. Acceptance criteria
| WP | # | Criterion (short) | Result | Evidence |
|---|---|---|---|---|
| WP-D0 | 1 | … | PASS / FAIL / BLOCKED / WAIVED (by whom, where) | <path or link> |

## 2. Measured numbers
| Bar | Gate (budget.json key) | Measured | Runs and aggregation | Env | Result |
|---|---|---|---|---|---|
| Initial JS | bundle.initialJs.maxGzipBytes < 250,000 B | … B | exact | CI | PASS |

## 3. Data audit
Seed: rig-lab-audit:phase-N:<sha> · Algorithm: sha256-rank-v1 · Tool commit: <sha>
| Stratum | Population | Fingerprint | Sample |
|---|---|---|---|
Field results (one row per field of each sampled record):
| Record | Field | Value | Source (url, archiveUrl) | Found | Outcome |
|---|---|---|---|---|---|
Owner's rule 1 (all rows): prices <n> checked, <n> failed (by check id); gap records <n>; benchmarks <n>
Price drift: …

## 4. Model tests
Golden: <n> anchors, <n> within ±5%. Held-out:
| Result | Source | Published | Model range | Midpoint | Error | In range? |
|---|---|---|---|---|---|---|

## 5. Compatibility traceability
<matrix from artifacts/qa/compat-trace, or "not in scope this phase">

## 6. Accessibility
axe: <routes × states × cells>, <n> violations. Keyboard path: … Screen readers: <reader, browser, version>: …

## 7. Visual regression
<baseline count, diffs, approvals>

## 8. Console and page errors
<n> tests, <n> problems, allow-list entries in force: …

## 9. Open defects
| Id | Severity | Title | Owner | Status |
|---|---|---|---|---|
<then one defect record per defect, format in test-plan §14>

## 10. Waivers and known gaps

## 11. Sign-off
QA: <date>. Director: <date, or pending>.
```

## Appendix B. Wave-2 wiring (WP-Q1)

**Applied in WP-Q1 (2026-09-30)** under the Director's time-boxed write lock on `package.json`
and `.github/workflows/ci.yml`. Where the result differs from the text below:

- The projects are named per width: `e2e-390`, `e2e-768`, `e2e-1440`, then `perf`, then
  `visual-390`, `visual-768`, `visual-1440`. `"e2e"` is therefore
  `playwright test --project=e2e-*`, not `--project=chromium`. Since WP-Q2 the e2e projects are
  per width and theme (`e2e-390-dark` … `e2e-1440-light`, §5); the pattern still matches.
- The web-vitals step in `ci.yml` is named "Web vitals, LCP and CLS at 390 and 1440 px, CPU x1
  and x4", not as in B.4 below, because WP-Q1 added the 390 px run (§6.4).
- The `perf` project records no trace (§6.4), and mobile projects trace without DOM snapshots.
- In the `budgets` job, every measuring step runs once the build has succeeded, even after an
  earlier step fails (`if: ${{ !cancelled() && steps.build.outcome == 'success' }}`). One run
  then shows every miss, and any miss still fails the job.
- `package-lock.json` changed only by the three new packages. No existing package's version,
  flags or integrity changed.

build-lead has already merged these in WP-B0:

- Vitest collects `tests/**/*.test.{ts,mts,mjs}` and excludes `*.spec.*` and the fixtures.
- ESLint and Prettier ignore `tests/perf/fixtures/`, `artifacts/` and `.lighthouseci/`.
- `.lighthouseci/` is git-ignored.
- Plain-JS test files get browser and Node globals.

**B.1 `package.json`: devDependencies (exact pins)**

```json
"@axe-core/playwright": "4.13.0",
"@lhci/cli": "0.15.1",
"web-vitals": "6.2.2"
```

**B.2 `package.json`: scripts**

```json
"perf:bundle": "node tests/perf/bundle-budget.mjs --all-html --json artifacts/perf/bundle-budget.json",
"perf:lhci": "lhci autorun",
"perf:lhci:desktop": "lhci autorun --config=./lighthouserc.desktop.cjs",
"perf:vitals": "playwright test --project=perf --workers=1",
"perf:fps": "node tests/perf/fps-probe.mjs",
"audit:sample": "node tests/audit/sample.mjs"
```

Also change `"e2e"` to `"playwright test --project=chromium"`, so the full e2e run does not run
the perf project in parallel. `e2e:smoke` is unchanged, because the perf spec has no `@smoke` tag.

**B.3 `playwright.config.ts`: a `perf` project** (qa-lead owns the file from wave 2):

```ts
projects: [
  { name: 'chromium', testDir: 'tests/e2e', use: { /* unchanged */ } },
  {
    name: 'perf',
    testDir: 'tests/perf',
    testMatch: /.*\.spec\.ts$/,
    fullyParallel: false,
    use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
  },
],
```

The existing `use.baseURL` and `webServer` (the production preview) serve both projects.

**B.4 `.github/workflows/ci.yml`: a new job**

```yaml
  budgets:
    name: Performance budgets
    needs: verify
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false

      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci

      # The Chromium build that matches the pinned @playwright/test (1.56.1).
      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      # Lighthouse uses the same Chromium 1194 as the tests, not the runner's Google Chrome.
      - name: Point Lighthouse at Playwright's Chromium
        run: echo "CHROME_PATH=$(node -e "console.log(require('@playwright/test').chromium.executablePath())")" >> "$GITHUB_ENV"

      - run: npm run build

      - name: Initial JS budget (BUILD_PROMPT §8)
        run: npm run perf:bundle

      - name: Lighthouse CI, mobile
        run: npm run perf:lhci

      - name: Lighthouse CI, desktop
        run: npm run perf:lhci:desktop

      - name: Web vitals, LCP and CLS at CPU x1 and x4
        run: npm run perf:vitals

      - name: Upload budget reports
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: performance-budgets
          path: |
            artifacts/perf/
            artifacts/lhci/
            playwright-report/
            test-results/
          retention-days: 14
          if-no-files-found: ignore
```

**B.5 Hazem, in GitHub settings.** Mark `npm run verify` and `Performance budgets` as required
status checks on `main`.

**B.6 Before WP-Q1 hands off,** run `npm run verify` and each new script in C, and attach the
logs.

## Appendix C. Phase 1 wiring

build-lead owns `package.json` and `.github/workflows/ci.yml`. This is QA's request, applied as each
work package lands, and QA re-runs each check on the merged result.

**C.1 The Vitest JSON report.** In `package.json`, `test:coverage` becomes:

```json
"test:coverage": "vitest run --coverage --reporter=default --reporter=json --outputFile.json=artifacts/test/vitest-report.json"
```

Tested with Vitest 5.0.3 on 2026-10-02: the console output is the same, and the report is written.
With coverage on, the report also carries the coverage map.

**C.2 Scripts.**

```json
"audit:compat-trace": "node tests/audit/compat-trace.mjs --registry artifacts/engine/rules.json --vitest artifacts/test/vitest-report.json",
"audit:golden": "node tests/audit/golden-count.mjs --vitest artifacts/test/vitest-report.json"
```

- `artifacts/engine/rules.json` is the dump's `RuleSpec` list. Its file name is the one agreed with
  build-lead in WP-E0.
- During WP-E1, `audit:compat-trace` adds `--allow-pending <the ids not built yet>`. A rule comes
  off the list in the commit that adds it.
- Until WP-E4 lands, `audit:golden` adds `--anchors data/benchmarks/game.json`. Once the dump
  writes the golden estimates, it also adds `--estimates artifacts/engine/golden-estimates.json`.

**C.3 `verify`.** The two checks run after the unit tests and the engine dump, and before the
build:

```json
"verify": "npm run typecheck && npm run lint && npm run test:coverage && npm run engine:dump && npm run audit:compat-trace && npm run audit:golden && npm run build && npm run e2e:smoke"
```

- `audit:compat-trace` joins with WP-E1's first rule, and `audit:golden` with WP-E3.
- The corpus and the sweep (§9.4) join at WP-E1's hand-off, as QA scripts on the dump's output. QA
  sends the exact line then.

**C.4 CI.** `ci.yml` already runs `npm run verify`, so its steps don't change. When a step fails, it
should upload `artifacts/test/`, `artifacts/engine/` and `artifacts/qa/compat-trace/`, so a red run
shows the trace matrix and the dump.
