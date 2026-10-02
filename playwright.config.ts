import { createHash } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';
import { BASE_PATH } from './src/app/routes.ts';
import { THEME_STORAGE_KEY, type Theme } from './src/state/theme.ts';
import type { ProjectMeta } from './tests/lib/project-meta.ts';
import { loadQaBudget, type ViewportSpec } from './tests/lib/qa-budget.ts';

/**
 * A stable port per checkout, derived from this directory's path, so several git worktrees on
 * one machine can run `npm run verify` at the same time without their preview servers
 * colliding. Set E2E_PORT to override.
 */
function portForThisCheckout(): number {
  const digest = createHash('sha256')
    .update(import.meta.dirname)
    .digest();
  return 20_000 + (digest.readUInt16BE(0) % 10_000);
}

const port = Number(process.env.E2E_PORT ?? portForThisCheckout());
const siteOrigin = `http://127.0.0.1:${String(port)}`;
const siteUrl = `${siteOrigin}${BASE_PATH}`;
const isCI = process.env.CI !== undefined;

/** Viewports, themes and visual thresholds: tests/perf/budget.json, the single source of truth. */
const budget = loadQaBudget();

const chromium = {
  ...devices['Desktop Chrome'],
  launchOptions: {
    // CI runners and this container have no GPU, so WebGL runs on SwiftShader. Opting in
    // explicitly keeps that working as Chromium phases out its automatic software fallback,
    // and stops the deprecation warning it logs.
    args: ['--enable-unsafe-swiftshader'],
  },
};

/**
 * Traces of failed tests. Under mobile emulation, while a trace records DOM snapshots, Chromium
 * 1194 flagged the layout shifts we measured as "recent input", which takes them out of CLS. A
 * CLS check at 390 px would then pass on a page that shifts (2026-09-30, test plan §6.4).
 * Mobile projects therefore keep screenshots and network in their traces, without DOM snapshots.
 * Chromium sometimes flags shifts that way with no trace at all, so the CLS checks also count
 * flagged shifts themselves.
 */
function traceFor(viewport: ViewportSpec) {
  return viewport.isMobile
    ? { mode: 'retain-on-failure' as const, snapshots: false }
    : ('retain-on-failure' as const);
}

/** Chromium at one of the widths in budget.json `visual.viewports` (test plan §5). */
function sizedAt(viewport: ViewportSpec) {
  return {
    ...chromium,
    viewport: { width: viewport.width, height: viewport.height },
    screen: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    deviceScaleFactor: budget.visual.deviceScaleFactor,
    trace: traceFor(viewport),
  };
}

/**
 * The test plan §5 matrix: what each width and theme runs on every push and PR.
 * - Dark at 390 and 1440 runs everything. Dark at 768 runs only axe (and, from Phase 2, the
 *   keyboard path).
 * - Light runs only axe: contrast depends on the theme, layout does not.
 * The other suites run in every cell in the full matrix, which E2E_FULL_MATRIX=1 turns on (the
 * nightly job, from Phase 2).
 */
const fullMatrix = process.env.E2E_FULL_MATRIX === '1';
function pullRequestSuites(viewport: ViewportSpec, theme: Theme): RegExp | undefined {
  if (theme === 'light') return /@a11y/;
  return viewport.name === '768' ? /@a11y|@keyboard/ : undefined;
}

/**
 * Each e2e project is one width and one theme from budget.json `visual.themes`. Dark is what every
 * first visit gets, so a dark project starts with nothing stored. A light project starts with the
 * visitor's stored choice, which the inline script in index.html restores before the first paint
 * (src/state/theme.ts); the a11y spec checks that the page really shows the project's theme.
 */
const LIGHT_THEME_STATE = {
  cookies: [],
  origins: [{ origin: siteOrigin, localStorage: [{ name: THEME_STORAGE_KEY, value: 'light' }] }],
};

/** The dark project at a soak width keeps watching each route a little longer (QA-P0-005). */
function metaFor(viewport: ViewportSpec, theme: Theme): ProjectMeta {
  const soaks = theme === 'dark' && budget.console.soakViewports.includes(viewport.name);
  return { theme, soakMs: soaks ? budget.console.soakMs : 0 };
}

/**
 * Visual baselines live in tests/visual/__screenshots__ (test plan §11). QA_SNAPSHOT_DIR points
 * them at a scratch folder instead, for tool proofs and calibration (tests/visual/visual.ts).
 */
const snapshotRoot = process.env.QA_SNAPSHOT_DIR ?? 'tests/visual/__screenshots__';

// https://playwright.dev/docs/test-configuration
// Tests run against the production build served by `vite preview`, which answers like GitHub
// Pages (see scripts/vite/github-pages-preview.ts). Run `npm run build` first.
export default defineConfig({
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  // Locally 2: this machine's 4 CPUs are shared by every team (plan §7). In CI every core: the
  // repository is public, so ubuntu-24.04 runners have 4.
  workers: isCI ? '100%' : 2,
  reporter: isCI
    ? [['list'], ['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  use: {
    baseURL: siteUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // A baseline is only ever written by an explicit --update-snapshots (tests/visual/README.md).
  updateSnapshots: 'none',
  snapshotPathTemplate: `${snapshotRoot}/{projectName}/{testFilePath}/{arg}{ext}`,
  expect: {
    toHaveScreenshot: {
      threshold: budget.visual.threshold,
      maxDiffPixelRatio: budget.visual.maxDiffPixelRatio,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  projects: [
    // e2e-390-dark, e2e-390-light, … e2e-1440-light: smoke, axe and (from Phase 2) builder flows.
    ...budget.visual.viewports.flatMap((viewport) =>
      budget.visual.themes.map((theme) => {
        const onlyThese = fullMatrix ? undefined : pullRequestSuites(viewport, theme);
        return {
          name: `e2e-${viewport.name}-${theme}`,
          testDir: 'tests/e2e',
          metadata: metaFor(viewport, theme),
          ...(onlyThese === undefined ? {} : { grep: onlyThese }),
          use: {
            ...sizedAt(viewport),
            ...(theme === 'light' ? { storageState: LIGHT_THEME_STATE } : {}),
          },
        };
      }),
    ),
    // Web vitals on the production preview (test plan §6.4). Run with `npm run perf:vitals`.
    // No trace: tracing costs CPU during the loads it would measure, and its DOM snapshots hide
    // layout shifts at the phone width (see traceFor). The spec attaches every sample instead.
    {
      name: 'perf',
      testDir: 'tests/perf',
      testMatch: /.*\.spec\.ts$/,
      fullyParallel: false,
      use: { ...chromium, trace: 'off' },
    },
    // visual-390, visual-768, visual-1440: skipped until the design lands (tests/visual/visual.ts).
    ...budget.visual.viewports.map((viewport) => ({
      name: `visual-${viewport.name}`,
      testDir: 'tests/visual',
      use: {
        ...sizedAt(viewport),
        locale: 'en-US',
        timezoneId: 'UTC',
        reducedMotion: 'reduce' as const,
      },
    })),
  ],
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${String(port)} --strictPort`,
    url: siteUrl,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
