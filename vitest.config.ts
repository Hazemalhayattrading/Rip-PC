import { configDefaults, defineConfig } from 'vitest/config';

// https://vitest.dev/config/
export default defineConfig({
  test: {
    // Engine, data and state code is pure TypeScript, so unit tests run in Node.
    environment: 'node',
    // QA's tooling tests are tests/**/*.test.mjs.
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'tests/**/*.test.{ts,mts,mjs}'],
    // Playwright specs (*.spec.ts, under tests/e2e, tests/visual, tests/perf) are not Vitest's.
    exclude: [
      ...configDefaults.exclude,
      'tests/e2e/**',
      'tests/visual/**',
      'tests/**/*.spec.*',
      'tests/perf/fixtures/**',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts'],
      reporter: [['text', { skipFull: false }], 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      thresholds: {
        // BUILD_PROMPT §2 Phase 1: the engine is 100% unit-tested. Enforced from day one.
        'src/engine/**': { 100: true },
        // The build store, URL codec and URL sync are pure logic that share links depend on.
        'src/state/**': { 100: true },
      },
    },
  },
});
