import path from 'node:path';
import { defineConfig, devices, type PlaywrightTestProject } from '@playwright/test';
import type { ProjectMeta } from '../../lib/project-meta.ts';
import { loadQaBudget } from '../../lib/qa-budget.ts';

// In-app navigation on the live GitHub Pages site (test plan §12.1): tests/e2e/navigation.spec.ts
// in five browsers at the three widths of budget.json, after each milestone deploy and whenever
// a visitor reports a navigation problem. It never runs in `npm run verify`, which tests the local
// production preview. Owner: qa-lead.
//
//   npx playwright install firefox webkit          (once; Chrome and Edge are the installed ones)
//   npx playwright test --config tests/e2e/live/playwright.config.ts
//
// LIVE_URL points it at another deployment of the site. One worker, so the site sees one page at a
// time.

const liveUrl = process.env.LIVE_URL ?? 'https://hazemalhayattrading.github.io/Rip-PC/';
const budget = loadQaBudget();
const meta: ProjectMeta = { theme: 'dark', soakMs: 0 };

interface LiveBrowser {
  readonly name: 'chromium' | 'chrome' | 'msedge' | 'firefox' | 'webkit';
  readonly use: PlaywrightTestProject['use'];
}

const browsers: readonly LiveBrowser[] = [
  {
    // Playwright's own Chromium, as in CI, with WebGL on SwiftShader.
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
  },
  // The installed browsers, on this machine's GPU.
  { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  { name: 'msedge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
];

const projects: PlaywrightTestProject[] = browsers.flatMap((browser) =>
  budget.visual.viewports.map((viewport) => ({
    name: `live-${browser.name}-${viewport.name}`,
    metadata: meta,
    use: {
      ...browser.use,
      viewport: { width: viewport.width, height: viewport.height },
      screen: { width: viewport.width, height: viewport.height },
      // Firefox has no mobile emulation; it still gets touch, so the spec taps there.
      isMobile: browser.name === 'firefox' ? false : viewport.isMobile,
      hasTouch: viewport.hasTouch,
      deviceScaleFactor: budget.visual.deviceScaleFactor,
    },
  })),
);

export default defineConfig({
  testDir: path.resolve(import.meta.dirname, '..'),
  testMatch: /navigation\.spec\.ts$/,
  outputDir: path.resolve(import.meta.dirname, '../../../test-results/live'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: liveUrl, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects,
});
