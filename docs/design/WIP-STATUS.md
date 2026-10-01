# WP-DS1 status (WIP, not reviewed)

Updated 2026-10-01 by design-lead. Brief: `docs/reports/phase-0-briefs.md`, section "design-lead".
Branch `feat/design-tokens`, worktree `C:\Projects\Rip-PC\.claude\worktrees\design-lead`, pushed to
origin after every step.

| # | Step (brief) | State |
|---|---|---|
| 1 | Merge `claude/keen-lamport-0794zj`, verify, push | **Done** 2026-10-01 (`dcada97`). Verify exit 0 on Windows, Node 24.21.0: typecheck, lint, 17 files / 359 unit tests, build, 112 e2e. Log: `artifacts/wip/WP-DS1/verify-step1.log` |
| 2 | Fallback face calibration (2 attempts, rule 11) | **Next.** Provisional `size-adjust: 102.03%` in `src/styles/tokens.css` |
| 3 | `docs/design/tokens.md`, then wiring notes to build-lead | Not started |
| 4 | `direction.md`: record the pick, keep A and B as history, known gaps | Not started |
| 5 | `docs/design/studio-3d-brief.md` (paid-asset options: a `3d-artist` worker) | Not started |
| 6 | Specs dense view section | Not started |
| 7 | CREDITS row text for the font to data-lead | Not started |
| 8 | Re-run verify, `contrast.mjs --check`, `tokens-check.mjs`; hand off | Not started |

Already done before 2026-10-01 (commits `9cd0985`, `d59bd40`): `src/styles/tokens.css` with the
`@theme` mapping, `base.css`, `motion.ts`, `tokens.test.ts` (93 tests), the Rig Lab Sans woff2 with
`OFL.txt` and `FONTLOG.txt`, `docs/design/tools/tokens-check.mjs`, the contrast check on the shipped
tokens, and the Studio mock's BIOS warning.

**Step 2 plan.** Attempt 1, font files, no browser: harfbuzzjs (WASM) plus wawoff2 in the
scratchpad, outside the repo; shape the Studio mock's visible text in the shipped woff2 (wdth 100,
wght 400) and in `C:\Windows\Fonts\arial.ttf`; size-adjust = width ratio; overrides from the woff2's
own metrics. Attempt 2: Windows Chromium widths through `tokens-check.mjs`.

**Kept outside git** (git-ignored): `artifacts/wip/WP-DS1/` (logs, scripts),
`artifacts/screenshots/phase-0/WP-DS1/` (evidence), `artifacts/cache/fonts/` (source TTF, SHA-256
pinned in `src/styles/fonts/FONTLOG.txt`).
