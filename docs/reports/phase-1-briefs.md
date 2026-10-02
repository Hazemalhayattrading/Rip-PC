# Phase 1 — Team briefs (the engine)

Date: 2026-10-02 · Owner: Director · Read with `CLAUDE.md`, `BUILD_PROMPT.md` and
`docs/reports/phase-1-plan.md`. Hazem approved the plan on 2026-10-02, with his answers in its §6.

Each lead's spawn prompt points here. After a stop (CLAUDE.md rule 12), the Director re-spawns a
lead with the same prompt. The lead carries on from its row in `docs/reports/progress.md` ("In
progress") and from its status file.

---

## All leads

### Your spec
- **The approved plan is your spec.** For each WP, its "Deliverable", "In the browser" and "Done
  means" are the acceptance criteria, together with "Done, for every WP" in plan §2.
- **Hazem's decisions** (plan §6):
  - BIOS without FlashBack: warn, not block. The message names the BIOS version needed, and tells
    the buyer to ask the retailer for a board already updated to it.
  - `cooler-socket` and `display-output` are added, so there are 20 rules.
  - At least 20 held-out results, 4 per coverage class.
  - The lab goes on the live site, marked internal.
  - Three milestone PRs.
  - Rebalanced builds stay within 5% of the build's price.
- **If the plan is wrong,** or a criterion can't be met, message the Director with what and why.
  Don't change the spec yourself.

### Shared contracts: who waits for whom
- **The engine's result types (WP-E0).** qa-lead and design-lead review them before WP-E1 starts.
  When build-lead sends them, reply in your next turn.
- **`data/compat-fixtures.json` (WP-D1).** It lists the real products for every rule's tests.
  data-lead owns it; build-lead and qa-lead read it.
- **The lab spec and the copy guide (WP-DS2).** They go from design-lead to build-lead, as early
  as possible.
- **The held-out set.** build-lead never reads `tests/audit/holdout/**`. QA runs the model at the
  frozen engine commit that the Director announces.

### Where you work
- **The Director's checkout.** The repo is `C:\Projects\Rip-PC`. That checkout is the Director's
  integration checkout, on `claude/keen-lamport-0794zj`. Never run git write commands there, and
  never switch its branch.
- **Your worktree.** Work only in your own git worktree, under
  `C:\Projects\Rip-PC\.claude\worktrees\` (your section names it). Start each Bash call with
  `cd <your worktree> &&`.
- **A new branch for each WP,** cut from the integration tip:
  `git fetch && git switch -c feat/<team>-<topic> origin/claude/keen-lamport-0794zj`.
  Your Phase 0 branch is merged, and most are deleted on origin. Leave it alone.
- **Two WPs at once? Add a second worktree:**
  `git worktree add /c/Projects/Rip-PC/.claude/worktrees/<lead>-<wp> -b feat/<team>-<topic> origin/claude/keen-lamport-0794zj`,
  then run `npm ci` in it. Only one agent writes to git in any worktree.
- **Installed:** `node_modules` in every existing worktree, and Playwright's Chromium (1.56.1).
- **Phase 0 evidence** is in `C:\Projects\rig-lab-evidence\`. It is read-only.

### This PC
- **Hardware:** Windows 11, Ryzen 7 9800X3D (8 cores, 16 threads), 47 GB RAM, RTX 5080.
  - Run at most 3 workers at once. qa-lead may run 4 for the plan §4 fan-out, if no more than 3 of
    them drive a browser.
  - One browser per worker, and close browsers when you're done.
- **Node 24.21.0** and npm 11.19.0. The project asks for `^22.13.0`, and CI uses Node 22. Report
  any difference you see between the two.
- **No Python** and **no Docker.** Don't install system software. Use Node instead, with npm
  packages in a scratch folder outside the repo. KTX-Software 4.4.2 (`toktx`, `ktx`) is installed,
  for the 3D work in Phase 3.
- **Verify:** `npm run verify` passes on the integration branch, in about 100 s: 597 unit tests and
  166 e2e smoke tests.
- **The network** is a home connection. Never get around bot protection, and send one request at
  a time per host. Owner's rule 1 still holds: prices come from live retailer pages only.

### Git (CLAUDE.md rule 12)
- **Commit and push after every finished step:** `git push -u origin <your branch>`.
- **Workers never run git write commands.** When a worker's step passes your review, commit it
  straight away.
- **Commit messages:** `<team>: <what>`, ending with exactly these two trailer lines:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01PYRU8eu3LwmN3u1wqJNu5R
  ```
- **Writing a message from a heredoc:** `git commit -F -` reads stdin, but `git merge -F -` does
  not. For a merge, write the message to a file first.
- **Picking up accepted work:** `git fetch && git merge origin/claude/keen-lamport-0794zj`. Never
  merge another team's branch that hasn't been accepted.
- **Who merges:** only the Director merges into the integration branch. Nobody touches `main`;
  Hazem merges the milestone PRs.
- **Never write a pre-purge commit ID** in any file or message. GitHub still serves the old
  commits until it answers Hazem's Support request. Use only IDs from the current history
  (`git log`).

### Status file (so a stop loses nothing)
- Each branch has its own status file (your section names it). It records what is done, what is in
  progress, where you stopped, and the exact next step.
- Commit and push it with each step.
- Delete it in the commit of any hand-off that the Director will merge. Create it again if work
  continues on that branch.

### Evidence
- **Third-party page captures never go into git:** HTML, PDFs, and screenshots of other sites.
  Phase 0 had to purge 222 MB of them from history.
  - Keep captures in your worktree's `artifacts/`, which git ignores.
  - A data row cites a capture by its path and SHA-256, as in Phase 0.
- **With each hand-off,** include a SHA-256 manifest (in `sha256sum` format) of the new captures,
  under `artifacts/`. When the Director accepts the hand-off, it copies the captures to
  `C:\Projects\rig-lab-evidence\` and commits the manifest under `docs/reports/evidence/`.
- **Screenshots of our own pages** go to `artifacts/screenshots/phase-1/<wp>/`.

### Workers (this harness's rules, tested in Phase 0)
- **Spawning.** Use the `Agent` tool with the worker type from `.claude/agents/`, model `opus`, and
  **no `name`**. A named spawn is refused, because teammates can't spawn teammates.
- **Hand-back bug.** A worker's normal final report doesn't reach you; it goes to the Director. So
  every worker prompt must end with this instruction:
  > When you finish, send your full report to `<your lead's name>` with SendMessage, then end with
  > the one-line reply "Report sent to `<lead>`."
- If an `Agent` call returns "ended without delivering a report", wait for the worker's message.
  If none comes, SendMessage the worker by the agentId in that result. That resumes it.
- **An `Agent` call blocks** for the worker's whole run, even with `run_in_background`, and a
  worker's SendMessage reaches you only when your turn ends. So:
  - workers write their data to `artifacts/` in your worktree, and send their report by
    SendMessage;
  - read the data as soon as the `Agent` call returns;
  - end your turn to receive the report message.
- **No report files from workers.** The harness refuses `.md` report files from subagents. Data
  files are allowed: `.json`, `.sha256` and logs.
- **Never rely on the session scratchpad** for evidence: it is wiped with the session.
- **One task per worker.** Give each worker one well-scoped task, the exact files it may touch,
  and the evidence to return. Review every worker's output against the spec before it goes
  anywhere (BUILD_PROMPT §1).
- **Context7** is for library APIs (CLAUDE.md rule 6). If it hits its quota, use the official docs
  and the installed package sources.

### Report files from teammates
- The harness also refuses report-like `.md` files from teammates, a lead's phase report included.
  New specs and edits to existing docs work.
- If a write is refused, don't route around it: no Bash, no renamed file, no JSON wrapper. Send the
  full text to `team-lead`, between `BEGIN` and `END` lines.
- For QA's phase report, Hazem has approved the Director committing the text unchanged, credited
  to qa-lead.

### Skills
- **Loading.** Load a skill with the Skill tool when your task matches it. If a skill isn't in
  your Skill tool list, read `C:\Projects\Rip-PC\.claude\skills\<name>\SKILL.md` directly.
- **For workers,** name the skills they should use in their prompt.
- **CLAUDE.md, this brief and the plan always win** over a skill's own instructions: file
  ownership, the git rules, the hand-off format and the evidence rules.

Use per team:
- **data-lead:** verification-before-completion, systematic-debugging, and test-driven-development
  for validator changes.
- **build-lead:**
  - test-driven-development (every rule is written test first), systematic-debugging and
    verification-before-completion;
  - vercel-react-best-practices (only the React parts; this isn't a Next.js app);
  - accessibility, performance and core-web-vitals, for the lab pages;
  - requesting-code-review and receiving-code-review, for worker diffs.
- **design-lead:** frontend-design, ui-ux-pro-max, web-design-guidelines, accessibility and
  motion-framer.
- **qa-lead:** webapp-testing, web-quality-audit, accessibility, core-web-vitals, performance,
  verification-before-completion and systematic-debugging.
- **Everyone:** dispatching-parallel-agents, within the worker rules above.

Don't use these:
- **using-git-worktrees:** follow this brief's worktree rule instead.
- **finishing-a-development-branch:** only the Director merges. You hand off instead.
- **brainstorming, writing-plans, executing-plans, subagent-driven-development and
  using-superpowers:** the plan and this brief are your spec, and these skills expect a human
  partner in the loop.
- **animated-component-libraries, lightweight-3d-effects and gsap-scrolltrigger:** only with the
  Director's OK.
- **diagnosing-superpowers and seo:** not needed. The lab is not indexed on purpose.

### Messages
- **Addresses.** Reach the Director at `team-lead`. Reach another lead by its name: `data-lead`,
  `build-lead`, `design-lead` or `qa-lead`.
- **Style.** Keep messages short and factual. The first line says what the message is about.
- **Cross-team requests,** such as a data field the engine needs, go to the owning lead by
  message. Copy the Director when the request changes a plan item.
- **No task list.** You have no `ListAgents` and no shared task list. The Director keeps the task
  list in `docs/reports/progress.md`.
- **Messages reach you only between your turns.** So:
  - read every message batch in full when your turn ends, the oldest first;
  - a pause request from the Director overrides anything else in the batch.

### Hand-off to the Director, by SendMessage to `team-lead`
```
## <WP id> — <title> (batch <n>, if it is one)
Status: ready for review
Branch: feat/<team>-<topic> @ <sha>   (git diff --stat against origin/claude/keen-lamport-0794zj)
What changed: <files>
In the browser: <lab links, with the parts in the URL, as http://localhost:4173/Rip-PC/lab/...>
Evidence: <verify log path / test output / screenshot paths / source links / capture manifest>
Known gaps: <honest list, or "none">
```
- **Verify first.** `npm run verify` must pass in your worktree, after merging the latest
  integration branch. Put the log path in the evidence.
- **Screenshots** for any UI change: 390, 768 and 1440 px, in dark and light.
- **Evidence, not claims** (rule 3). **No rabbit holes** (rule 11): if the same blocker survives 2
  real attempts, record it with what you tried, and move on.
- **Stay available** after you hand off. The Director may send the work back with exact reasons.

---

## data-lead — WP-D1, Engine data, and WP-D2, Benchmark coverage

- **Worktrees:**
  - for D1: `C:\Projects\Rip-PC\.claude\worktrees\data-lead`, now on `feat/data-intel-profile` at
    `d4e87e3`, clean. Use a new branch, `feat/data-engine-data`.
  - for D2: a second worktree, `C:\Projects\Rip-PC\.claude\worktrees\data-lead-d2`, on the new
    branch `feat/data-benchmarks`.
- **Status files:** `data/WIP-STATUS-D1.md` and `data/WIP-STATUS-D2.md`.
- **Owns:** `src/data/**`, `data/**`, and the data rows in `CREDITS.md`.
- **Spec:** plan §2 (WP-D1, WP-D2) and §3 (the rules).

Steps:
1. **Set up both branches** from the integration tip.
   - On `feat/data-engine-data`, cherry-pick `d4e87e3`, the parked Intel power profile. Then tell
     the Director, who deletes `feat/data-intel-profile`.
   - Run `npm run verify` in both worktrees, then commit and push.
2. **D1, batch 1. Wave 2 needs it first.**
   - **The fixture table,** `data/compat-fixtures.json`, for all 20 rules in plan §3. Give it a Zod
     schema and validator rules: each product id exists, and each outcome cites its source.
   - **The real products the gaps need** (plan WP-D1, item 1):
     - a 4-module DDR5 kit;
     - a PSU without a native 12V-2x6;
     - a real pairing with too few 8-pin cables;
     - a CPU left off the support list of a board with its socket;
     - a cooler that doesn't fit every socket.

     Every new product must be real and currently or recently sold, with the maker's specs. Its
     price comes from a live retailer page, or it is recorded as a gap.
   - **The structured conditions** (item 2).
   - Hand off. The Director merges it and tells build-lead and qa-lead.
3. **D1, batch 2:** the power constants registry (item 6), for WP-E2.
4. **D1, batch 3:** the North's drive-tray model, the radiator width field and the RAM clearance
   under a top radiator (item 3); PCIe slot positions (item 4); and BIOS dates (item 5).
5. **D1, batch 4:** the CUDIMM check (item 7), the case size-class redesign (item 8), QA's 11
   Minors and the reseller rule (item 9).
6. **D2, in parallel,** in batches of one or two games, or one family of workloads. In priority
   order:
   1. the 10 games that have no anchors;
   2. the RTX 5060, and the 7 CPUs that have no game anchors;
   3. creator workloads: Cinebench 2024 for the 7 CPUs it lacks, Blender for the 2 chips it lacks,
      then video export, code compile and local AI;
   4. RAM and VRAM scaling data;
   5. the preset-name map.

   Rules for D2:
   - **Use one or two reviews per game,** not every review you find. QA needs unused published
     results for its held-out set of at least 20.
   - **List each batch's sources,** one line per review: publisher, title, URL, date and row count.
     QA assigns one worker per review.
   - **2 tries per game or workload,** then a written gap (rule 11).
7. **Each batch's hand-off** carries:
   - the counts by category or game;
   - the coverage matrix (game × chip, game × CPU);
   - the source list;
   - the capture manifest;
   - the verify log;
   - the known gaps.

**Workers:** a hardware-researcher for D1, and two benchmark-researchers for D2. At most 3 at once.

## build-lead — WP-E0 now; then WP-E1 to WP-E5

- **Worktrees:**
  - `C:\Projects\Rip-PC\.claude\worktrees\build-lead`, now on `feat/build-tokens-wiring`, merged
    and clean. Use a new branch, `feat/build-engine-foundations`, for E0.
  - Later, a second worktree, `C:\Projects\Rip-PC\.claude\worktrees\build-lead-perf`, for E3 and
    E4. That way two engine-engineers work in separate folders, on separate branches.
- **Status file:** `docs/build/WIP-STATUS.md`, one in each worktree.
- **Owns, as in Phase 0:**
  - `package.json`, `package-lock.json` and the root tool configs;
  - `index.html`, and `public/**` except `public/models/**`;
  - `.github/workflows/**`, `scripts/**`, `.gitignore` and `README.md`;
  - `src/main.tsx`, `src/app/**` (the lab pages included), `src/components/**` and `src/state/**`;
  - `src/engine/**` and `src/three/**`.
- **Spec:** plan §1 (the lab), §2 (WP-E0 to WP-E5) and §3 (the 20 rules).

**WP-E0, now:**
1. Branch from the integration tip. Run verify, then commit and push.
2. **Check the APIs first with Context7:** Vite (JSON and asset output, build-time plugins), Vitest
   4 (coverage thresholds, generated `test.each` cases), wouter and React 19.
3. **The result types come first.** Write them in `src/engine/`, with doc comments. Send the file
   path to qa-lead and design-lead for review, and copy the Director. WP-E1 waits for both OKs.
4. **Catalogue loading** (plan WP-E0):
   - one content-hashed JSON file, validated at build time by the Zod schemas;
   - fetched only by lab pages;
   - passed to the engine as an argument.

   Prove with `npm run perf:bundle` that the product pages' initial JS stays within 2 KB of
   77.92 KB gzip, with no catalogue data, no data schemas and no classic `zod` in it. The build
   codec's `zod/mini` stays (Director, 2026-10-02).
5. **The engine dump script,** `npm run engine:dump`. It writes every rule's result for every
   catalogue combination as JSON, under `artifacts/engine/`, and it runs in CI. Until E1 adds
   rules, it writes the catalogue combinations only.
   - It also has a **query mode**, for qa-lead: given a file of builds and queries, it writes the
     results for exactly those.
   - E0 fixes the input format and covers compatibility. E2 to E5 each add their entry point
     (plan WP-E0).
6. **The ESLint rule:** `src/**` can't import `tests/**`. Prove it with a planted import as a
   negative control.
7. **The lab shell:** `/lab/` (the index, `lab/index.html`), `/lab/parts` and `/lab/accuracy`,
   in the route table.
   - Mark it "Engine lab: internal preview", with `<meta name="robots" content="noindex">`, and
     keep it out of the site nav.
   - One shared part picker, with the parts in the URL through the existing build codec.
   - Use design-lead's lab spec when it arrives. Until then, use the existing tokens and
     components.
8. Hand off E0 against plan §2, "Done means".

**WP-E1 and WP-E2, once the Director says E0 is accepted:**
- An engine-engineer worker, test first.
- The rules that run on today's data come first. The D1 rules follow, as D1's batches merge.
- Name the rules and tests as in test plan §9.3. QA's v4 may refine the names.
- The BIOS warning follows plan WP-E1 and Hazem's requirement: it names the BIOS version needed,
  and tells the buyer to ask the retailer for a board already updated to it.
- Mutation tests use StrykerJS. Check its Vitest runner with Context7 first.
- design-lead reviews every reason string.

**WP-E3 and WP-E4, once the Director says E0 and D2's first batch are accepted:**
- A second engine-engineer, in `build-lead-perf`, in its own folders: `src/engine/perf/**` and
  `src/engine/creator/**`.
- The golden test is generated from the anchor files, one case per row.
  - Each case is evaluated in the anchor's own source context: its publisher and its test
    conditions.
  - Where sources disagree, the range shown without a source context contains both values, at
    medium confidence or lower (plan WP-E3).
- Plan §8, risk 1: scale the CPU limits against each source's own reference CPU.

**WP-E5,** once E1, E3 and E4 are accepted.

**The engine freeze:**
- When E3 and E4 are accepted, the Director records the engine commit as frozen for QA's held-out
  run. Don't change the model until QA reports.
- Never read `tests/audit/holdout/**`.

**Workers:**
- an engine-engineer for E1, E2 and E5;
- a second engine-engineer for E3 and E4;
- a frontend-engineer for the lab.

At most 3 run at once. Review every diff, and run verify yourself.

## design-lead — WP-DS2, Design backlog and engine copy

- **Worktree:** `C:\Projects\Rip-PC\.claude\worktrees\design-lead`, now on `feat/design-ds0-docs`,
  merged and clean. Use a new branch, `feat/design-ds2`.
- **Status file:** `docs/design/WIP-STATUS.md`.
- **Owns:** `src/styles/**`, `docs/design/**` and the design tokens. You also art-direct the 3D
  assets.
- **Spec:** plan §2, WP-DS2.

Steps:
1. Branch from the integration tip. Run verify, then commit and push.
2. **First, for build-lead,** because E0 and E1 use them:
   - **The lab spec.** It covers:
     - the result row;
     - the status chip for ok, warn, block and "can't verify", never colour alone;
     - the estimate readout (backlog item 44): the range, the word "estimated" and the confidence
       word;
     - the source link.
   - **The copy guide for reasons and verdicts:** one sentence, numbers with units, plain English,
     and part names as the catalogue writes them.
     - It includes the BIOS warning (plan WP-E1 and §6). The warning names the BIOS version
       needed, and tells the buyer to ask the retailer for a board already updated to it.

   Send build-lead the paths as soon as they are stable.
3. **Review build-lead's result types** when they arrive, for what the UI must show. Reply in your
   next turn.
4. **The 49 backlog items,** plus QA-P0-018 and 019.
   - Close item 38: KTX-Software 4.4.2 is installed. `toktx` and `ktx` are on the PATH, and the
     Director has tested the gltf-transform `etc1s` and `uastc` pipeline.
   - Update `studio-3d-brief.md` wherever it assumes WebP textures.
5. **The wording review.** After each E1, E3 and E5 hand-off, review every reason and verdict
   string the lab shows. Return a list that marks each one approved, or gives a rewrite.
6. **Hand off** with the spec paths, the review lists, and contrast results for anything new
   (`contrast.mjs --check`).

**Workers:** a ui-designer and a motion-designer. At most 3 at once.

## qa-lead — WP-Q3 now; WP-Q4 as work lands

- **Worktree:** `C:\Projects\Rip-PC\.claude\worktrees\qa-lead`, now on
  `feat/qa-phase0-verification`, merged and clean.
  - Use a new branch, `feat/qa-phase1-plan`, for Q3.
  - Q4 goes on `feat/qa-phase1-verification`, in a second worktree if Q3 and Q4 run at once.
- **Status file:** `docs/qa/WIP-STATUS.md`.
- **Owns:** `playwright.config.ts`, `tests/**`, `docs/qa/**` and `lighthouserc.*`.
- **You are independent.** You verify; you don't fix other teams' work.
  - Report each defect to the owning lead, with steps, the expected and actual results, and
    evidence.
  - Copy the Director on Blockers.
- **Spec:** plan §2 (WP-Q3, WP-Q4) and §4 (the fan-out).

**WP-Q3, now:**
1. Branch from the integration tip. Run verify, then commit and push.
2. **Review build-lead's result types** when they arrive, and reply in your next turn.
3. **Test plan v4.** It sets:
   - the final 20 rule ids, agreed with build-lead: plan §3, which is test plan §9.2 plus
     `cooler-socket` and `display-output`;
   - the held-out protocol: **at least 20 results, 4 per coverage class** (Hazem, 2026-10-02).
     Raise `models.heldOutCount` in `budget.json`, and its pin test, to 20;
   - the corpus format;
   - the unknown-data rule, and the check for conflicting anchors (plan WP-E1 and WP-E3, the
     Director's rulings of 2026-10-02);
   - the mutation-test check;
   - the Phase 1 audit seed;
   - a brief for every row in plan §4.
4. **Tools:** `tests/audit/compat-trace.mjs`, and the golden-count check. Each must fail on a
   planted defect.
5. **Hand off** Q3.

**WP-Q4, as each WP lands** (the Director tells you what is ready):
- **The fan-out:** run plan §4, with one fresh worker per rule, one per source review, and so on.
  At most 4 run at once.
  - Each worker writes its expected results from the sources before it looks at the engine's
    output.
  - No worker reads the engine's code.
- **Evidence:** JSON under `artifacts/qa/phase-1/`, with a checksum manifest.
- **Held-out:**
  1. after the Director announces the frozen engine commit, pick at least 20 results blind;
  2. a second worker checks the picks;
  3. run the model once, at the frozen commit, and report the errors.
- **e2e tests** for the lab pages.
- **The report:** send the full text of `docs/qa/report-phase-1.md` to `team-lead`, between
  `BEGIN` and `END` lines. The Director commits it unchanged.

**Workers:** data-auditors, an e2e-tester and a perf-tester.
