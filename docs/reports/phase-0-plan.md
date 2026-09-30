# Phase 0 — Kick-off plan

Date: 2026-09-30 · Owner: Director · Status: in progress

Phase goal (BUILD_PROMPT §2): foundations, no product UI. Four teams work in parallel, QA verifies
every accepted item independently, and the Director closes the phase in `docs/reports/phase-0.md`.

## Owner's rules for Phase 0 (Hazem, 2026-09-30)

These override anything below that says otherwise.

1. **Archived pages are allowed for specs and benchmarks, never for prices.**
   - A price must come from a **live retailer product page** fetched during the batch. There are no
     exceptions.
   - Its `retrievedAt` is the UTC date of that live fetch, never a date copied from the page or
     from an earlier capture.
   - Keep a capture of each page (screenshot or saved HTML) under `artifacts/` as audit evidence.
   - If the live page is blocked or shows no price, the price stays missing and gets a gap record.
   - Archives, caches, search snippets, price trackers and aggregators are never price sources.
   - **Benchmarks** may come from an archived copy of a published review, because a review's
     numbers don't change after publication (amended by Hazem, 2026-09-30). Every benchmark row
     records the review's original publish date (`publishedAt`). A row read from an archive also
     keeps the review's original `url` and adds the `archiveUrl`.
2. **Hazem picks the design direction.** The Director reviews the three directions, then shows them
   to Hazem with screenshots and a recommendation. Hazem makes the final pick.

## Agent teams: tested 2026-09-30, not available

- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set in this environment.
- The only spawn path is the `Agent` tool, and its `team_name` parameter is ignored (documented as
  deprecated). No team-creation tool exists.
- An explicit spawn named `qa-lead`, of type `qa-lead`, with `team_name: rig-lab`, launched with no
  error. It launched as a named, messageable **background subagent**: `ListAgents` lists every agent
  under "Subagents" and has no Teammates section. The new agent also took over the name `qa-lead`
  from the earlier instance, which is now addressable only by its agent ID.
- The test spawn's own capability report adds four facts:
  - A lead-type subagent has **no `Agent` tool**, so it **cannot spawn workers**. It also has no
    `ListAgents`, `TaskList` or `TaskUpdate`.
  - `SendMessage` works both ways: a lead can reach the Director at `main`, and the Director can
    reach a lead by name or agent ID.
  - A lead's run ends when it hands back. A `SendMessage` to it by name resumes it with its context.
  - When two agents share a name, the latest spawn takes it, and the earlier one is reachable only
    by its agent ID.
- Phase 0 therefore runs under the **BUILD_PROMPT §1 fallback**:
  - one lead-type subagent per work package, which **does its team's work itself** and reviews its
    own output;
  - then a **fresh** `qa-lead` subagent verifies independently;
  - then the Director reviews.
  The independent QA step is never skipped. The task list is the Director's.
- Container quirks for every spawn:
  - An isolated worktree is created from the old commit `a2c7ca9`, so it must be fast-forwarded to
    the integration branch before any work (`git merge --ff-only claude/keen-lamport-0794zj`).
  - The worktree guard refuses complex compound `git` commands. Run plain git commands, one per
    call, from inside the worktree.

---

## 1. Branches and merging

- This session can push only `claude/keen-lamport-0794zj`. That branch is the **integration branch**
  for Phase 0.
  - Director-accepted work is merged into it, so the teams can build on each other's work and QA
    can verify everything in one place.
  - `main` gets the phase only after Director acceptance **and** a green QA report (WP-Q2), as
    CLAUDE.md requires. Hazem does that merge (PR on request).
  - Nothing goes to `main` from this session, so GitHub Pages does not deploy yet.
- Each lead works in its own git worktree on a local branch:
  `feat/data-foundations`, `feat/build-scaffold`, `feat/design-direction`, `feat/qa-foundations`.
  Feature branches are **never pushed**. The Director merges accepted branches into the integration
  branch with `git merge --no-ff` and pushes it.
- To pick up accepted work from other teams, run `git merge claude/keen-lamport-0794zj` in your worktree.
- Workers do not run git write commands. The lead reviews, then commits.
- Commit message: `<team>: <what>`, ending with these two trailer lines:

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01ETfjPtJNMrx5HQNzy9SfWS
  ```

## 2. File ownership in Phase 0 (extends CLAUDE.md)

| Path | Owner |
|---|---|
| `src/data/**`, `data/**`, `CREDITS.md` dataset rows | data-lead |
| `package.json`, `package-lock.json`, root tool configs (vite, tsconfig\*, eslint, vitest, prettier), `index.html`, `public/**` (except `public/models/**`), `.github/workflows/**`, new files in `scripts/**`, `.gitignore`, `README.md`, `src/main.tsx`, `src/app/**`, `src/components/**`, `src/state/**`, `src/engine/**`, `src/three/**` | build-lead |
| `playwright.config.ts`, `tests/e2e/smoke.spec.ts` | build-lead in wave 1 (minimal smoke only), then **qa-lead from wave 2** |
| All other `tests/**`, `docs/qa/**`, `lighthouserc.*` | qa-lead |
| `docs/design/**`, `src/styles/**` | design-lead |
| `docs/reports/**`, `BUILD_PROMPT.md`, `CLAUDE.md`, `scripts/verify-gate.sh`, `.claude/**` | Director |

In wave 2 the Director gives qa-lead a time-boxed write lock on `package.json` (scripts and
devDependencies) and `.github/workflows/ci.yml`, announced by message, while build-lead is idle.
Need a change in a file you don't own? Message its owner. Never edit it yourself.

## 3. Waves

| Wave | Work packages | Starts when |
|---|---|---|
| 1 | WP-D0 data · WP-B0 build · WP-DS0 design · WP-Q0 QA plan and budget tooling | now, in parallel |
| 2 | WP-Q1 Playwright set-up and budget checks in CI · data-lead re-validates on the real harness | WP-B0 accepted and merged |
| 3 | Director reviews the three directions and shows them to Hazem with screenshots and a recommendation; **Hazem picks** → WP-DS1 tokens · WP-Q2 independent verification → `docs/qa/report-phase-0.md` · Director writes `docs/reports/phase-0.md` | wave 1 accepted |

## 4. Director's architecture calls (binding for all teams)

1. **The catalogue never ships in the initial bundle.** Data is split into files by category (and
   prices by market, benchmarks by kind), so the app can lazy-load each file. The landing route
   imports no catalogue data.
2. **GPUs are modelled at two levels.** A *GPU chip* (e.g. GeForce RTX 5070 Ti) holds the
   performance identity: architecture, shaders, VRAM size, type and bus, reference TBP and clocks,
   PCIe gen and **lane count** (x16 or x8 matters on PCIe 3.0/4.0 boards), upscaler and frame-gen
   support. A *GPU card* (a retail SKU, e.g. an ASUS TUF model) holds everything physical: length,
   height, thickness in slots, power connectors, card TBP, recommended PSU, outputs, factory clock.
   Benchmarks reference chips and record the card that was tested. Clearance checks use cards.
3. **Every number links to its source** (DoD §9). Records carry
   `sources: [{url, publisher, retrievedAt, archiveUrl?, fields?}]`. `fields` lists what a source
   backs. If it is omitted, the source covers the whole record. The validator fails any non-null
   spec value that no source covers.
4. **Unpublished means `null` plus a note.** Never guess, never interpolate specs.
5. **Units live in field names** (`lengthMm`, `tbpW`, `boostClockMhz`, `speedMtps`, `readMBps`).
   IDs are kebab-case, globally unique, and stable, because share URLs depend on them.
6. **Prices are observations, never conversions.** `{partId, market: SA|US, currency: SAR|USD,
   amount, retailer, url, inStock, isMarketplace, retrievedAt}`. Prices come only from live retailer
   pages (Owner's rule 1). A missing price stays missing and is recorded as a gap:
   `{partId, market, reason, retailersTried, checkedAt}`. That lets the UI say "no price found in SA
   as of <date>", and lets QA audit the gaps.
7. **Frame generation is never mixed with native numbers,** neither in data nor in the model.
8. **Routes** (empty in Phase 0), from one typed route table: `/`, `/build/:step` for the 12 steps
   in §2 order (use-case, budget, cpu, motherboard, ram, gpu, storage, psu, cooling, case, looks,
   review), `/results`, `/bottleneck`, `/buy`, `/sources`, plus a 404. The build lives in the URL
   query (`?b=…`), versioned, so shared links survive schema changes.
9. **GitHub Pages base path is `/Rip-PC/`.** Every known route must load directly with HTTP 200,
   with no redirect hop.
10. **Playwright is pinned to `@playwright/test@1.56.1`.** It matches the Chromium bundled in this
    container (build 1194), so local runs and CI use the same browser build and visual baselines
    stay stable. Upgrade on purpose later, never by accident.

## 5. Work packages and acceptance criteria

### WP-D0 — Data foundations (data-lead) · `feat/data-foundations`
1. Zod schemas in `src/data/schema/` for: common (source ref, market, currency, dates),
   source registry, CPU, motherboard, RAM, GPU chip, GPU card, storage, PSU, cooler, case, case fan,
   price, game, game benchmark anchor, creator benchmark anchor. Every §4 required field is present,
   and types are exported via `z.infer`.
2. The validator enforces:
   - source coverage for every non-null spec value;
   - every publisher is in the registry;
   - a spec record whose only sources are retailers is rejected;
   - unique kebab-case IDs and valid references (prices, benchmarks and cards point at real IDs;
     lane-sharing rules point at real slot IDs);
   - currency matches market;
   - `retrievedAt` is not in the future;
   - sanity rules (threads ≥ cores, boost ≥ base, and similar).
3. Seed data: real, currently or recently sold, specs from the manufacturer:
   - **CPUs ≥ 8** across AM5, AM4, LGA1851 and LGA1700.
   - **Motherboards ≥ 6**: at least one per socket above, plus at least one mATX and one Mini-ITX.
     Each has M.2/SATA/PCIe **lane-sharing rules taken from the manual**, and the **minimum BIOS
     version per CPU family**.
   - **RAM ≥ 5**: DDR5 and DDR4, both tall and low-profile.
   - **GPU chips ≥ 8** across NVIDIA, AMD and Intel, with **GPU cards ≥ 8**.
   - **Storage ≥ 5**: PCIe 5.0, PCIe 4.0 with DRAM, PCIe 4.0 DRAM-less, and SATA.
   - **PSUs ≥ 5**, including ATX 3.1 with native 12V-2x6, and one SFX.
   - **Coolers ≥ 5**: tall air, low-profile air, and an AIO mix of 240/280/360.
   - **Cases ≥ 5**: at least two ATX mid-towers, one mATX, one Mini-ITX.
   - **Case fans ≥ 3**.
4. Prices: SA (SAR) and US (USD) attempted for every seed part, **from live retailer pages only**
   (Owner's rule 1), each with a capture under `artifacts/`.
   - Every missing price has a gap record, and the hand-off lists the gaps per market.
   - The validator rejects any price that has an `archiveUrl`, a publisher that isn't a retailer,
     or a `retrievedAt` outside the batch window.
5. Benchmarks, from live publisher pages or archived copies of published reviews (Owner's rule 1).
   Every row records `publishedAt`. An archived row keeps the original `url` and adds `archiveUrl`.
   The validator rejects:
   - an archived row with no `publishedAt`;
   - a row whose `url` is itself an archive link;
   - a snapshot dated before the review's `publishedAt`.

   Minimums:
   - **≥ 30 game anchor rows** from **≥ 2 publishers**, with full test conditions. Cover both
     GPU-bound (1440p/4K) and CPU-bound (1080p, top GPU) conditions.
   - **≥ 6 creator anchors** (Blender Open Data and Cinebench R24).
   - Conflicts above 10% are kept and flagged. The hand-off includes a coverage matrix.
6. Games list: each of the 15 titles is confirmed or replaced, with dated player-count sources.
   The current Call of Duty and EA Sports FC titles are named as of today.
7. `src/data/README.md` covers the layout, conventions, how to add a part, and how validation works.
   `CREDITS.md` dataset rows are updated.
8. Validation runs as Vitest tests under `src/data/**`. After WP-B0 lands, `npm run verify` passes
   on the branch.
9. Hand-off includes the data-lead's own audit of a random 20% sample per batch, with results.

### WP-B0 — Scaffold, CI, deploy, harness, empty routes (build-lead) · `feat/build-scaffold`
1. Vite + React 19 + TypeScript `strict` (plus `noUncheckedIndexedAccess`) + Tailwind v4, on current
   stable releases. The TypeScript version is chosen to work with typescript-eslint (TS 7 is
   current; pin what the toolchain supports and say why). Check every API with Context7.
2. All §7 dependencies are installed. three, R3F, drei and postprocessing are reachable **only**
   through a lazy chunk.
3. Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:coverage`, `e2e`,
   `e2e:smoke`, and `verify` (typecheck + lint + unit + build + e2e smoke).
4. Empty routes per §4.8, each with a unique `<h1>` and a `<main>` landmark. Semantic HTML only:
   no visual design until the direction is chosen.
5. GitHub Pages works with base `/Rip-PC/`: every known route returns 200 when loaded directly, and
   an unknown path shows the app's 404 view. The `?b=` query survives navigation.
6. State skeleton: a Zustand store for selections, plus a versioned, Zod-validated URL codec with
   round-trip tests.
7. CI:
   - `ci.yml` runs on push and PR (`npm ci` → `verify`, cache, Playwright report uploaded on failure).
   - `deploy.yml` runs on push to `main` and manual dispatch (build → `upload-pages-artifact` →
     `deploy-pages`), with least-privilege permissions and a concurrency group.
   - `actionlint` is clean.
8. Harness: Vitest (node environment for engine and data, coverage config ready for the Phase 1
   100% engine target). Minimal Playwright smoke: every route returns 200, shows its `<h1>`, and
   produces zero console errors and zero page errors.
9. Initial JS for `/` measured at under 250 KB gzip. The 3D chunk is reported separately.
10. No `any`, lint clean, zero console errors. `README.md` covers the commands and the Pages set-up
    step Hazem must do.
11. Evidence: `verify` log, build size table, screenshots of `/` and one `/build/<step>` at
    390/768/1440, `actionlint` output.

### WP-DS0 — Design direction (design-lead) · `feat/design-direction`
1. Reference study of the §6 list, with Playwright screenshots and pattern notes: what to learn,
   what to avoid. Sites that block headless browsers are studied through Wayback Machine snapshots,
   and the doc says so. Committed screenshots are downscaled (≤ 1600 px wide, ≤ 300 KB) and carry
   URL, capture date and "design study only; trademarks belong to their owners".
2. `docs/design/direction.md` with **three genuinely distinct directions**. Each covers:
   - thesis;
   - dark-first palette plus light, with measured contrast ratios (AA);
   - typefaces that are free for commercial web use (licence named) — paid fonts need Hazem;
   - type scale with tabular numerals;
   - layout at 1440/768/390, with the 3D view always visible on desktop;
   - key components: part row, compatibility badge (ok/warn/block with its reason), price with
     as-of date and source, FPS range with confidence, step nav, live total;
   - motion language with a reduced-motion variant;
   - iconography (no emoji);
   - risks.
3. One static HTML mock per direction of the CPU step (`docs/design/mocks/<slug>/index.html`), with
   screenshots at 1440 dark, 390 dark and 1440 light. Real product names only; values labelled
   illustrative.
4. None of the rejection-on-sight patterns: purple gradients, centred hero with three cards,
   default shadcn, emoji.
5. A recommendation with reasons. The Director shows the three directions to Hazem with screenshots
   and a recommendation, and Hazem makes the final pick. Each direction therefore needs a one-screen
   summary (thesis plus its three mock screenshots) that can be compared side by side.
6. 3D asset survey (`docs/design/3d-asset-survey.md`): candidate CC0/CC-BY models for case, board,
   GPU, RAM, cooler and fans, with licence, author, URL, quality and poly notes, and fitness.
   Nothing is downloaded into the repo yet.

### WP-Q0 — Test plan and budget tooling (qa-lead) · `feat/qa-foundations`
1. `docs/qa/test-plan.md` covers every §8 bar and the §9 definition of done. For each: method,
   tool, threshold, environment, frequency and owner. It also covers:
   - the viewport × theme matrix;
   - the data audit protocol (seeded 10% sample, fields compared, fallback-source rules);
   - golden and held-out model tests;
   - positive and negative tests for every compatibility rule;
   - accessibility (axe plus the keyboard path);
   - the visual regression method (pinned Chromium, fonts, animations frozen, thresholds);
   - performance method (median of 3 runs, a CPU-throttled run, what CI can and cannot measure,
     and a manual protocol for the Core Ultra 7 155H reference laptop);
   - enforcement of zero console errors and zero unhandled rejections;
   - severity levels, entry and exit criteria per phase, and the report template.
2. `tests/perf/budget.json` is the single source of truth for the §8 numbers.
3. Bundle budget checker: initial JS gzip, computed from `dist/index.html` entry, static imports
   and modulepreloads, with lazy chunks reported separately. Unit-tested on a fixture.
4. Lighthouse CI config with assertions: performance ≥ 0.90, LCP < 2500 ms, CLS < 0.05, and TBT as
   the lab proxy for INP.
5. A Playwright web-vitals spec for LCP and CLS. INP is added once Phase 2 has interactions.
6. A written wiring list (scripts and CI job YAML) for wave 2. It is not applied in wave 1.

### WP-Q1 — Playwright set-up and budget checks in CI (qa-lead, wave 2)
1. Takes ownership of `playwright.config.ts` and the smoke spec. Adds projects at 390/768/1440, a
   fixture that fails any test on a console error or unhandled rejection, an axe check on every
   route, and the visual-baseline scaffolding (baselines come once the design exists).
2. The budget checks run in CI and block: the bundle budget on every push and PR, and Lighthouse
   CI against the built preview.

### WP-DS1 — Tokens for the chosen direction (design-lead, wave 3)
`src/styles/tokens.css` (with the Tailwind v4 `@theme` mapping) for dark and light, AA-verified, plus
`docs/design/tokens.md`.

### WP-Q2 — Independent verification (qa-lead, wave 3)
`docs/qa/report-phase-0.md`: pass/fail for every criterion above, the numbers measured, the
data-auditor's seeded 10% sample of the seed data, and open defects with severity. It includes a
compliance check of every price and benchmark against Owner's rule 1.

## 6. Hand-off format (lead → Director)

```
## <WP id> — <title>
Status: ready for review
Branch: feat/<team>-<topic> @ <sha>   (git diff --stat against claude/keen-lamport-0794zj)
What changed: <files>
Evidence: <absolute screenshot paths / test log / source links / measured numbers>
Known gaps: <honest list, or "none">
```

## 7. Environment notes (this container)

- Node 22.22 and npm 10.9. Global `playwright@1.56.1` with bundled Chromium at `/opt/pw-browsers`
  (`PLAYWRIGHT_BROWSERS_PATH` is set). Never run `playwright install` here. CI installs its own.
- The Playwright MCP server does not start here: it wants the Chrome channel. Drive the browser
  from a script instead: `NODE_PATH=/opt/node22/lib/node_modules node script.cjs`, using
  `require('playwright').chromium`.
- Chromium trusts the egress proxy CA through the NSS database. A fresh container needs
  `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n ccr-agent-proxy -i /root/.ccr/agent-proxy-ca.crt`
  (package `libnss3-tools`). Never disable TLS verification.
- Context7 MCP works. Use it before writing against any library API.
- Reachable from a headless browser on 2026-09-30:
  - Manufacturers: amd.com, intel.com (browser only), nvidia.com, asus.com, asrock.com,
    seasonic.com, bequiet.com, fractal-design.com, deepcool.com, gskill.com, westerndigital.com,
    nzxt.com, arctic.de (curl).
  - Benchmarks and trackers: opendata.blender.org, tomshardware.com, gamersnexus.net,
    hardwareunboxed.com, pugetsystems.com, steamcharts.com.
  - Retailers: newegg.com, amazon.com, jarir.com, extra.com.
  - Design references: apple.com, linear.app, vercel.com, stripe.com, raycast.com, porsche.com.
  - Archive: web.archive.org.
- Blocked by the sites' own bot protection: msi.com, gigabyte.com, corsair.com, crucial.com,
  kingston.com, semiconductor.samsung.com, thermalright.com, noctua.at, techpowerup.com (after a few
  requests), steamdb.info, pcpartpicker.com, tesla.com, microcenter.com, bestbuy.com.
  - **Never try to get around bot protection:** no stealth plugins, no captcha solving, no
    user-agent games.
  - Allowed fallbacks for **specs**, in order: the WebFetch tool, a Wayback Machine snapshot (keep
    the canonical `url` and add `archiveUrl`), the official PDF manual or datasheet, or a reachable
    manufacturer instead.
  - **Prices never use archives** (Owner's rule 1). A blocked retailer means a missing price with a
    gap record.
  - **Benchmarks may use an archived copy of a published review**, for example TechPowerUp through
    the Wayback Machine. Keep the original review `url`, add `archiveUrl`, and record `publishedAt`.
  - Be polite: one request at a time per host, and cache captures under `artifacts/` (git-ignored).
    Never commit third-party page captures.
- 4 CPUs and 15 GB RAM are shared by every team. Run at most 3 workers at once per lead and one
  browser per worker, and close browsers when done.
