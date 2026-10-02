import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Config for the fixture's self-test only (./guard.selftest.ts), run by tests/harness/guard.test.ts.
 * No web server: every page is served by routes, and the made-up origin below is what the
 * fixture treats as same-origin. Owner: qa-lead.
 */
export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: /.*\.selftest\.ts$/,
  outputDir: resolve(import.meta.dirname, '../../../test-results/guard-selftest'),
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 30_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://guard.test/',
  },
});
