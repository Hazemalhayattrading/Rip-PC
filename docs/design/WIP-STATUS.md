# WIP status: WP-DS2 (design-lead)

Branch `feat/design-ds2`, worktree `C:\Projects\Rip-PC\.claude\worktrees\design-lead`.
Spec: `docs/reports/phase-1-plan.md` §2 WP-DS2, and `docs/reports/phase-1-briefs.md` "design-lead".

| Step | State |
|---|---|
| 1. Branch, verify, commit, push | Done 2026-10-02 |
| 2. Lab spec and copy guide | **Handed off as batch 1 at `502fceb`** (2026-10-02): lab-spec.md, copy-guide.md, the lab mock and its tool, `max-w-measure`, QA-P0-018 and 019. verify 598 unit, 166 e2e |
| 3. Review build-lead's result types | Done 2026-10-02: review sent to build-lead (15f9b5c). Design OK once M1 lands (`advice` → `action` + `steps`); M2, M3, S1 to S4 sent |
| 4. Batch 2: the backlog items, item 38, studio-3d-brief.md's WebP assumptions | In progress: three workers (ui-designer, motion-designer, 3d-artist), split by file below |
| 5. Wording review after E1, E3 and E5 | Not started: waits for each hand-off's `engine:dump` |
| 6. Hand-off of batch 2 | Not started |

**Batch 2 split** (no two workers edit one file):
- ui-designer: items 1–9, 14, 16–22, 24 (the sheet), 41–43, 47–49. Files: tokens.md, specs-view.md,
  components.md (new), tokens.css (safe-area tokens), base.css (items 5, 7, 8), tokens.test.ts.
- motion-designer: items 10–13, 23 (the rule). Files: motion.md, motion.ts, motion.types.test.ts (new).
- 3d-artist: items 23 (the brief), 24 (the orbit), 25–38, 40, 46. Files: studio-3d-brief.md,
  3d-asset-survey.md.
- design-lead after review: backlog.md statuses, the `--dur-ui` comment in tokens.css, cross-links.

**Exact next step:** wait for the three worker reports, review each diff against its items, run
verify, update backlog.md, commit, and hand off batch 2.
