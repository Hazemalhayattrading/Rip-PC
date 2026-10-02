# Phase 0 — Hand-off at the end of day 1

Date: 2026-09-30 (UTC) · Author: Director · Phase 0 status: **open**

Today's session ran in a Claude Code cloud container. Tomorrow's continues on Hazem's Windows PC
in a local Claude Code session. Everything from today is on the integration branch
`claude/keen-lamport-0794zj`: accepted work is merged; unreviewed work in progress and all evidence
are preserved as files under `docs/reports/phase-0-wip/`. **Nothing was merged to `main`.**

---

## 1. Where everything is

| What | Where | State |
|---|---|---|
| Accepted work (WP-B0, WP-Q0, WP-DS0, WP-Q1) | merged into `claude/keen-lamport-0794zj` | CI green |
| data-lead's work in progress (WP-D0) | `docs/reports/phase-0-wip/feat-data-foundations.bundle` → branch `feat/data-foundations` @ `527f345` | not reviewed; `npm run verify` passes |
| design-lead's work in progress (WP-DS1) | `docs/reports/phase-0-wip/feat-design-tokens.bundle` → branch `feat/design-tokens` @ `d59bd40` | not reviewed; `npm run verify` passes |
| Evidence from every team (git-ignored `artifacts/` folders) and the session scratchpad | `docs/reports/phase-0-wip/evidence/*.tar.xz.part-*` | 6 archives, 222 MB compressed |
| Checksums of all bundles and archive parts | `docs/reports/phase-0-wip/SHA256SUMS.txt` | 11 files |
| What was deliberately not kept, and why | `docs/reports/phase-0-wip/EXCLUDED.txt` | recreatable items only |
| The plan, rules and decisions | `docs/reports/phase-0-plan.md` | current |

A git bundle is a single file holding a branch and its history. The WIP stays out of the
integration branch's code because it has not been through Director review. Restoring it is one
command (§7, step 2). Both bundles were verified, and a restore from a fresh clone of the
integration branch was rehearsed today; it brought back both branches at the exact commits.

The evidence archives hold every file of each team's `artifacts/` folder: price-page captures,
spec and benchmark captures, games-list captures, audit samples, test logs, Lighthouse and axe
reports and screenshots. data-lead's archive has 1,167 of its 1,168 evidence files. The one left out
is listed in `EXCLUDED.txt` with its source URL, because it embeds a third party's AWS key ID. Each
archive was test-extracted and its file count matched the source.

---

## 2. Work package status

| WP | Owner | Status | Evidence |
|---|---|---|---|
| WP-B0 Scaffold, CI, Pages deploy, harness, empty routes | build-lead | **Done, accepted** (merge `c612eed`) | verify green; initial JS 77.4 KB gzip of 250 KB; 3D chunk lazy; CI run 36759748232 |
| WP-Q0 Test plan and budget tooling | qa-lead | **Done, accepted** (merge `aff5383`) | `docs/qa/test-plan.md`, `tests/perf/budget.json`, bundle checker; CI run 36763038560 |
| WP-DS0 Reference study and three directions | design-lead | **Done, accepted** (merge `139c873`); Hazem picked C, Studio | `docs/design/direction.md`, mocks and board |
| WP-Q1 Playwright set-up and budget checks in CI | qa-lead | **Done, accepted** (merge `0fdc265`, fix `6dcb01e`) | CI run 36780787432: `npm run verify` and `Performance budgets` both green |
| WP-D0 Data foundations | data-lead | **In progress** (bundle, `527f345`) | see below |
| WP-DS1 Tokens for Studio | design-lead | **In progress** (bundle, `d59bd40`) | see below |
| WP-B1 Wire the tokens and small build follow-ups | build-lead | **Not started** | §7, step 6 |
| WP-Q2 Independent Phase 0 verification | a fresh qa-lead | **Not started** | §7, step 8 |
| Phase 0 report `docs/reports/phase-0.md` | Director | **Not started** | §7, step 9 |

### WP-D0: where data-lead stopped

Its own status file travels with the branch: `data/WIP-STATUS.md`.

**Done:**
- Zod schemas, the validator and 79 data tests.
- Seed data: CPU 16, motherboards 7, RAM 6, GPU chips 11, GPU cards 10, storage 5, PSU 5,
  coolers 5, cases 5, case fans 3. All 7 required compatibility cases are tested.
- Live prices:
  - US: 52 prices and 10 gap records.
  - SA: 45 prices and 17 gap records.
  - Each price has one capture, with its SHA-256.
- 116 game anchors: ComputerBase, 80 live rows; TechPowerUp, 36 archived rows.
- 27 creator anchors: TechPowerUp Cinebench 2024, 18 archived rows; Blender Open Data, 9 live rows.
- The games list: 15 titles, including Black Ops 7 and EA SPORTS FC 27.
- `src/data/README.md` and the CREDITS data rows.

**Left:**
- Finish the seeded 20% audit (seed 20260930). Still to check: 10 TechPowerUp game rows, 6 creator
  rows and 3 games. Specs, prices and ComputerBase rows are done, and their findings are fixed.
- A README rule for listings filed under a reseller brand.
- Price runner: give every capture a unique name. Some rejected captures were overwritten; the
  run logs still record those decisions.
- The plan §6 hand-off.

**Category-id mismatch, to route to build-lead:** `src/state/categories.ts` uses `gpu`; the data uses
`gpu-chip` and `gpu-card`.

### WP-DS1: where design-lead stopped

Its own status file travels with the branch: `docs/design/WIP-STATUS.md`.

**Done:**
- `src/styles/tokens.css` with the Tailwind v4 `@theme` mapping, plus `base.css` (Preflight on,
  with restorations) and `motion.ts`.
- 93 token tests, which compile with Tailwind 4.3.3.
- The AA contrast check passes in dark and light.
- The Studio mock now carries the correct BIOS warning, and every size was re-shot.

**Partial: the font.**
- Rig Lab Sans, a renamed Mona Sans subset: 72,332 bytes, reproducible, with OFL and FONTLOG.
- **Blocker, 3 attempts:** the fallback face's size-adjust. Headless Linux Chromium lays out fonts
  with integer-pixel advances, so browser widths can't calibrate it. The HarfBuzz method is
  written but has not been run. `tokens.css` holds a provisional 102.03%.

**Not started:**
- `docs/design/tokens.md`
- recording the pick in `direction.md`
- `docs/design/studio-3d-brief.md`
- the section on the expert "Specs" dense view

**A correction to the record:** the wrong BIOS state (9800X3D shown as supported while the 9600X
warned) was in the **Bench** mock. Studio had no BIOS check. Bench and Folio keep the old text as
history.

---

## 3. CI

- **Open failures: none.** Run 36780787432 on `6dcb01e` is green:
  - `npm run verify`: a 70 s step; 266 unit tests and 112 e2e tests.
  - `Performance budgets`: the bundle budget, Lighthouse CI on mobile and desktop, and LCP/CLS at
    390 and 1440 px at CPU x1 and x4.
- **Fixed today.** Runs 36776443554 and 36776760337 failed on one test, the console fixture's crash
  self-test.
  - Cause: GitHub's ubuntu-24.04 image pipes core dumps to `systemd-coredump`. CDP `Page.crash`
    (SIGTRAP) therefore kept the renderer alive for about 42 s, and the case timed out outside the
    fixture.
  - Fix: kill the renderer with SIGKILL, which writes no core dump, and fail with a diagnostic if no
    crash event arrives within 10 s.
  - The failure was reproduced locally before the fix, and the test is not weakened.
- The commits added tonight change only docs, `.gitattributes` and `docs/reports/phase-0-wip/`, so
  CI should stay green. Check the run on the last commit tomorrow.

---

## 4. Decisions

### Made by Hazem

1. **Owner's rule 1** (plan, top).
   - Prices come only from live retailer pages. `retrievedAt` is the date of the live fetch, and
     every price keeps a capture of the page.
   - A blocked or missing price stays missing, with a gap record.
   - Archives, caches, snippets and price trackers are never price sources.
   - Specs may use archived pages.
   - **Amended:** benchmarks may use archived copies of published reviews. Each such row keeps the
     original `url`, the `archiveUrl` and `publishedAt`.
2. **Owner's rule 2: Hazem picks the design direction.** He picked **C, Studio** on 2026-09-30.
   The Director had recommended B, Folio. Studio's risks, which the plan carries:
   - it depends on 3D quality, and there are no faithful free models of current parts;
   - it has the highest laptop-GPU cost;
   - it shows weakly until the 3D exists.
3. **Agent teams test.** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` was set, but in the cloud a named
   spawn launched as a background subagent, and subagents cannot spawn workers. Phase 0 therefore
   ran under the BUILD_PROMPT §1 fallback. Hazem asked for agent teams if they work, so retest them
   locally (§7, step 3).
4. **Golden rule 11, "No rabbit holes"**, added to CLAUDE.md today.
5. **Stop for the day.** Continue on the home PC, and do not merge to `main`.

### Made by the Director, within its remit

- **Architecture calls (plan §4):**
  - no catalogue data in the initial bundle;
  - the GPU chip/card split;
  - every number carries its source;
  - base path `/Rip-PC/`;
  - Playwright pinned to 1.56.1.
- **build-lead deviations, accepted:**
  - TypeScript 6.0.3, because typescript-eslint does not support TS 7;
  - wouter as the router, at +2.5 KB;
  - per-route `build/cpu.html` files. Pages answers 301 for a folder without a trailing slash;
    this was checked against a live Pages site.
  - Tailwind Preflight off until the tokens exist.
- **QA proposals:**
  - Approved all six: visual diff 0.001; viewport heights 844, 1024 and 900; the 15% fps
    run-spread rule; the usability pass rule, 4 of 5 testers in under 5 minutes; the 95% bundle
    warning; INP gated at CPU x4 as well as x1.
  - Approved two CLS method changes: web vitals at 390 px, and counting flagged shifts on loads
    that have no input.
  - Kept axe at all three widths, even though it makes `verify` slower.
- **Work in progress preserved as bundles, not merged,** because it is unreviewed.

---

## 5. Open items that need Hazem

- **Before the first deploy:** Settings → Pages → Build and deployment → Source: **GitHub Actions**.
- **Branch protection on `main`:** make `npm run verify` and `Performance budgets` required checks.
- **Evidence in the public repo.** `docs/reports/phase-0-wip/evidence/` holds 222 MB of compressed
  captures of third-party pages (retailers, manufacturers, reviews, reference sites). You asked that
  nothing stay only in the container. Before anything merges to `main`, decide whether to move it to
  private storage and purge it from git history.
- **The design decision page is out of date.** It still shows the board from before the decision:
  https://claude.ai/artifact/FvxRVeaogAAUwYr8dvF8bF (private to you).
- **Later, not now:**
  - options and costs for paid 3D models, before Phase 3;
  - a run on a real Core Ultra 7 155H laptop for the 60 fps gate;
  - five first-time testers for the usability pass.

---

## 6. Environment quirks

### Cloud container (today): explains the evidence, not needed at home

- **Worktrees started from the wrong commit.** Isolated worktrees were created from the old commit
  `a2c7ca9` and had to be fast-forwarded before work.
- **Chromium and the egress proxy.** Chromium did not trust the proxy CA until it was added to the
  NSS database (`certutil`).
- **The Playwright MCP server did not start.** It wants the Chrome channel, so Playwright was
  scripted directly.
- **Bot protection.** These sites block automated access and were never worked around:
  - MSI, Gigabyte, Corsair, Crucial, Kingston, Samsung, Thermalright and Noctua;
  - TechPowerUp and PCPartPicker;
  - Tesla, Micro Center and Best Buy;
  - noon.com, Guru3D, tracker.gg and epicgames.com.
  Wayback was used for specs and archived reviews only, as rule 1 allows.
- **Context7** hit its monthly quota mid-day. The leads checked APIs against the official docs and
  the installed package sources.
- **No `Agent` tool in lead subagents.** Leads did their workers' tasks themselves.
- **The worktree guard refused compound git commands.** Run plain git commands, one per call.
- **Headless Chromium quirks:**
  - CLS flags layout shifts as caused by input under mobile emulation, even with no input;
  - web fonts get integer-pixel advances;
  - rAF is capped at 60 Hz;
  - SwiftShader fps is not a real GPU number.
- **GitHub's runner pipes core dumps to `systemd-coredump`.** Crash-style tests must use SIGKILL.

### Home PC (Windows)

- **Symlinks.** `.claude/skills/*` are 45 symlinks into `.agents/skills/`. Git for Windows checks
  symlinks out as small text files unless symlink support is on, and then Claude Code will not find
  the project skills. Enable Windows Developer Mode, then clone with `-c core.symlinks=true`
  (§7, step 1).
- **Line endings.** `.gitattributes`, added today, keeps LF on every platform. Without it, Git for
  Windows' CRLF checkout fails Prettier, and with it `npm run verify`.
- **Node:** 22.22.2 (`.nvmrc`), with npm 10.
- **Playwright** stays pinned to `@playwright/test` 1.56.1. Run `npx playwright install chromium` once.
- **Chrome:** the Playwright MCP in `.mcp.json` uses installed Chrome, which is right for a PC with
  Chrome. Lighthouse CI finds installed Chrome on its own; `CHROME_PATH` is only needed in
  containers and CI.
- **The hook** in `.claude/settings.json` runs `bash scripts/verify-gate.sh`. It needs Git Bash,
  which Claude Code on Windows uses.
- **Visual baselines** are made only in the pinned Docker image (`tests/visual/run-in-docker.sh`),
  which needs Docker Desktop. Never create baselines on Windows directly.
- **Leftover container notes.** README and docs mention `/opt/pw-browsers` and container worktree
  paths only as notes about the cloud container. No config depends on them.

---

## 7. Exact next steps, in order

1. **Clone and set up**, in Git Bash, after turning on Windows Developer Mode:

   ```bash
   git clone -c core.symlinks=true --branch claude/keen-lamport-0794zj https://github.com/Hazemalhayattrading/Rip-PC.git
   cd Rip-PC
   npm ci
   npx playwright install chromium
   npm run verify
   ```

2. **Restore the work in progress and the evidence:**

   ```bash
   git fetch docs/reports/phase-0-wip/feat-data-foundations.bundle feat/data-foundations:feat/data-foundations
   git fetch docs/reports/phase-0-wip/feat-design-tokens.bundle feat/design-tokens:feat/design-tokens
   (cd docs/reports/phase-0-wip && sha256sum -c SHA256SUMS.txt)
   mkdir -p ../rig-lab-evidence
   for a in data-lead-artifacts design-lead-artifacts qa-q1-artifacts qa-q0-artifacts build-lead-artifacts session-scratchpad; do
     mkdir -p ../rig-lab-evidence/$a
     cat docs/reports/phase-0-wip/evidence/$a.tar.xz.part-* | tar -xJf - -C ../rig-lab-evidence/$a
   done
   ```

   Each archive holds an `artifacts/` folder, except the scratchpad archive. When a team's worktree
   exists again, copy its `artifacts/` into that worktree's root. For example, data-lead's price
   captures must sit at `artifacts/prices/...`, because the price rows point at those paths and
   their SHA-256.

3. **Retest agent teams locally,** the same way as today:
   - Spawn **one** named teammate. `ListAgents` must list it as a teammate, not under "Subagents".
   - Check that it can spawn one worker.
   - If both work, run the rest of Phase 0 as a team with the four named leads.
   - If not, keep the §1 fallback.

4. **data-lead continues WP-D0 on `feat/data-foundations`.** Work from `data/WIP-STATUS.md`:
   - finish the 20% audit;
   - add the README reseller rule;
   - give price captures unique names;
   - hand off in the plan §6 format.
   The Director reviews, then merges with `--no-ff` and pushes.

5. **design-lead continues WP-DS1 on `feat/design-tokens`.** Work from `docs/design/WIP-STATUS.md`:
   - the HarfBuzz fallback calibration;
   - `tokens.md`, including the wiring notes: import `tokens.css` without a layer, font preload,
     `data-theme`;
   - `direction.md`: the pick, plus the known gaps;
   - `studio-3d-brief.md`, including an early real-dimension model for Phase 2 and paid-asset
     options for Hazem;
   - the Specs view section;
   - the CREDITS font row text in the hand-off. data-lead or the Director adds it once WP-D0 is
     merged.
   The Director reviews, then merges.

6. **WP-B1 for build-lead,** after WP-DS1:
   - wire `tokens.css`, the font preload and the theme attribute into the app shell;
   - align `src/state/categories.ts` with data-lead's ids (`gpu-chip`, `gpu-card`) before any share
     link is published, because v1 URL codes freeze then;
   - add the `perf:*` scripts to the README;
   - optionally, add an ESLint `no-restricted-imports` rule so specs take `test` from the shared
     fixture.

7. **QA:** once the tokens are wired, add dark and light projects for axe, and later for visual.

8. **WP-Q2:** a **fresh** qa-lead verifies every Phase 0 acceptance criterion into
   `docs/qa/report-phase-0.md`. It must cover:
   - the measured numbers;
   - the seeded 10% data audit;
   - the rule-1 compliance check on 100% of price and benchmark rows, using the restored captures.
   Any blocker keeps the phase open.

9. **Director:** write `docs/reports/phase-0.md`, then ask Hazem to merge to `main` with a PR. The
   deploy needs the Pages setting from §5.

10. **Clean up:** once the branches and evidence are restored, delete `docs/reports/phase-0-wip/` in
    a commit. Settle the history question in §5 before merging to `main`.
