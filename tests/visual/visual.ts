/**
 * Visual regression (BUILD_PROMPT.md §8 "visual regression screenshots for every step at 390 px,
 * 768 px, 1440 px"; docs/qa/test-plan.md §11). Visual specs import `test` and `expect` from here.
 * The test also carries the shared fixture, so a console error fails a screenshot test too.
 *
 * Phase 0 is scaffolding only: there is no design, so there are no baselines yet. The projects
 * (visual-390, visual-768, visual-1440), thresholds and snapshot paths live in
 * playwright.config.ts and come from budget.json `visual`.
 *
 * Where screenshots may be compared or written:
 * - With QA_SNAPSHOT_DIR set: in that scratch folder, on any machine. For tool proofs and for
 *   calibrating maxDiffPixelRatio (capture twice, compare). Never committed.
 * - Otherwise against the committed baselines in tests/visual/__screenshots__, only inside the
 *   pinned image (tests/visual/run-in-docker.sh), and only once REPO_BASELINES_ENABLED is true.
 *   Screenshots from any other machine differ in fonts and anti-aliasing, so they are not
 *   comparable.
 * The config sets updateSnapshots to 'none': a baseline is only written by an explicit
 * --update-snapshots, which visual-tester runs in the pinned image and reviews diff by diff.
 *
 * Owner: qa-lead (visual-tester).
 */
import { existsSync, readFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { expect, test as e2eTest } from '../e2e/fixtures.ts';

/** The image baselines are made and compared in: Chromium 1194 with Playwright 1.56.1. */
export const PINNED_IMAGE = 'mcr.microsoft.com/playwright:v1.56.1-noble';

/**
 * False until the design lands (WP-DS1 tokens, Phase 2). visual-tester sets it to true in the
 * change that adds the first reviewed baselines.
 */
export const REPO_BASELINES_ENABLED = false;

/** Every screenshot is taken at this instant, so dates never change a pixel (test plan §11). */
export const FROZEN_TIME = '2026-09-30T12:00:00Z';

/**
 * True inside the official Playwright image. Its Dockerfile (utils/docker/Dockerfile.noble at
 * v1.56.1) sets PLAYWRIGHT_BROWSERS_PATH=/ms-playwright and adds the user pwuser.
 */
export function inPinnedImage(): boolean {
  return (
    process.env.PLAYWRIGHT_BROWSERS_PATH === '/ms-playwright' &&
    existsSync('/ms-playwright') &&
    existsSync('/etc/passwd') &&
    readFileSync('/etc/passwd', 'utf8').includes('\npwuser:')
  );
}

export type VisualRunDecision =
  | { readonly run: true; readonly snapshots: string }
  | { readonly run: false; readonly reason: string };

/** Whether visual tests may run here, and against which snapshots. */
export function visualRunDecision(
  env: Readonly<Record<string, string | undefined>> = process.env,
  pinned: boolean = inPinnedImage(),
  repoBaselinesEnabled: boolean = REPO_BASELINES_ENABLED,
): VisualRunDecision {
  const scratch = env.QA_SNAPSHOT_DIR;
  if (scratch !== undefined && scratch !== '') {
    return { run: true, snapshots: `scratch folder ${scratch} (not baselines)` };
  }
  if (!repoBaselinesEnabled) {
    return {
      run: false,
      reason:
        'No visual baselines until the design lands (WP-DS1, Phase 2). To try the scaffolding, set QA_SNAPSHOT_DIR to a scratch folder.',
    };
  }
  if (!pinned) {
    return {
      run: false,
      reason: `The committed baselines are compared only inside ${PINNED_IMAGE}: run tests/visual/run-in-docker.sh.`,
    };
  }
  return { run: true, snapshots: 'tests/visual/__screenshots__' };
}

export const test = e2eTest.extend<{ visualEnvironment: undefined }>({
  visualEnvironment: [
    async ({ page }, use, testInfo) => {
      const decision = visualRunDecision();
      if (!decision.run) {
        testInfo.skip(true, decision.reason);
        return;
      }
      testInfo.annotations.push({ type: 'visual snapshots', description: decision.snapshots });
      await page.clock.setFixedTime(FROZEN_TIME);
      await use(undefined);
    },
    { auto: true, title: 'visual: pinned environment and frozen clock' },
  ],
});

export { expect };

/**
 * What changes between runs of the same build and is masked in every shot: anything marked
 * data-volatile (dates, "Price as of", live prices), and the 3D canvas, which is captured on its
 * own with a looser tolerance from Phase 3.
 */
export function volatileParts(page: Page): Locator[] {
  return [page.locator('[data-volatile]'), page.locator('canvas')];
}

/** Waits until web fonts are ready, so text never changes between shots. */
export async function fontsReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

/**
 * A viewport screenshot compared with its baseline. Thresholds, animations and caret settings
 * come from playwright.config.ts (budget.json `visual`).
 */
export async function expectScreenshot(page: Page, name: string): Promise<void> {
  await fontsReady(page);
  await expect(page).toHaveScreenshot(name, { mask: volatileParts(page), fullPage: false });
}
