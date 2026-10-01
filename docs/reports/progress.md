# Rig Lab — Progress

Owner: Director · Updated after every accepted task (CLAUDE.md rule 12).

**Last update:** 2026-10-01, Director. Phase 0 is open; nothing is merged to `main`.

## How to continue after a stop

1. Read `CLAUDE.md`, `BUILD_PROMPT.md`, this file and `docs/reports/phase-0-briefs.md`.
2. Run `git worktree list` and `git branch -vv`. Each lead's latest state is its `WIP-STATUS.md`,
   on its branch, in its worktree (table below).
3. Re-spawn every lead marked *in progress*:
   - use the `Agent` tool with `name` and `subagent_type` both set to the lead's name, and model
     `opus`;
   - the prompt: "You are <lead>, a teammate in the Rig Lab agent team. Read
     `C:\Projects\Rip-PC\docs\reports\phase-0-briefs.md`, sections 'All leads' and '<lead>', then
     your `WIP-STATUS.md`. Carry on from the exact next step it names. Don't redo finished steps.
     Report to `team-lead`."
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
| 2026-10-01 | Golden rule 12 added to CLAUDE.md | Director | `c12fabd` |
| 2026-10-01 | CI run #7 on `9b9244d` checked: green | Director | [run 36782736442](https://github.com/Hazemalhayattrading/Rip-PC/actions/runs/36782736442): `npm run verify` and `Performance budgets` both pass |
| 2026-10-01 | Home PC set up: `npm ci`, Chromium, both WIP branches restored from their bundles, evidence extracted and checksum-verified | Director | `feat/data-foundations` @ `527f345`, `feat/design-tokens` @ `d59bd40`; `sha256sum -c` passes for all 11 files |
| 2026-10-01 | 365 files re-checked out with LF. They came from a `main` checkout made before `.gitattributes` existed, and Prettier failed on them | Director | `git ls-files --eol` shows 0 `w/crlf` |
| 2026-10-01 | Windows fix: spec paths compared with `/` in `tests/harness/spec-imports.test.ts` | Director (a one-liner that blocked everyone) | `45c0bae`; local verify 266 unit and 112 e2e pass, 45 s |
| 2026-10-01 | Agent teams tested: a teammate spawns, and it can spawn an unnamed worker | Director, data-lead | `ListAgents` shows "Teammates"; team `session-a9ce993b` |
| 2026-10-01 | The four leads spawned as teammates, with the briefs | Director | `ListAgents`: Teammates (4) |
| 2026-10-01 | Project skills restored: 45 real symlinks in all 5 checkouts. The skills load, and the leads were told which to use (briefs, "Skills") | Director | `git status` clean; the Skill tool lists all 45 |
| 2026-10-01 | Evidence moved off the branch tip. Archives copied byte-exact to `C:\Projects\rig-lab-evidence\archives\`; checksum manifests in `docs/reports/evidence/` | Director | `4467930`; both `sha256sum -c` checks pass |
| 2026-10-01 | Context7 check: no API key in any tracked or untracked repo file, nor in history. The keyless Context7 entry was dropped from `.mcp.json` so Hazem's user-level server (with his key) applies | Director | `8a8a645`; `claude mcp get context7` shows "Scope: User config" |
| 2026-10-01 | **WP-B1 Part 1 accepted:** `gpu` → `gpu-card` (URL code `g` kept, test-first); README Windows and perf sections; ESLint `no-import-type-side-effects` | build-lead | `feat/build-tokens-wiring` @ `b78a62d`; `artifacts/logs/wp-b1/verify-part1.log` (266 unit, 112 e2e); the probe shows 77.40 → 320.49 KB gzip without the rule. Merges together with its README Context7 follow-up |

## In progress

| Task | Who | Branch / worktree | State | Exact next step |
|---|---|---|---|---|
| WP-D0 Data foundations | data-lead | `feat/data-foundations` / `.claude/worktrees/data-lead` | Steps 1–4 and 6 done (`d416303`); 20% audit finished, 8 findings fixed | npm ci, add the font row (received from design-lead), fresh verify, hand-off. After the purge, update the two commit IDs cited in `data/audits.json` |
| WP-DS1 Tokens for Studio | design-lead | `feat/design-tokens` / `.claude/worktrees/design-lead` | Merged integration; `tokens.md` written (`0f4b8eb`); now on `direction.md` | its `docs/design/WIP-STATUS.md` |
| WP-B1 Tokens wiring and follow-ups | build-lead | `feat/build-tokens-wiring` / `.claude/worktrees/build-lead` | Part 1 accepted; Part 2 waits for WP-DS1 | merge integration, README note on Context7 (per-user config), fix the `install-skills.sh` echo, verify, report |
| WP-Q2 Independent verification | qa-lead | `feat/qa-phase0-verification` / `.claude/worktrees/qa-lead` | Part 1 running: Windows tooling fixed (`258c76e`); 3 workers (data-auditor, e2e-tester, visual-tester) running since 16:55 UTC | its `docs/qa/WIP-STATUS.md` |
| **Evidence purge** (approved by Hazem 2026-10-01) | Director | the 5 branches above | Waiting for all four leads to be idle at once | see "Evidence purge" below |

## Next steps (Director)

1. Review each hand-off. On acceptance:
   - `git merge --no-ff <branch>` into `claude/keen-lamport-0794zj`, then verify and push;
   - tell the dependent leads;
   - update this file.
2. Order: WP-D0 and WP-DS1, then WP-B1 Part 2, then QA Part 2, then `docs/qa/report-phase-0.md`.
3. Write `docs/reports/phase-0.md` and report to Hazem **before Phase 1 starts**.
4. **Evidence purge** (see the section below).

## Evidence purge (approved by Hazem, 2026-10-01: purge now, the 2 bundles included)

- **What:** remove 11 files from history: the 9 `.tar.xz` archive parts and the 2 git bundles under
  `docs/reports/phase-0-wip/`. The 3 text records stay in history; they moved to
  `docs/reports/evidence/` at the tip.
- **Range:** only commits that descend from `63ab40f`, the one commit that added them
  (`--ancestry-path ^63ab40f^`), on the 5 branches: the integration branch and the 4 lead
  branches. 74 older commits carry SSH signatures, `main` among them; outside this range they
  keep their ids. Inside it, only `63ab40f` and `9b9244d` lose a signature.
- **Precondition:** every lead idle, clean and pushed. A lead's tip still holds the 11 files until
  it merges `4467930`, so rewriting under an active lead would let its next commit re-add them.
- **Why it waits:** teammates receive messages only between turns. design-lead and qa-lead had been
  in one turn since 16:28 UTC and never saw the pause request. data-lead and build-lead paused, and
  were resumed so they don't wait idle.
- **Scripts:** `C:\Projects\rig-lab-evidence\purge\`, both with pre-flight checks.
  - `purge-1-rewrite.sh`: pre-flight, a full backup bundle into `..\backup\`, the rewrite, and
    verification. It pushes nothing.
  - `purge-2-publish.sh`: the `--force-with-lease` pushes, the worktree resets, and `gc`.
  Review stage 1's output before running stage 2.
- **After it runs:**
  - send each lead its new head id;
  - send data-lead the old-to-new map, for `data/audits.json`;
  - update this file's commit ids;
  - draft the GitHub Support request for Hazem (purge cached views and run GC).

## Open items for Hazem

- Branch protection on `main`: make `npm run verify` and `Performance budgets` required checks.
  The API reports "Branch not protected". GitHub Pages already deploys from GitHub Actions.
- **Decided 2026-10-01:** the 222 MB of third-party page captures leave the public repo. They are
  kept in `C:\Projects\rig-lab-evidence`, listed by checksum in a manifest in the repo, and purged
  from branch history before anything merges to `main`. The Director shows Hazem the purge plan
  before any history rewrite.
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
