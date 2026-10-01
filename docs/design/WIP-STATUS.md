# WP-DS1 status (WIP, not reviewed)

Updated 2026-10-01 by design-lead. Brief: `docs/reports/phase-0-briefs.md`, section "design-lead".
Branch `feat/design-tokens`, worktree `C:\Projects\Rip-PC\.claude\worktrees\design-lead`, pushed to
origin after every step.

| # | Step (brief) | State |
|---|---|---|
| 1 | Merge `claude/keen-lamport-0794zj`, verify, push | **Done** 2026-10-01 (`dcada97`). Verify exit 0 on Windows, Node 24.21.0: typecheck, lint, 17 files / 359 unit tests, build, 112 e2e. Log: `artifacts/wip/WP-DS1/verify-step1.log` |
| 2 | Fallback face calibration (2 attempts, rule 11) | **Done** 2026-10-01. `size-adjust: 103.14%`, ascent 105.68%, descent 31.03%, line gap 0%. Attempt 1, HarfBuzz on the font files (`docs/design/tools/calibrate-fallback.mjs`): ratio 1.0314. Attempt 2, Windows Chromium 141 (fractional advances): ratio 1.0314, so both agree. Corpus width error: plain Arial −3.04%, before (102.03%) −1.10%, after 0.00%. Baselines equal in all 10 roles. Evidence: `artifacts/wip/WP-DS1/calibration.json`, `sweep-win.json`, `tokens-check-win.json` |
| 3 | `docs/design/tokens.md`, then wiring notes to build-lead | **Next** |
| 4 | `direction.md`: record the pick, keep A and B as history, known gaps | Not started |
| 5 | `docs/design/studio-3d-brief.md` (paid-asset options: a `3d-artist` worker) | Not started |
| 6 | Specs dense view section | Not started |
| 7 | CREDITS row text for the font to data-lead | Not started |
| 8 | Re-run verify, `contrast.mjs --check`, `tokens-check.mjs`; hand off | Not started |

Already done before 2026-10-01 (commits `9cd0985`, `d59bd40`): `src/styles/tokens.css` with the
`@theme` mapping, `base.css`, `motion.ts`, `tokens.test.ts` (93 tests), the Rig Lab Sans woff2 with
`OFL.txt` and `FONTLOG.txt`, `docs/design/tools/tokens-check.mjs`, the contrast check on the shipped
tokens, and the Studio mock's BIOS warning.

**Step 2 tools.** harfbuzzjs 1.6.2 and wawoff2 2.0.1 are installed in the session scratchpad
(`hb/node_modules`), outside the repo. To re-run, install them anywhere with `npm install --prefix`,
then pass `--modules` to `calibrate-fallback.mjs` (its header has the command).

**Decided in step 2: tabular figures stay on everywhere.** Mona Sans's tabular set has a slashed zero
and a footed one, and the proportional set does not. The picked Studio mock sets every figure tabular,
prose included, so the slashed zero is part of the picked look. Proportional prose would put two
different zeros in one row (name and price). To record in `tokens.md`, and to amend in
`direction.md` §1.1 ("Prose keeps the font's default figures" does not apply to Studio).

**For step 5:** the 3d-artist worker's paid-asset report is in the scratchpad at
`3d-paid-assets/draft.md`. I reviewed it: 14 licence quotes appear word for word in its captures, and
the ARCTIC GLB measurement reproduces.

**Kept outside git** (git-ignored): `artifacts/wip/WP-DS1/` (logs, scripts),
`artifacts/screenshots/phase-0/WP-DS1/` (evidence), `artifacts/cache/fonts/` (source TTF, SHA-256
pinned in `src/styles/fonts/FONTLOG.txt`).
