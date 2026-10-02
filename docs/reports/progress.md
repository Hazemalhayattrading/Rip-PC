# Rig Lab — Progress

Owner: Director · Updated after every accepted task (CLAUDE.md rule 12).

**Last update:** 2026-10-02, Director. **Phase 1 (the engine) has started:**
- **The plan is approved.** Hazem approved `docs/reports/phase-1-plan.md` on 2026-10-02, with
  three answers in its §6:
  - the BIOS warning: warn, not block. It names the version needed, and tells the buyer to ask the
    retailer for an updated board.
  - both extra rules, so 20 in all;
  - at least 20 held-out results.
- **Phase 0 is merged to `main`.** Hazem merged PR #1 as `27dbc6e`. The Pages deploy passed, and
  the live site serves all 17 routes, with a 404 for unknown paths.
- **Wave 1 is running** (plan §5). The four leads work from `docs/reports/phase-1-briefs.md`, and
  their tasks are under "In progress" below.

> **Commit IDs** in this file are post-purge IDs. The old-to-new map is kept outside the public repo,
> at `C:\Projects\rig-lab-evidence\purge\purge-sha-map.txt`, because GitHub still serves pre-purge commits by ID until its garbage collection runs.

## How to continue after a stop

1. Read `CLAUDE.md`, `BUILD_PROMPT.md`, this file, `docs/reports/phase-1-plan.md` and
   `docs/reports/phase-1-briefs.md`.
2. Run `git worktree list` and `git branch -vv`. Each lead's latest state is in its status file,
   on its branch, in its worktree. The briefs name each one.
3. Re-spawn only the leads marked *in progress* in the table below. On 2026-10-02 all four are.
   - Use the `Agent` tool with `name` and `subagent_type` both set to the lead's name, and model
     `opus`.
   - The prompt: "You are <lead>, a teammate in the Rig Lab agent team. Read
     `C:\Projects\Rip-PC\docs\reports\phase-1-briefs.md`, sections 'All leads' and '<lead>', then
     the '<lead>' row of 'In progress' in `C:\Projects\Rip-PC\docs\reports\progress.md`. That row
     overrides your status file, which may be stale. Carry on from the exact next step it names.
     Don't redo finished steps. Report to `team-lead`."
   - The worktrees, their `node_modules` and their git-ignored `artifacts/` survive a restart, so
     no set-up is needed. Check `git -C <worktree> status` first.
4. Leads reach the Director at `team-lead`. Worker hand-backs reach the Director by mistake (a
   harness bug, see the briefs). Ignore them and wait for the lead's hand-off.

## Environment (home PC)

| Item | State |
|---|---|
| Checkout | `C:\Projects\Rip-PC`, branch `claude/keen-lamport-0794zj` (integration) |
| Worktrees | `C:\Projects\Rip-PC\.claude\worktrees\<lead>` (git-ignored). Phase 1 adds `data-lead-d2`, and later `build-lead-perf` |
| Restored evidence | `C:\Projects\rig-lab-evidence\`: 6 extracted folders and `archives\`. Listed by SHA-256 in `docs/reports/evidence/` (2,243 files); `sha256sum -c` passes |
| Toolchain | Node 24.21.0, npm 11.19.0 (the project asks for ^22.13.0; npm only warns); Playwright 1.56.1 Chromium installed; KTX-Software 4.4.2 (`toktx`, `ktx`) in `C:\Program Files\KTX-Software\bin`, on the user PATH |
| Git, local repo config | `core.symlinks=true` and `core.autocrlf=false` (the system git config has `autocrlf=true`, which broke LF on older branches) |
| Project skills | All 45 `.claude/skills/*` are real symlinks in every checkout and load (Developer Mode on since 2026-10-01) |
| Missing | Python, Docker |
| Agent teams | **Work.** Tested 2026-10-01, details in "Decisions" below |

## Done

| Date | What | Who | Evidence |
|---|---|---|---|
| 2026-09-30 | WP-B0, WP-Q0, WP-DS0 and WP-Q1 accepted and merged | build-lead, qa-lead, design-lead | `docs/reports/phase-0-handoff.md` §2 |
| 2026-10-01 | Golden rule 12 added to CLAUDE.md | Director | `a7db85b` |
| 2026-10-01 | CI run #7 checked: green. It ran on the pre-purge hand-off commit, now `ace0f54` | Director | [run 36782736442](https://github.com/Hazemalhayattrading/Rip-PC/actions/runs/36782736442): `npm run verify` and `Performance budgets` both pass |
| 2026-10-01 | Home PC set up: `npm ci`, Chromium, both WIP branches restored from their bundles, evidence extracted and checksum-verified | Director | `feat/data-foundations` @ `527f345`, `feat/design-tokens` @ `d59bd40`; `sha256sum -c` passes for all 11 files |
| 2026-10-01 | 365 files re-checked out with LF. They came from a `main` checkout made before `.gitattributes` existed, and Prettier failed on them | Director | `git ls-files --eol` shows 0 `w/crlf` |
| 2026-10-01 | Windows fix: spec paths compared with `/` in `tests/harness/spec-imports.test.ts` | Director (a one-liner that blocked everyone) | `0114261`; local verify 266 unit and 112 e2e pass, 45 s |
| 2026-10-01 | Agent teams tested: a teammate spawns, and it can spawn an unnamed worker | Director, data-lead | `ListAgents` shows "Teammates"; team `session-a9ce993b` |
| 2026-10-01 | The four leads spawned as teammates, with the briefs | Director | `ListAgents`: Teammates (4) |
| 2026-10-01 | Project skills restored: 45 real symlinks in all 5 checkouts. The skills load, and the leads were told which to use (briefs, "Skills") | Director | `git status` clean; the Skill tool lists all 45 |
| 2026-10-01 | Evidence moved off the branch tip. Archives copied byte-exact to `C:\Projects\rig-lab-evidence\archives\`; checksum manifests in `docs/reports/evidence/` | Director | `fed0f78`; both `sha256sum -c` checks pass |
| 2026-10-01 | Context7 check: no API key in any tracked or untracked repo file, nor in history. The keyless Context7 entry was dropped from `.mcp.json` so Hazem's user-level server (with his key) applies | Director | `0c30135`; `claude mcp get context7` shows "Scope: User config" |
| 2026-10-01 | **WP-B1 Part 1 accepted:** `gpu` → `gpu-card` (URL code `g` kept, test-first); README Windows and perf sections; ESLint `no-import-type-side-effects` | build-lead | **Merged as `c823146`**, with the README Context7 follow-up (`0330d67`). verify on the merged branch: 266 unit, 112 e2e. The probe shows 77.40 → 320.49 KB gzip without the rule |
| 2026-10-01 | **WP-DS1 accepted and merged** (`424107a`): `tokens.css` dark and light, AA (29 pairs, lowest 4.70:1), Rig Lab Sans (OFL) with its fallback calibrated to 103.14% (corpus width error 0.00%, swap CLS 0.0008), `tokens.md`, `studio-3d-brief.md`, `specs-view.md`, the pick in `direction.md` | design-lead | verify on the merged branch: 361 unit, 112 e2e; initial JS 77.42 KB gzip; the Director re-ran `contrast.mjs --check` (exit 0); parity shots in the design-lead worktree `artifacts/screenshots/phase-0/WP-DS1/` |
| 2026-10-01 | **WP-DS1 addendum accepted and merged** (`3b7f645`): `::selection` is solid `--stage` on `--ink` (16.75:1 or better on every surface, was 3.06:1); light `--ink-3` is `#5a5e64` (4.61:1 at the floor's near edge, was 4.08:1, QA DS0-01); `contrast.mjs` checks 34 pairs including both floor ends; tokens.md rule 4 (no text over the 3D scene); `docs/design/backlog.md` (41 items, WP-DS2 in Phase 1) | design-lead | the Director re-ran `contrast.mjs --check` (exit 0); verify on the merged branch: 455 unit, 112 e2e |
| 2026-10-01 | **Evidence purge done** (approved by Hazem): the 11 binary files (9 archive parts, 2 bundles) were removed from the history of all 5 branches; 87 commits rewritten; force-pushed with lease. The integration tip is now `4bbdc0a`. Tip contents byte-identical. Old → new map: kept locally (`C:\Projects\rig-lab-evidence\purge\purge-sha-map.txt`) | Director | a fresh mirror clone of GitHub holds 0 of 11 blobs (12 MB pack, was 236 MB); verify on the rewritten tip: 455 unit, 112 e2e; backup `C:\Projects\rig-lab-evidence\backup\rip-pc-all-refs-before-purge-2026-10-01.bundle` |
| 2026-10-01 | **WP-B1 Part 2 accepted and merged** (`91fa4b4`): tokens wired per tokens.md §1 (no-layer tokens.css, Preflight and base.css, font preload, `data-theme`, inline restore script); `theme.ts` test-first; the "Light theme" toggle; test files kept out of Tailwind's scan (CSS 3.3 KB gzip); a test that the build categories match data-lead's buyable categories. Director decision: keep the font preload in Phase 0, and in Phase 2 render the shell text into the static HTML, then re-measure with applied throttling | build-lead | verify on the merged branch: 480 unit, 112 e2e; initial JS 77.92 KB gzip (+506 B); LCP 44–160 ms, CLS 0; 12 screenshots in the build-lead worktree `artifacts/screenshots/phase-0/WP-B1/after/` |
| 2026-10-01 | Post-purge commit IDs in `data/audits.json` (4 `fixedIn` values) merged (`a3d88a8`). data-lead's Phase 0 work is closed | data-lead | each new ID checked against the map with an identical `git patch-id`; verify: 480 unit, 112 e2e |
| 2026-10-01 | **WP-B1 addendum merged** (`9286430`): R3F's THREE.Clock deprecation warning filtered through three's `setConsoleFunction` (QA-P0-001), in the lazy 3D chunk only, test-first. WP-B1 is closed | build-lead | 0 Clock warnings on `/build/cpu` (was 1 per load); verify 486 unit, 112 e2e; initial JS 77.92 KB gzip, unchanged |
| 2026-10-01 | WP-DS0 doc fixes from QA's review merged (`d3799da`): the Tesla waiver (DS0-11), KB = 1,000 B with the Bench image re-encoded (DS0-12), the 3D survey's CC BY author details (DS0-13), and backlog items 42–46. design-lead's Phase 0 work is closed | design-lead | verify 486 unit, 112 e2e |
| 2026-10-01 | **QA data fixes merged** (`1ade3f3`), QA-P0-008 to 012: the ASUS CPU-support URLs; case `size` derived by `deriveCaseSize`, with the new sourced `makerSizeClass`; radiator thickness limits from the Fractal user guides; Intel power profiles on the TPU rows; SA import-fee notes. Deferred to Phase 1 in writing: the North's drive-tray configurations as a structured model (until then the engine must not treat PSU rows as guarantees), and a radiator width field | data-lead | verify 489 unit, 112 e2e; 23 new evidence files checksummed (`docs/reports/evidence/data-lead-evidence-2026-10-01-qa-fixes.sha256`); QA re-verifies |
| 2026-10-01 | QA data follow-up merged (`cb188d4`): all 7 ASUS boards' CPU-support and BIOS sources checked (only the 2 already fixed were wrong), with a support-tab test; the delivery wording; the audit count (67 null OK). `origin/feat/data-qa-fixes` keeps 3 superseded, unmerged commits; 2fa3e32 (the structured Intel profile) is for Phase 1 | data-lead | verify 499 unit, 112 e2e; 23 more evidence files checksummed |
| 2026-10-02 | Resumed after the shutdown (rule 12): the state checked clean, and only qa-lead was re-spawned | Director | every branch equal to origin; CI green on `882a79f` |
| 2026-10-02 | Hazem filed the GitHub Support request, and fixed the `main` ruleset to `npm run verify` and `Performance budgets` (both from GitHub Actions) | Hazem; confirmed by the Director through the API | `3966db1`, `7774491` |
| 2026-10-02 | **WP-Q2 merged**: the warnings gate, axe in dark and light at every width, the per-route soak, the pinned method values, test plan v3.4 | qa-lead | `9eb3224`; verify 597 unit, 166 e2e |
| 2026-10-02 | **QA-P0-041 fixed and merged**: the audit seed string no longer embeds a pre-purge ID. The original string is kept in `C:\Projects\rig-lab-evidence\purge\audit-seed-2026-10-01.txt` | data-lead; verified by qa-lead | `2ec4811` |
| 2026-10-02 | **QA report committed**, verdict CLOSED: 0 Blockers, 0 open Majors, 15 open Minors. The Director committed qa-lead's text unchanged, with Hazem's approval, because the harness refuses report files from teammates | qa-lead (author); Director (commit) | `2361fc9` |
| 2026-10-02 | **Phase 0 report final; the Director signs off** | Director | `docs/reports/phase-0.md` §7 |
| 2026-10-02 | 7 merged branches deleted on origin, each with a lease | Director | origin heads: the integration branch, `main`, `feat/data-qa-fixes`, `feat/data-seed-wording`, and the old cloud branch |
| 2026-10-02 | 2fa3e32 (the structured Intel profile) parked for Phase 1 on `feat/data-intel-profile` (`d4e87e3`), not merged. `origin/feat/data-qa-fixes` and `origin/feat/data-seed-wording` deleted, each with a lease; their other commits were superseded by `17ba6b6` and `c9d4183`, and the local refs are kept | data-lead; Director | the patch-id equals 2fa3e32's; verify 597 unit, 166 e2e |
| 2026-10-02 | **Final scan of origin: clean.** 4 heads (the integration branch, `main`, the old cloud branch, `feat/data-intel-profile`), 0 tags, 0 pull refs, 0 of 11 purged blobs, and 0 files at any tip naming a pre-purge commit | qa-lead | `artifacts/qa/phase-0/audit/purge-recheck-2026-10-02-final/` in the QA worktree |
| 2026-10-02 | **Purge stage 3 run** (reflog expire, `gc --prune=now`): the local `.git` went from 236 MB to 13 MB, and the 11 blobs are gone from the local object store. The backup bundle still verifies, and `git fsck` passes | Director | `C:\Projects\rig-lab-evidence\purge\purge-3-cleanup.sh` |
| 2026-10-02 | All teammates stopped: Phase 0 work is complete | Director | `ListAgents` empty |
| 2026-10-02 | **PR #1 opened**, from the integration branch to `main`, with the Phase 0 summary. Both required checks pass, and GitHub reports it mergeable | Director | [PR #1](https://github.com/Hazemalhayattrading/Rip-PC/pull/1) at `53f52dd` |
| 2026-10-02 | **KTX-Software 4.4.2 installed**, with Hazem's approval: the official Khronos release, signature checked. gltf-transform's `etc1s` and `uastc` both write `KHR_texture_basisu`, and `ktx validate` passes | Director | a test GLB went from 8.75 KB to 2.53 KB (ETC1S) and 2.57 KB (UASTC) |
| 2026-10-02 | Hazem: paid 3D assets are decided later, before Phase 3 | Hazem | — |
| 2026-10-02 | **Phase 1 plan drafted** for Hazem's review | Director | `docs/reports/phase-1-plan.md` on `feat/director-phase-1-plan` |
| 2026-10-02 | **PR #1 merged by Hazem** with "Create a merge commit": `main` is `27dbc6e`. CI and the Pages deploy passed. The live site serves all 17 routes, an unknown path gets the 404 page, and the JS, CSS and font assets load | Hazem; checked by the Director | runs 37004293021 (CI) and 37004293041 (deploy) |
| 2026-10-02 | **Phase 1 plan approved** by Hazem, with three answers. The BIOS warning: warn, naming the BIOS version and telling the buyer to ask the retailer for an updated board. Both extra rules, `cooler-socket` and `display-output`, so 20 in all. At least 20 held-out results. The other defaults stand | Hazem | `docs/reports/phase-1-plan.md` §6 |
| 2026-10-02 | The integration branch fast-forwarded to `main` (`27dbc6e`), then merged the plan branch. `feat/director-phase-1-plan` deleted | Director | `385493f` |
| 2026-10-02 | **Phase 1 briefs written,** and the four leads spawned for wave 1 | Director | `docs/reports/phase-1-briefs.md` |
| 2026-10-02 | **WP-DS2 batch 1 accepted and merged** (`427d241`). It holds:<br>• `lab-spec.md`: five shared components;<br>• `copy-guide.md`: patterns for all 20 rules, and the BIOS warning to Hazem's §6;<br>• the `max-w-measure` token, test first;<br>• `tokens.md` rules for QA-P0-018 and 019, and backlog items 15 and 45 | design-lead | verify on the merged branch: 598 unit, 166 e2e. The lab mock has 0 axe violations at 390, 768 and 1440, dark and light. The Director checked the guide's 5 numbers against the catalogue, and 2 on the live maker pages (NZXT C1200 depth 160 mm; Fractal Pop Mini Air PSU max length 150 mm) |
| 2026-10-02 | data-lead set up both Phase 1 branches, from `c621c15`: `feat/data-engine-data` (D1) and `feat/data-benchmarks` (D2, in the new `worktrees/data-lead-d2`). The parked Intel profile `d4e87e3` is on the D1 branch as `755def5`, so `feat/data-intel-profile` is deleted on origin, with a lease. The local ref is kept | data-lead; Director | identical `git patch-id`; verify 597 unit, 166 e2e in both worktrees; no pre-purge IDs in the new commits |
| 2026-10-01 | **WP-D0 accepted and merged** (`c04e2a5`): Zod schemas, a validator with 34 rules, 73 seed spec records (all plan 5.3 minimums and mixes), live prices (US 52 + 10 gaps, SA 45 + 17 gaps), 116 game and 27 creator anchors, 15 games, the 20% audit (78 items, 8 findings fixed). The Director's review caught the North cooler limit (145 → 170 mm); data-lead's sweep caught the North PSU limit by tray count (schema: `psu.clearance` list) | data-lead | verify on the merged branch: 454 unit, 112 e2e; initial JS 77.42 KB gzip (no catalogue data in the bundle); 21 new evidence files copied and checked (`docs/reports/evidence/data-lead-evidence-2026-10-01.sha256`) |

## In progress

| Task | Who | Branch / worktree | State | Exact next step |
|---|---|---|---|---|
| WP-D1 Engine data, and WP-D2 Benchmark coverage | data-lead | `feat/data-engine-data` (`86e4e95`) in `worktrees/data-lead`; `feat/data-benchmarks` (`149cde7`) in `worktrees/data-lead-d2` | Wave 1. Step 1 (set-up) is done | D1 batch 1: the fixture table for the 20 rules, and the structured conditions. D2 batch 1 runs in parallel, starting with the 10 games that have no anchors |
| WP-E0 Engine foundations and the Engine lab | build-lead | `feat/build-engine-foundations` in `worktrees/build-lead` | Wave 1, started 2026-10-02 | Brief E0 steps 1 to 3: branch, check the APIs with Context7, then write the result types first, for review by qa-lead and design-lead |
| WP-DS2 Design backlog and engine copy | design-lead | `feat/design-ds2` in `worktrees/design-lead` | Batch 1 (the lab spec and the copy guide) merged as `427d241` | Batch 2: the 49 backlog items, closing item 38 and updating `studio-3d-brief.md`'s WebP assumptions, with the ui-designer and motion-designer. Then the wording reviews after E1, E3 and E5. QA checks the specs' AA claims in WP-Q4 |
| WP-Q3 Test plan v4 and verification tools | qa-lead | `feat/qa-phase1-plan` in `worktrees/qa-lead` | Wave 1, started 2026-10-02 | Brief Q3 steps 1 to 3: branch, review the result types when they arrive, and write test plan v4 (20 rules, at least 20 held-out results) |
| Live-site navigation report (Hazem, 2026-10-02): "Build" and "Start a build" seemed to stay on the home page; a direct load of `/Rip-PC/build/use-case` works | qa-lead after Q3 (part of WP-Q4); build-lead only if confirmed | — | **Director's triage: not reproduced** in headless Chromium against the live site. Both links navigate (URL, title and h1 change, and survive a reload) at Pixel 7 and 390 px by tap, and at 1440 and 1920 px by mouse. The link is the top element at its centre | qa-lead, after Q3's hand-off: test in real browsers (Chrome with the GPU on, Edge, and Firefox and WebKit through Playwright), mouse and touch, on the live site; rule out a stale CDN copy. If real: a defect to build-lead, a test-first fix, and a re-check on the live site after the deploy (plan WP-Q4) |

**Phase 0** is closed, and merged to `main` as `27dbc6e`. Its §5 backlog, QA's 15 open Minors included, is assigned in the Phase 1 plan.

## Next steps (Director)

On "continue":
1. **Review each hand-off** against plan §2: "Done, for every WP", and the WP's own "Done means".
   - Re-run verify, open the lab links, and re-check at least 2 rules or 5 numbers against their
     sources. Accept, or send it back with exact reasons.
   - On acceptance:
     - merge it `--no-ff` into the integration branch;
     - copy any new captures to `C:\Projects\rig-lab-evidence\`, and commit their manifest under
       `docs/reports/evidence/`;
     - update this file;
     - tell the leads who wait on it (plan §5).
2. **Wave 2 starts when E0 is accepted.** Tell build-lead to start E1 and E2. Tell qa-lead which
   rules are ready for its per-rule checks, as they hand off.
3. **Wave 3 starts when E0 and D2's first batch are accepted.** Tell build-lead to start E3 and E4.
4. **Milestone PRs to `main`,** for Hazem to merge:
   - M1, after E1 and E2 are accepted and QA-checked;
   - M2, after E3 and E4;
   - M3, at the phase exit.
5. **The engine freeze,** when E3 and E4 are accepted: record the engine commit here, and tell
   qa-lead to start the held-out run.
6. **After GitHub's reply** to the Support request: check that the old commit answers 404, on the
   API and on raw URLs, and record the result. Its ID is in
   `C:\Projects\rig-lab-evidence\purge\github-support-request.md`.

Branch-tidy record:
- **Deleted on origin, 2026-10-02,** each with a lease and each fully merged into the integration
  branch: `feat/build-tokens-wiring`, `feat/design-ds0-docs`, `feat/data-audit-ids`,
  `feat/data-foundations`, `feat/data-qa-fixes-2`, `feat/design-tokens` and
  `feat/qa-phase0-verification`.
  - Why: QA found the purge map, with all 87 pre-purge IDs, at two of their tips, and the old audit
    line at others, while GitHub still serves the old commits.
- **Kept for Phase 1:** the worktrees in `.claude/worktrees/`, with their `node_modules`. New
  branches are cut from the integration branch.
- **Accepted, not fixed:** pre-purge IDs remain in 15 commit messages and in older file versions
  in history. Hazem's Support request covers every orphaned commit from the one that added the
  archives onward, all 87.

## Evidence purge (approved by Hazem, 2026-10-01: purge now, the 2 bundles included). **Done**, stage 3 included (2026-10-02). Left: GitHub's reply

- **What:** remove 11 files from history: the 9 `.tar.xz` archive parts and the 2 git bundles under
  `docs/reports/phase-0-wip/`. The 3 text records stay in history; they moved to
  `docs/reports/evidence/` at the tip.
- **Range:** only commits that descend from the one commit that added them (its rewritten ID is `6e3f641`)
  (`--ancestry-path ^6e3f641^`), on the 5 branches: the integration branch and the 4 lead
  branches. 74 older commits carry SSH signatures, `main` among them; outside this range they
  keep their ids. Inside it, only `6e3f641` and `ace0f54` lose a signature.
- **Precondition:** every lead idle, clean and pushed. A lead's tip still holds the 11 files until
  it merges `fed0f78`, so rewriting under an active lead would let its next commit re-add them.
- **How it ran (2026-10-01):** qa-lead was blocked on 3 read-only audit workers that write only
  to its scratchpad, so it couldn't commit. The other three leads were idle or paused. Every tip
  had already merged `fed0f78`, so no worktree's files changed.
- **Scripts:** `C:\Projects\rig-lab-evidence\purge\`. The output is in `run\` there.
  - `purge-1-rewrite.sh`: pre-flight, a backup bundle, the rewrite, and verification. Ran clean:
    87 commits, every tip diff empty, 0 blobs reachable.
  - `purge-2-publish.sh`: the `--force-with-lease` pushes, the worktree sync, and dropping
    `refs/original`. Ran clean: all 5 pushed, origin matches, 0 blobs reachable from any ref.
  - `purge-3-cleanup.sh`: reflog expire and `gc --prune=now`. **Not run yet.** It waits until
    qa-lead's audit workers no longer need old IDs, then run it.
- **Done after it ran:**
  - each lead got its new head id;
  - data-lead got the map, and the 4 IDs in `data/audits.json` are updated (merged `a3d88a8`);
  - the map is kept locally at `C:\Projects\rig-lab-evidence\purge\purge-sha-map.txt`, not in the repo (see below).
- **Still to do:**
  - qa-lead's independent purge check in `report-phase-0.md`;
  - GitHub's reply to Hazem's Support request (filed 2026-10-02), then the 404 re-check (open
    items).

## Open items for Hazem

- **Done 2026-10-02 (Hazem): the `main` ruleset's check names now match CI.** Ruleset "main"
  (id 24320209, active, default branch only) requires `npm run verify` and `Performance
  budgets`. Both are tied to the GitHub Actions app (integration id 15368).
  - The Director confirmed it through the API: CI's check runs on `3966db1` report exactly those
    two names, from github-actions (app id 15368), both successful.
  - Found by QA as V4 / QA-P0-007. GitHub Pages already deploys from GitHub Actions.
- **Done 2026-10-02 (Hazem approved): the KTX2 texture tool is installed.** KTX-Software 4.4.2
  (free, Apache 2.0) puts `toktx` and `ktx` in `C:\Program Files\KTX-Software\bin`, on the user
  PATH. The gltf-transform `etc1s` and `uastc` pipeline works end to end, so textures can ship as
  KTX2 as BUILD_PROMPT §7 asks, not as WebP. Design backlog item 38 can close.
- **Done 2026-10-01 (Hazem's decision):** the 222 MB of third-party page captures are out of the
  public repo and its branch history. They are kept in `C:\Projects\rig-lab-evidence` and listed by
  checksum in `docs/reports/evidence/`. The GitHub Support request is filed (below). Left for
  Hazem, optionally: a private backup of `C:\Projects\rig-lab-evidence`, which is now the only
  full copy.
- **3D assets, paid options: Hazem decides later, before Phase 3** (his answer, 2026-10-02).
  The options are in `docs/design/studio-3d-brief.md` §7. Design-lead recommends A now (USD 0, parametric models and CC BY), deciding B before Phase 3 (a commissioned hero set, about USD 1,440, an estimate, not a quote), and skipping C. Its three questions: may we ask ARCTIC and ASUS for permission, and who sends the requests? Who downloads the CC BY files, with what account? Is a budget of about USD 1,500 for B open for Phase 3?
- **GitHub Support request: done, waiting for GitHub's reply.** Hazem filed it on 2026-10-02
  through GitHub's Virtual Assistant. It covers the cached pre-purge commits, from the one that
  added the archives onward.
  - **Why:** QA confirmed on 2026-10-01 that GitHub still served the purged archives through old
    commit IDs (a raw download URL answered 200 with the file). On 2026-10-02 the old commit
    still answers 200 on the API.
  - **Open:** GitHub's reply. After it, the Director re-checks that the old commit ID (it's in
    `C:\Projects\rig-lab-evidence\purge\github-support-request.md`, outside the repo) answers 404
    on the API and on raw URLs, then records the result here.
  - Until GitHub has acted, don't publish pre-purge commit IDs.
- **Rotate the Context7 API key.** The Director's check printed it in this session's transcript,
  because a masking bug missed values inside JSON arrays. It was never in the repo. Put the new
  key in the user-level config only.
- Optional: Node 22 (per `.nvmrc`), Python and Docker. Docker is needed for visual baselines
  (Phase 2).

## Decisions

- **2026-10-02, WP-E0's bundle criterion (Director, on build-lead's question).** The build codec
  keeps `zod/mini`, about 5.1 KB gzip, which was accepted in WP-B0. Phase 2's URL parameters will
  use it, and rewriting a share-link parser is outside E0.
  - "No Zod" means no catalogue data, no data schemas and no classic `zod` on the product pages.
  - The lab index is `/lab/` (`lab/index.html`), because GitHub Pages redirects `/lab` there once
    `lab/` is a folder.
  - The plan and the briefs now say this.
- **2026-10-02, unknown-data tests (Director, on qa-lead's finding).**
  - 12 of the 20 rules read only fields that the schema or the validator require, so valid data
    can't be "not published" there. They need no unknown-data test.
  - Instead, the validator's negative tests must prove that a null in each such field is
    rejected, and QA's rule list names those tests.
  - The 8 rules that can meet an unpublished value keep their unknown-data tests. Such a value is
    one of these:
    - a field that is null with a note;
    - a nullable list;
    - a fact the schema doesn't hold, such as RAM rank.
    An empty list means "none", which is a real answer.
  - The first 8 were `bios-version`, `ram-speed`, `gpu-thickness`, `ram-cooler-clearance`,
    `radiator-fit`, `psu-length`, `psu-wattage` and `gpu-power-connector`.
  - After WP-D1's batch 1, `gpu-length` and `psu-form-factor` joined them, so 10 have the test
    and 10 have validator proofs (23 new validator tests, plus `bios-coverage`).
  - QA's `tests/audit/compat-rules.json` is the record.
  - The list is checked again whenever a rule starts to read a new field (plan WP-E1). QA's
    wording fix was applied on 2026-10-02.
- **2026-10-02, golden tests with conflicting sources (Director, on qa-lead's question).**
  - The ±5% of BUILD_PROMPT §5.3 holds for every anchor, in its own source context: its publisher
    and its test conditions. The model may calibrate per source, from the anchors.
  - Where sources disagree by more than 10%, the range shown without a source context contains
    both values, at medium confidence or lower (plan WP-E3).
- **2026-10-02, a card for the Arc B580 (Director, on qa-lead's data finding).** The
  `intel-arc-b580` chip has 6 game anchors and a Blender row, but no catalogue card, so no build
  can reach it. One real, sourced B580 card goes into WP-D1. It's a data-integrity fix, not
  catalogue growth (plan WP-D1 and §7).
- **2026-10-02, the dump's query mode (qa-lead's request, accepted).** Given a file of builds and
  queries, it writes exactly those results, so QA never reads the engine's code. E0 fixes the
  input format, and each later WP adds its entry point (plan WP-E0).

- **2026-10-01, agent teams: they work on this PC.**
  - `data-lead` spawned as an in-process teammate. `ListAgents` lists it under "Teammates", and
    the team file is `~/.claude/teams/session-a9ce993b/config.json`.
  - It spawned a `hardware-researcher` worker. Named worker spawns are refused ("the team roster is
    flat"); unnamed ones run.
  - **Caveat:** the worker's final hand-back went to the Director, not to its lead ("the agent that
    spawned you is no longer running"). Messages work both ways, so workers now send their report
    to their lead with SendMessage (see the briefs).
  - Teammates have no `ListAgents` and no task list tools.
  - Phase 0 continues as a team. The §1 fallback isn't needed.
- **2026-10-01, message delivery:** a teammate receives messages only when its turn ends. The
  Director is the same.
  - A lead that works through many steps in one turn, or waits on workers (`Agent` calls block),
    can't be reached until that turn ends. A message sent at 16:30 UTC reached data-lead at
    17:14 UTC.
  - So the Director schedules anything that needs every lead's attention (a pause, a history
    rewrite) for natural idle points, usually right after the hand-offs. TaskStop is only a last
    resort, because it throws away the lead's in-flight work.
