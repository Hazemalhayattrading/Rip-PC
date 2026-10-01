# Rig Lab — Working Agreement

Read `BUILD_PROMPT.md` first. This file is the rules everyone follows, every session, every agent.

## Who's who
- **Hazem**: owner. Final say on scope, licences for paid assets, and anything that costs money.
- **Director**: the lead session. Plans, assigns, reviews, accepts or rejects. Doesn't write feature code itself
  unless a fix is a one-liner that blocks everyone.
- **Leads** (`data-lead`, `build-lead`, `design-lead`, `qa-lead`): own a team, spawn workers as subagents,
  review their workers' output before anything reaches the Director.
- **Workers**: do one well-scoped task, return evidence.

## Golden rules
1. **No number without a source.** Specs, benchmarks, prices: `url + publisher + retrievedAt`. No source, no ship.
2. **Estimates are labelled as estimates.** FPS and render times are shown as ranges with a confidence level.
3. **Evidence, not claims.** Every hand-off includes screenshots, test output, or links. "Should work" is a rejection.
4. **Own your files.** Two agents never edit the same file at the same time. Ownership map below.
5. **Small, reviewable changes.** One feature per branch, `feat/<team>-<topic>`. Merge to `main` only after Director + QA.
6. **Check the docs before coding.** Use Context7 for React, R3F, drei, Tailwind v4, Motion, Vitest, Playwright APIs.
7. **Never break `main`.** `npm run verify` (typecheck + lint + unit + e2e smoke) must pass before merge.
8. **No invented products.** If a part isn't real and currently or recently sold, it doesn't go in the catalogue.
9. **No copied branding.** Study other sites for patterns; never copy their logos, text, or assets.
10. **English only** in the product UI.
11. **No rabbit holes.** If a task hits the same blocker after 2 real attempts (a blocked site, an environment
    difference, a failing tool), stop, record the blocker and what was tried in the hand-off, and move to the
    next task. The Director decides whether to spend more effort on it.
12. **Assume the session can stop at any moment** because of a usage limit. Every agent commits and pushes
    after each finished step. After every accepted task, the Director updates `docs/reports/progress.md` with
    what is done, what is in progress, who was doing it, and the exact next step. On 'continue', read
    `progress.md`, re-spawn needed teammates, and carry on without redoing finished work.

## File ownership
| Path | Owner |
|---|---|
| `src/data/**`, `data/**`, `CREDITS.md` (data rows) | data-lead |
| `src/engine/**` | build-lead (engine-engineer) |
| `src/app/**`, `src/components/**`, `src/state/**` | build-lead (frontend-engineer) |
| `src/three/**`, `public/models/**` | build-lead (3d-engineer) with design-lead (3d-artist) supplying assets |
| `src/styles/**`, `docs/design/**`, design tokens | design-lead |
| `tests/e2e/**`, `tests/visual/**`, `tests/perf/**`, `docs/qa/**` | qa-lead |
| `docs/reports/**`, `BUILD_PROMPT.md`, `CLAUDE.md` | Director |

Cross-team changes (e.g. a new data field the UI needs) go through the owning lead by message.

## Hand-off format (lead → Director)
```
## <task id> — <title>
Status: ready for review
What changed: <files>
Evidence: <screenshot paths / test log / source links>
Known gaps: <honest list, or "none">
```

## Commands
- `npm run dev` · `npm run build` · `npm run test` · `npm run e2e` · `npm run verify`
- Screenshots go to `artifacts/screenshots/<phase>/<task>/` (git-ignored except in reports).

## Performance budget
60 fps 3D on an Intel Arc iGPU laptop, LCP < 2.5 s, CLS < 0.05, INP < 200 ms, initial JS < 250 KB gzip.
Details in `BUILD_PROMPT.md §8`.

## Git
Commit messages: `<team>: <what>`. Push to `main` deploys GitHub Pages; only the Director merges to `main`.
