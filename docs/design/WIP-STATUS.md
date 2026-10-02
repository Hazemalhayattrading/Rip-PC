# WIP status: WP-DS2 (design-lead)

Branch `feat/design-ds2`, worktree `C:\Projects\Rip-PC\.claude\worktrees\design-lead`.
Spec: `docs/reports/phase-1-plan.md` §2 WP-DS2, and `docs/reports/phase-1-briefs.md` "design-lead".

| Step | State |
|---|---|
| 1. Branch, verify, commit, push | Done 2026-10-02 |
| 2. Lab spec and copy guide | **Batch 1, accepted and merged as `427d241`** (design-lead's `502fceb`), 2026-10-02 |
| 3. Review build-lead's result types | Review sent 2026-10-02 (`15f9b5c`): design's OK waits on M1 (`advice` → `action` + `steps` with their sources). Answers on the BIOS field and the 20 titles sent 2026-10-03. Re-review the revised types when build-lead sends the SHA |
| 4. Batch 2: the backlog items, item 38, the WebP update, QA's focus-scroll note | **In progress.** The ui-designer's CSS for items 5–8 is in `56096a8` (committed by the Director at the usage-limit stop) and reviewed: 105 style tests pass, Prettier and ESLint clean, and full verify passes on it (606 unit, 166 e2e, `artifacts/logs/verify-ds2-wip-56096a8.log`). The three workers were resumed on 2026-10-03 (agent ids below) |
| 5. Wording review after E1, E3 and E5 | Waits for each hand-off's `engine:dump` |
| 6. Hand-off of batch 2 | Not started |

**Batch 2: workers, split by file** (no two edit one file). Each was resumed by SendMessage to its
agent id on 2026-10-03. If a resume fails, re-spawn the same worker type with model `opus` and no
name, using the batch 2 prompt in this file's history (`3481d85`'s split) and the notes below.

| Worker (agent id) | Items | Files | On disk |
|---|---|---|---|
| ui-designer (`ab36ce6ba2dd83499`) | 1–9, 14, 16–22, 24 (the sheet), 41–43, 47–49, and QA's focus scroll on step change | tokens.md, specs-view.md, components.md (new); tokens.css (safe areas only), base.css (5, 7, 8), tokens.test.ts | CSS done (`56096a8`); docs not yet |
| motion-designer (`abbcc75f5520958a0`) | 10–13, 23 (the rule) | motion.md, motion.ts, motion.types.test.ts (new) | Nothing yet |
| 3d-artist (`acff69b9b412c86fa`) | 23 (the brief), 24 (the orbit), 25–38, 40, 46 | studio-3d-brief.md, 3d-asset-survey.md | Nothing yet |

After review, design-lead does:
- backlog.md statuses;
- the `--dur-ui` comment in tokens.css: `/* a hover overlay's fade, the pressed scale, a chevron's
  turn */` (the motion-designer's wording, ruled 2026-10-03);
- a new token `--z-under: -1` (utility `z-under`, test first): only for an overlay inside an
  `isolate` component (the motion-designer's hover overlay, item 10);
- the cross-link from studio-3d-brief.md §3.1 to components.md's text zones;
- a pointer from tokens.md §2.6 to motion.md's Phase 2 rules.

**Rulings sent on 2026-10-03:**
- Workers: the market pill switches instantly, with no slide (motion.md rule 2); fans spin up and
  down over `--dur-seat`; item 16 reads "No CPUs match these filters."; item 19 needs no
  virtualisation.
- The focus rule on a page or step change, sent to the ui-designer for components.md, to qa-lead
  to test, and to build-lead for QA-P1-001:
  - scroll to the top at once, then focus the h1 with `preventScroll`;
  - on Back and Forward, the browser restores the scroll position;
  - in-page changes move neither focus nor scroll.

**Lab-spec fixes done** (`7556bdb`): icon colours on wrappers, never on the svg (forced colours);
money fraction digits; dates with `timeZone: 'UTC'`.

**Don't message a worker after its report:** a send to a finished worker re-runs it. After the
reports, design-lead makes corrections itself.

**Asked and waiting:** qa-lead, the focus-scroll finding's steps (2026-10-03).

**Exact next step:** read the three worker reports as they arrive; review each diff against its
items; run verify; update backlog.md; commit, push, and hand off batch 2.
