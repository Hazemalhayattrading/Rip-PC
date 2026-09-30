import { createHash } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';
import { BASE_PATH } from './src/app/routes.ts';

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
const siteUrl = `http://127.0.0.1:${String(port)}${BASE_PATH}`;
const isCI = process.env.CI !== undefined;

// https://playwright.dev/docs/test-configuration
// Tests run against the production build served by `vite preview`, which answers like GitHub
// Pages (see scripts/vite/github-pages-preview.ts). Run `npm run build` first.
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: 2,
  reporter: isCI
    ? [['list'], ['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  use: {
    baseURL: siteUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${String(port)} --strictPort`,
    url: siteUrl,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
