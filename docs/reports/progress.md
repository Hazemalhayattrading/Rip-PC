# Rig Lab — Progress

Owner: Director · Updated after every accepted task (CLAUDE.md rule 12).

**Last update:** 2026-10-02, Director. **Phase 0 is closed:**
- QA's verdict is CLOSED (`docs/qa/report-phase-0.md`).
- The Director signed off (`docs/reports/phase-0.md` §7).
- The branch tidy, the final scan of origin and purge stage 3 are done. Every teammate is stopped.
- Waiting for Hazem: the PR to `main`. Nothing is merged to `main` yet.

> **Commit IDs** in this file are post-purge IDs. The old-to-new map is kept outside the public repo,
> at `C:\Projects\rig-lab-evidence\purge\purge-sha-map.txt`, because GitHub still serves pre-purge commits by ID until its garbage collection runs.

## How to continue after a stop

1. Read `CLAUDE.md`, `BUILD_PROMPT.md`, this file and `docs/reports/phase-0-briefs.md`.
2. Run `git worktree list` and `git branch -vv`. Each lead's latest state is its `WIP-STATUS.md`,
   on its branch, in its worktree (table below).
3. Re-spawn only the leads marked *in progress* in the table below. On 2026-10-01 that is **only
   qa-lead**: data, design and build are closed for Phase 0.
   - Use the `Agent` tool with `name` and `subagent_type` both set to the lead's name, and model
     `opus`.
   - The prompt: "You are <lead>, a teammate in the Rig Lab agent team. Read
     `C:\Projects\Rip-PC\docs\reports\phase-0-briefs.md`, sections 'All leads' and '<lead>', then
     the '<lead>' row of 'In progress' in `C:\Projects\Rip-PC\docs\reports\progress.md`. That row
     overrides your `WIP-STATUS.md`, which may be stale. Carry on from the exact next step it
     names. Don't redo finished steps. Report to `team-lead`."
   - The worktrees, their `node_modules` and their git-ignored `artifacts/` survive a restart, so
     no set-up is needed. Check `git -C <worktree> status` first.
4. Leads reach the Director at `team-lead`. Worker hand-backs reach the Director by mistake (a
   harness bug, see the briefs). Ignore them and wait for the lead's hand-off.

## Environment (home PC)

| Item | State |
|---|---|
| Checkout | `C:\Projects\Rip-PC`, branch `claude/keen-lamport-0794zj` (integration) |
| Worktrees | `C:\Projects\Rip-PC\.claude\worktrees\<lead>` (git-ignored) |
| Restored evidence | `C:\Projects\rig-lab-evidence\`: 6 extracted folders and `archives\`. Listed by SHA-256 in `docs/reports/evidence/` (2,243 files); `sha256sum -c` passes |
| Toolchain | Node 24.21.0, npm 11.19.0 (the project asks for ^22.13.0; npm only warns); Playwright 1.56.1 Chromium installed |
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
| 2026-10-01 | **WP-D0 accepted and merged** (`c04e2a5`): Zod schemas, a validator with 34 rules, 73 seed spec records (all plan 5.3 minimums and mixes), live prices (US 52 + 10 gaps, SA 45 + 17 gaps), 116 game and 27 creator anchors, 15 games, the 20% audit (78 items, 8 findings fixed). The Director's review caught the North cooler limit (145 → 170 mm); data-lead's sweep caught the North PSU limit by tray count (schema: `psu.clearance` list) | data-lead | verify on the merged branch: 454 unit, 112 e2e; initial JS 77.42 KB gzip (no catalogue data in the bundle); 21 new evidence files copied and checked (`docs/reports/evidence/data-lead-evidence-2026-10-01.sha256`) |

## In progress

| Task | Who | Branch / worktree | State | Exact next step |
|---|---|---|---|---|
| Phase 0 merge to `main` | Hazem | `claude/keen-lamport-0794zj` | **Phase 0 closed**: QA CLOSED, and the Director signed off | Hazem approves the PR; the Director opens it on request. Hazem merges, which deploys GitHub Pages |

**Closed for Phase 0:** WP-D0 (data-lead), WP-DS1 (design-lead), WP-B1 (build-lead) and WP-Q2 (qa-lead). Their Phase 1 work starts only after Hazem has read `docs/reports/phase-0.md`. Phase 1's backlog is in its §5, including QA's 15 open Minors by owner.

## Next steps (Director)

On "continue":
1. **The PR to `main`,** when Hazem asks: from `claude/keen-lamport-0794zj`, with the Phase 0
   summary as its description. Hazem merges, which deploys GitHub Pages. After the merge, check the
   deploy and the live site.
2. **After GitHub's reply** to the Support request: check that the old commit answers 404, on the
   API and on raw URLs, and record the result. Its ID is in
   `C:\Projects\rig-lab-evidence\purge\github-support-request.md`.
3. **The Phase 1 plan** (the engine), only after Hazem has read `docs/reports/phase-0.md`. Use
   its §5 backlog, and give fresh briefs to the leads. The parking branch
   `feat/data-intel-profile` holds 2fa3e32 for the performance-model schema work.

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
- **KTX2 texture tool, decide before Phase 3.** `toktx` (KTX-Software, free, Apache 2.0) is a
  system install, and this PC doesn't have it. Without it, textures ship as WebP, which decodes
  to uncompressed GPU memory (about 22 MB per 2K map). The 160 MB texture budget then holds only
  about 7 maps. BUILD_PROMPT §7 asks for KTX2. Installing it needs Hazem's OK.
- **Done 2026-10-01 (Hazem's decision):** the 222 MB of third-party page captures are out of the
  public repo and its branch history. They are kept in `C:\Projects\rig-lab-evidence` and listed by
  checksum in `docs/reports/evidence/`. The GitHub Support request is filed (below). Left for
  Hazem, optionally: a private backup of `C:\Projects\rig-lab-evidence`, which is now the only
  full copy.
- **3D assets, paid options** (`docs/design/studio-3d-brief.md` §7). Design-lead recommends A now (USD 0, parametric models and CC BY), deciding B before Phase 3 (a commissioned hero set, about USD 1,440, an estimate, not a quote), and skipping C. Its three questions: may we ask ARCTIC and ASUS for permission, and who sends the requests? Who downloads the CC BY files, with what account? Is a budget of about USD 1,500 for B open for Phase 3?
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
