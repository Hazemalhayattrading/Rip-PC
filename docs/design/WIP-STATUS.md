# WP-DS1 status: stopped 2026-09-30 (WIP, not reviewed)

Branch `feat/design-tokens`, from `claude/keen-lamport-0794zj` @ 3fe5978. **`npm run verify` passes**
(exit 0: typecheck, ESLint + Prettier, 17 unit files / 359 tests, build, 112 e2e smoke). Log:
`artifacts/wip/WP-DS1/verify.log`.

| # | Deliverable | State |
|---|---|---|
| 1 | `src/styles/tokens.css` + `@theme` | **Done, one value provisional** (fallback size-adjust, below). Proof: `src/styles/tokens.test.ts` (93 tests, Tailwind 4.3.3, 3 mutations caught), `docs/design/tools/tokens-check.mjs` (real Vite build: font URL rewritten, preload rewritten). `contrast.mjs --check` exits 0. Also `src/styles/base.css` (Preflight on + restorations) and `src/styles/motion.ts`. |
| 2 | `docs/design/tokens.md` | Not started |
| 3 | Fonts | **Partial.** `src/styles/fonts/rig-lab-sans.woff2` (Rig Lab Sans, 72,332 bytes, reproducible build), `OFL.txt`, `FONTLOG.txt`, `@font-face` with `swap`. Open: final fallback metrics; LCP write-up |
| 4 | Pick recorded in `direction.md` | Not started |
| 5 | Studio BIOS fix | **Done** in the mock (9cd0985), all sizes re-shot. Open: the known-gaps line. The 9800X3D/9600X mismatch was in the **Bench** mock (lines 551, 587-588, 697); Studio had no BIOS check |
| 6 | `docs/design/studio-3d-brief.md` | Not started |
| 7 | Specs dense view section | Not started |

**When I stopped:** calibrating the fallback face (`Rig Lab Sans Fallback`, a local Arial), about to
shape the Studio mock's text with HarfBuzz.

**Blockers**
- **Fallback size-adjust, 3 attempts.**
  1. Letter-frequency widths gave 104.81%. The browser showed the fallback 3.9% too wide.
  2. The browser corpus ratio gave 102.03%, now in `tokens.css`. The fallback came out 3.9% too
     narrow. Cause: headless Linux Chromium lays out web fonts and `local()` faces with
     integer-pixel advances. Size-adjust 100% and 102.03% both give 1046 px, against 1069.7 px for
     system Arial. So browser widths can't calibrate here, and `tokens-check.mjs` reports
     `calibration.ok: false`.
  3. Installed uharfbuzz 0.56.2 into the scratchpad (not the repo). The script is written but has
     not been run.
- **Context7:** the monthly quota was exceeded (1 attempt). I used the installed Tailwind 4.3.3
  source and compile tests instead.
- **Sandbox:** it refused compound git, sed and python one-liners about 5 times. I used script
  files instead.

**Next steps**
1. `pip install --target <tmp> uharfbuzz`, then run `artifacts/wip/WP-DS1/scripts/corpus.mjs` and
   `hb_calibrate.py`. Put the values into `tokens.css`, and make the calibration in
   `tokens-check.mjs` report-only (integer advances).
2. Write `tokens.md`:
   - token table and usage rules;
   - Preflight on, with `base.css` restoring links, headings, focus and placeholders;
   - build-lead wiring: `tokens.css` imported with no layer (Tailwind refuses `@custom-variant` in
     one), the preload link, and `<html data-theme="dark">`;
   - the `swap`/LCP rationale.
3. `direction.md`: Studio chosen on 2026-09-30, with A and B kept as history. Known gaps: the Bench
   and Folio mocks keep the old BIOS text; Studio's rail now shows 4 rows at 1440 (was 5).
4. `studio-3d-brief.md` and the Specs view section.
5. Re-run verify, contrast and `tokens-check`. Hand off with the CREDITS font row text.

**Kept outside git** (git-ignored, preserved by the Director):
- `artifacts/wip/WP-DS1/`: the verify log and scripts;
- `artifacts/screenshots/phase-0/WP-DS1/`: Studio before and after, the token specimen, `report.json`;
- `artifacts/cache/fonts/`: the source TTF, SHA-256-pinned.
