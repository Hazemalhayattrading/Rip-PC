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
| Restored evidence | `C:\Projects\rig-lab-evidence\` (6 archives; data-lead's 1,167 files match the SHA-256 manifest) |
| Toolchain | Node 24.21.0, npm 11.19.0 (the project asks for ^22.13.0; npm only warns); Playwright 1.56.1 Chromium installed |
| Missing | Python, Docker, Windows Developer Mode (so `.claude/skills/*` symlinks are text stubs) |
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

## In progress

| Task | Who | Branch / worktree | State | Exact next step |
|---|---|---|---|---|
| WP-D0 Data foundations | data-lead | `feat/data-foundations` / `.claude/worktrees/data-lead` | Spawned 2026-10-01 | briefs, data-lead step 1: merge the integration branch |
| WP-DS1 Tokens for Studio | design-lead | `feat/design-tokens` / `.claude/worktrees/design-lead` | Spawned 2026-10-01 | briefs, design-lead step 1 |
| WP-B1 Tokens wiring and follow-ups | build-lead | `feat/build-tokens-wiring` / `.claude/worktrees/build-lead` | Spawned 2026-10-01; Part 2 waits for WP-DS1 | briefs, build-lead step 1 |
| WP-Q2 Independent verification | qa-lead | `feat/qa-phase0-verification` / `.claude/worktrees/qa-lead` | Spawned 2026-10-01; Part 2 waits for WP-D0 and WP-B1 | briefs, qa-lead step 1 |

## Next steps (Director)

1. Review each hand-off. On acceptance:
   - `git merge --no-ff <branch>` into `claude/keen-lamport-0794zj`, then verify and push;
   - tell the dependent leads;
   - update this file.
2. Order: WP-D0 and WP-DS1, then WP-B1 Part 2, then QA Part 2, then `docs/qa/report-phase-0.md`.
3. Write `docs/reports/phase-0.md` and report to Hazem **before Phase 1 starts**.
4. Clean-up (handoff §7 step 10): delete `docs/reports/phase-0-wip/` once every branch is pushed.
   Hazem decides the history question first (open items).

## Open items for Hazem

- Branch protection on `main`: make `npm run verify` and `Performance budgets` required checks.
  The API reports "Branch not protected". GitHub Pages already deploys from GitHub Actions.
- The 222 MB of third-party page captures in the public repo's history
  (`docs/reports/phase-0-wip/evidence/`). Keep them, or move them to private storage and purge the
  history, before anything merges to `main`.
- Windows Developer Mode. It lets `git config core.symlinks true` restore the 45
  `.claude/skills/*` symlinks, so project skills load.
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
