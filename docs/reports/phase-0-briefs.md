# Phase 0 — Team briefs (home PC, agent teams)

Date: 2026-10-01 · Owner: Director · Read with `CLAUDE.md`, `BUILD_PROMPT.md` and
`docs/reports/phase-0-plan.md` (the acceptance criteria are in plan §5).

Each lead's spawn prompt points here. After a stop (CLAUDE.md rule 12), the Director re-spawns a
lead with the same prompt, and the lead carries on from its `WIP-STATUS.md`.

---

## All leads

### Where you work
- The repo is `C:\Projects\Rip-PC`. That checkout is the **Director's integration checkout** on
  `claude/keen-lamport-0794zj`. Never run git write commands there, and never switch its branch.
- You work only in **your own git worktree**, listed in your section below. Run every command from
  there: start each Bash call with `cd <your worktree> &&`.
- `node_modules` is installed in each worktree. Playwright's Chromium (1.56.1) is installed for the
  user.
- Evidence restored from the cloud container lives in `C:\Projects\rig-lab-evidence\` (read-only).
  Each worktree already has its team's `artifacts/` folder copied in.

### This PC
- Windows 11, AMD Ryzen 7 9800X3D (8 cores, 16 threads), 47 GB RAM, NVIDIA RTX 5080. Run at most 3
  workers at once, one browser per worker, and close browsers when done.
- **Node 24.21.0** and npm 11.19.0. The project asks for `^22.13.0` and CI uses Node 22. npm warns,
  but everything passes. Report any difference you see between Node 24 here and Node 22 in CI.
- **No Python** and **no Docker** are installed. Don't install system software. Use Node instead:
  npm packages in a scratch folder **outside** the repo. If you truly need Python or Docker, ask
  the Director.
- Git Bash is the shell. `npm run verify` passes here on the integration branch (45 s; 266 unit tests
  and 112 e2e smoke tests).
- The network is a home connection, so there is no egress proxy. The rules don't change: never get
  around bot protection, be polite (one request at a time per host), and never commit third-party
  page captures. Owner's rule 1 (plan, top) still holds: prices come from live retailer pages only.

### Git (CLAUDE.md rule 12)
- **Commit and push after every finished step**: `git push -u origin <your branch>`. Feature
  branches are pushed now; that cloud restriction is gone.
- Workers in your worktree never run git write commands. When a worker's step passes your review,
  commit it straight away, so only one agent writes to git in a worktree.
- Commit message: `<team>: <what>`, ending with exactly this trailer line:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- To pick up accepted work from other teams, run `git merge claude/keen-lamport-0794zj` in your
  worktree. Never merge another team's unaccepted branch.
- Only the Director merges into the integration branch. Nobody touches `main`.

### Status file (so a stop loses nothing)
Keep your `WIP-STATUS.md` (path in your section) current: what is done, what is in progress, where
you stopped, and the exact next step. Commit and push it with each finished step. Delete it in your
final hand-off commit; the hand-off message replaces it.

### Workers (this harness's rules, tested 2026-10-01)
- Spawn workers with the `Agent` tool, using the worker type from `.claude/agents/`, model `opus`,
  and **no `name`**. A named spawn is refused, because teammates can't spawn teammates.
- **Hand-back bug:** a worker's normal final report does not reach you. It goes to the Director.
  Every worker prompt must therefore end with this instruction:
  > When you finish, send your full report to `<your lead's name>` with SendMessage, then end with
  > the one-line reply "Report sent to `<lead>`."
- If an `Agent` call returns "ended without delivering a report", wait for the worker's message.
  If none comes, SendMessage the worker by the agentId in that result, which resumes it.
- Give each worker one well-scoped task, the exact files it may touch, and what evidence to return.
  Review every worker's output against the spec before it goes anywhere (BUILD_PROMPT §1).
- The Context7 MCP is for library APIs. If it hits its quota, check the official docs and the
  installed package sources.

### Skills (project skills, loaded since 2026-10-01)
The 45 skills in `.claude/skills/` are real symlinks now (Developer Mode is on), and they load.
- Load one with the Skill tool when your task matches it. If a skill isn't in your Skill tool
  list, read `C:\Projects\Rip-PC\.claude\skills\<name>\SKILL.md` directly.
- Name the skills a worker should use in its prompt.
- **CLAUDE.md, this brief and the plan always win** over a skill's own instructions: file
  ownership, git rules, the hand-off format and the evidence rules.

Use per team:
- **data-lead:** verification-before-completion, systematic-debugging, test-driven-development
  (for validator changes).
- **design-lead:** frontend-design, ui-ux-pro-max, web-design-guidelines, accessibility (contrast),
  core-web-vitals (font fallback, CLS and LCP), motion-framer (motion tokens).
  - For the 3D brief: react-three-fiber, threejs-webgl, r3f-materials, r3f-lighting, r3f-loaders,
    r3f-textures, blender-web-pipeline.
- **build-lead:** vercel-react-best-practices (only the React parts; this isn't a Next.js app),
  test-driven-development, systematic-debugging, verification-before-completion, core-web-vitals,
  performance, accessibility. For worker diffs: requesting-code-review and receiving-code-review.
- **qa-lead:** webapp-testing, web-quality-audit, accessibility, core-web-vitals, performance,
  verification-before-completion, systematic-debugging.
- **Everyone:** dispatching-parallel-agents, within the worker rules above.

Don't use these in Phase 0. They clash with how this project runs:
- **using-git-worktrees:** you already have a worktree.
- **finishing-a-development-branch:** only the Director merges. You hand off instead.
- **brainstorming, writing-plans, executing-plans, subagent-driven-development, using-superpowers:**
  the plan and this brief are your spec, and these skills expect a human partner in the loop. If
  you think the spec is wrong, message the Director.
- **animated-component-libraries, lightweight-3d-effects and gsap-scrolltrigger:** they bring
  stock looks and extra weight, against the Studio direction and the bundle budget. Only with the
  Director's OK.
- **diagnosing-superpowers and seo:** not needed now.

### Messages
- Reach the Director at `team-lead`. Reach another lead by its name: `data-lead`, `build-lead`,
  `design-lead` or `qa-lead`.
- Messages are short and factual. The first line says what the message is about.
- You have no `ListAgents` and no shared task list. The Director keeps the task list in
  `docs/reports/progress.md`.

### Hand-off to the Director (plan §6 format), by SendMessage to `team-lead`
```
## <WP id> — <title>
Status: ready for review
Branch: feat/<team>-<topic> @ <sha>   (git diff --stat against claude/keen-lamport-0794zj)
What changed: <files>
Evidence: <absolute screenshot paths / test log / source links / measured numbers>
Known gaps: <honest list, or "none">
```
- `npm run verify` must pass in your worktree, after merging the latest integration branch. Put the
  log path in the evidence.
- **Evidence, not claims** (CLAUDE.md rule 3). **No rabbit holes** (rule 11): if the same blocker
  survives 2 real attempts, record it with what you tried, and move on.
- After you hand off, stay available. The Director may send the work back with exact reasons.

---

## data-lead — finish WP-D0, Data foundations

- **Worktree:** `C:\Projects\Rip-PC\.claude\worktrees\data-lead`
- **Branch:** `feat/data-foundations` (was `527f345`)
- **Status file:** `data/WIP-STATUS.md`
- **Owns:** `src/data/**`, `data/**`, the data rows in `CREDITS.md`.
- **Evidence:** your `artifacts/` holds 1,167 files restored from the cloud container. All of them
  match `docs/reports/phase-0-wip/evidence/data-lead-evidence-manifest.sha256.txt`, except the one
  page left out by design (see `EXCLUDED.txt`). Price rows point at these paths and hashes, so
  never rename or move a capture that a row cites.

Steps:
1. Merge `claude/keen-lamport-0794zj` into your branch and resolve any conflicts. Run
   `npm run verify`, then commit and push.
2. Finish the seeded 20% audit (seed 20260930), as `data/WIP-STATUS.md` describes:
   - the 10 TechPowerUp game rows, read against the chart PNGs in
     `artifacts/benchmarks/tpu-9850x3d-img/`;
   - the 6 creator rows;
   - the 3 games.
   Fix every finding, and record the audit results.
3. Add the README price rule: a listing filed under a reseller brand counts only if it names the
   maker's part number.
4. Price runner: give every attempt its own capture name, so rejected captures survive. The runner
   is `artifacts/scratch/prices_run.py`, which is Python, and this PC has none. Either:
   - port the naming logic to a small Node tool committed under `data/tools/`, or
   - make the fix in the Python script, commit the script under `data/tools/` with a note on how
     to run it, and record that it wasn't run here.
   Committing it means the runner can't get lost again. Time-box this step.
5. design-lead will send you the CREDITS row text for the font, Rig Lab Sans (OFL). Add it to
   `CREDITS.md`.
6. Tell build-lead the canonical category ids: `gpu-card` and `gpu-chip`, plus any others the UI
   must use. Its `src/state/categories.ts` still uses `gpu`.
7. Hand off with:
   - the counts per category;
   - the price coverage and the gaps per market;
   - the benchmark coverage matrix;
   - the full 20% audit, sample and results;
   - the sources list;
   - known gaps.

## design-lead — finish WP-DS1, Tokens for Studio

- **Worktree:** `C:\Projects\Rip-PC\.claude\worktrees\design-lead`
- **Branch:** `feat/design-tokens` (was `d59bd40`)
- **Status file:** `docs/design/WIP-STATUS.md`
- **Owns:** `src/styles/**`, `docs/design/**`, design tokens. You also art-direct the 3D assets.
- **Direction:** Hazem picked **C, Studio**, on 2026-09-30.

Steps:
1. Merge `claude/keen-lamport-0794zj` into your branch. Run `npm run verify`, then commit and push.
2. **Fallback face calibration** (`Rig Lab Sans Fallback`, a `local(Arial)` face). Its size-adjust
   is a provisional 102.03% in `tokens.css`.
   - Windows Chromium uses DirectWrite with fractional glyph advances, so the browser corpus
     method that failed on headless Linux may work here.
   - A font-file method also works with no browser: harfbuzzjs (WASM) or fontkit, installed in a
     scratch folder outside the repo, run against `C:\Windows\Fonts\arial.ttf` and the Rig Lab Sans
     woff2. It is shaped text, so the method doesn't depend on the platform.
   - Set size-adjust plus the ascent, descent and line-gap overrides. Show the measured width error
     before and after.
   - **2 attempts, then record it and move on** (rule 11).
3. Write `docs/design/tokens.md`:
   - the token table and usage rules;
   - Preflight on, with `base.css` restorations;
   - **build-lead's wiring notes**: import `tokens.css` with no layer, the font preload link,
     `<html data-theme="dark">`, and the light theme switch;
   - the `swap` and LCP rationale.
   Send build-lead the wiring notes by message as soon as they are stable.
4. `docs/design/direction.md`: record the pick (Studio, Hazem, 2026-09-30). Keep A and B as
   history, and add the known gaps.
5. `docs/design/studio-3d-brief.md`, the brief for Phases 2–3:
   - what the 3D stage must show;
   - an early real-dimension model for Phase 2;
   - camera, lighting and material direction;
   - the performance limits (60 fps on the Arc iGPU laptop);
   - **paid-asset options for Hazem**: candidates, licence terms, prices and their sources. Hazem
     decides; nothing is bought.
   A `3d-artist` worker can research this.
6. The Specs dense view: the expert table view section, in `direction.md` or its own spec.
7. Send data-lead the CREDITS row text for the font (Rig Lab Sans, OFL, from Mona Sans).
8. Re-run verify, `contrast.mjs --check` and `tokens-check`. Hand off with:
   - before and after screenshots at 390, 768 and 1440, dark and light;
   - the spec paths;
   - the contrast results;
   - the calibration numbers.

## build-lead — WP-B1, Wire the tokens and small build follow-ups

- **Worktree:** `C:\Projects\Rip-PC\.claude\worktrees\build-lead`
- **Branch:** `feat/build-tokens-wiring` (new, from the integration branch)
- **Status file:** `docs/build/WIP-STATUS.md` (new; yours)
- **Owns:** `package.json`, `package-lock.json`, root tool configs (vite, tsconfig\*, eslint, vitest,
  prettier), `index.html`, `public/**` (except `public/models/**`), `.github/workflows/**`, new files
  in `scripts/**`, `.gitignore`, `README.md`, `src/main.tsx`, `src/app/**`, `src/components/**`,
  `src/state/**`, `src/engine/**`, `src/three/**`.

**Part 1, now:**
1. `src/state/categories.ts`: align the ids with data-lead's (`gpu-card`, not `gpu`). Ask data-lead
   for the canonical list. Keep every one-letter URL code unchanged, because the codes freeze when
   the first share link goes out. Update the codec tests.
2. `README.md`:
   - add the `perf:*` and `audit:sample` scripts;
   - Windows set-up notes: Node 22 per `.nvmrc`, `core.symlinks` with Developer Mode for
     `.claude/skills`, and no Docker for visual baselines;
   - mark the cloud-container notes as such.
3. Optional, only if cheap: an ESLint `no-restricted-imports` rule so specs take `test` from the
   shared fixture. QA already enforces it in `tests/harness/spec-imports.test.ts`, so skip it if it
   only duplicates that test.
4. Commit and push each step.

**Part 2, after the Director tells you WP-DS1 is accepted and merged:**
5. Merge the integration branch. Wire `tokens.css` (no layer), `base.css`, the font preload and
   `<html data-theme="dark">` (with light support) into the app shell, following
   `docs/design/tokens.md`.
6. Prove there is no regression:
   - `npm run verify`;
   - the bundle budget (`npm run perf:bundle`), with initial JS still far under 250 KB gzip;
   - LCP and CLS (`npm run perf:vitals`);
   - screenshots of `/` and `/build/cpu` at 390, 768 and 1440, dark and light.
7. Hand off.

A `frontend-engineer` worker may do steps 1 and 5. You review every diff and run verify yourself.

## qa-lead — WP-Q2, Independent Phase 0 verification

- **Worktree:** `C:\Projects\Rip-PC\.claude\worktrees\qa-lead`
- **Branch:** `feat/qa-phase0-verification` (new, from the integration branch)
- **Status file:** `docs/qa/WIP-STATUS.md` (new; yours)
- **Owns:** `playwright.config.ts`, `tests/**`, `docs/qa/**`, `lighthouserc.*`.
- You are independent. You verify; you don't fix other teams' code. Report defects to the owning
  lead with steps to reproduce, expected against actual, and a screenshot. Copy the Director on
  blockers.
- **Note:** the Director fixed one line in your `tests/harness/spec-imports.test.ts` in `45c0bae`.
  `path.relative()` gives backslashes on Windows, and that blocked everyone's verify.

**Part 1, now:**
1. Run QA's own tooling on Windows and fix anything Windows-only in your files:
   - `npm run perf:bundle`;
   - `perf:lhci` and `perf:lhci:desktop`, which use installed Chrome here;
   - `perf:vitals`;
   - `audit:sample`;
   - the fps probe, as a dry run.
2. Verify the four accepted work packages on the integration branch against plan §5, criterion by
   criterion, with measured numbers: WP-B0, WP-Q0, WP-DS0 and WP-Q1. For QA's own WP-Q0 and
   WP-Q1, have a fresh worker check them, not you.
3. Build the rule-1 compliance check (Owner's rule 1, plan, top) for **100% of price and benchmark
   rows**. Read data-lead's branch read-only (`git show feat/data-foundations:…`), and the captures
   in `C:\Projects\rig-lab-evidence\data-lead-artifacts\artifacts\` with their SHA-256 manifest.
4. Plan the seeded 10% data audit, run by a fresh `data-auditor` worker. Run it for real once
   WP-D0 is merged.

**Part 2, as work is accepted:**
5. After WP-D0 is merged: run the 10% audit and the rule-1 check on the merged data.
6. After WP-B1 is merged: add dark and light projects for axe (later for visual). The visual
   baselines need Docker, which this PC lacks, so record that.
7. Write `docs/qa/report-phase-0.md`:
   - pass or fail for every plan §5 criterion;
   - the numbers you measured;
   - the audit results;
   - the rule-1 compliance result;
   - open defects, with severity.
   Any blocker keeps the phase open. Hand off.
