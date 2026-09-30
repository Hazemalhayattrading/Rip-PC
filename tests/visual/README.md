# Visual regression

Owner: qa-lead (visual-tester). Method: [docs/qa/test-plan.md §11](../../docs/qa/test-plan.md#11-visual-regression).

**Status: scaffolding, no baselines.** The design has not landed (WP-DS1), so there is nothing to
approve yet. Every visual test is skipped unless you point it at a scratch folder.

| File | What it is |
|---|---|
| `visual.ts` | The `test` for visual specs: the shared console fixture, a frozen clock, the rule for where screenshots may run, masks and `expectScreenshot` |
| `routes.spec.ts` | Every page in its default state, one screenshot per page per project |
| `run-in-docker.sh` | Runs the visual projects in `mcr.microsoft.com/playwright:v1.56.1-noble`, the only place baselines are made and compared |
| `__screenshots__/` | Baselines, from Phase 2: `{projectName}/{testFilePath}/{name}.png` |

Projects `visual-390`, `visual-768` and `visual-1440` come from `budget.json` → `visual.viewports`,
with `threshold`, `maxDiffPixelRatio` and the device scale factor from the same place.
They run with reduced motion, `en-US`, UTC, animations disabled and the caret hidden.

## Try it without baselines

```sh
npm run build
QA_SNAPSHOT_DIR=artifacts/visual/try npx playwright test --project='visual-*' --update-snapshots
QA_SNAPSHOT_DIR=artifacts/visual/try npx playwright test --project='visual-*'
```

The first run writes screenshots into the scratch folder, and the second compares against them.
Outside the pinned image this proves the helpers only: those screenshots are never baselines.

## When the design lands (Phase 2)

1. Set `REPO_BASELINES_ENABLED = true` in `visual.ts`.
2. Check `maxDiffPixelRatio` (test plan §11). In the image, capture into a scratch folder with
   `--update-snapshots`. Then run the comparison twice against that capture. Both runs must pass
   at 0.001; if they don't, the pages are not stable enough to be baselines.
3. Run `tests/visual/run-in-docker.sh --update-snapshots`. Review every screenshot, then commit
   with `qa: add visual baselines for <reason>`.
4. Add the CI job from test plan §11, and ask Hazem to make it a required check.
