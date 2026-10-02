/**
 * The Lighthouse CI config must be derived from tests/perf/budget.json, never hand-typed.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const budget = JSON.parse(readFileSync(path.join(HERE, 'budget.json'), 'utf8'));
const {
  buildLhciConfig,
  maxFor,
  minScoreFor,
  portForThisCheckout,
  PREVIEW,
} = require('./lhci-config.cjs');
const mobile = require(path.join(ROOT, 'lighthouserc.cjs'));
const desktop = require(path.join(ROOT, 'lighthouserc.desktop.cjs'));

describe('lighthouserc.cjs and lighthouserc.desktop.cjs', () => {
  it('audit the landing page under the GitHub Pages base path, served by vite preview', () => {
    for (const cfg of [mobile, desktop]) {
      expect(cfg.ci.collect.url).toEqual([`${PREVIEW.origin}/Rip-PC/`]);
      expect(cfg.ci.collect.startServerCommand).toBe(PREVIEW.command);
      expect(cfg.ci.collect.numberOfRuns).toBe(budget.lighthouse.numberOfRuns);
    }
  });

  it("serve the preview on this checkout's own port, so worktrees on one machine never collide", () => {
    const port = portForThisCheckout();
    expect(port).toBe(portForThisCheckout());
    // Playwright's preview takes 20000-29999 (playwright.config.ts); Windows' dynamic range starts at 49152.
    expect(port).toBeGreaterThanOrEqual(30_000);
    expect(port).toBeLessThan(40_000);
    expect(PREVIEW.origin).toBe(`http://127.0.0.1:${String(process.env.LHCI_PORT ?? port)}`);
    expect(PREVIEW.command).toBe(
      `npm run preview -- --host 127.0.0.1 --port ${String(process.env.LHCI_PORT ?? port)} --strictPort`,
    );
  });

  it('use Lighthouse mobile defaults for mobile and the desktop preset for desktop', () => {
    expect(mobile.ci.collect.settings.preset).toBeUndefined();
    expect(desktop.ci.collect.settings.preset).toBe('desktop');
    expect(mobile.ci.upload.outputDir).not.toBe(desktop.ci.upload.outputDir);
  });

  it('assert every gate at error level with the median of the runs (LHCI defaults to optimistic)', () => {
    for (const cfg of [mobile, desktop]) {
      const a = cfg.ci.assert.assertions;
      expect(Object.keys(a).sort()).toEqual([
        'categories:performance',
        'cumulative-layout-shift',
        'largest-contentful-paint',
        'total-blocking-time',
      ]);
      for (const [level, opts] of Object.values(a)) {
        expect(level).toBe('error');
        expect(opts.aggregationMethod).toBe('median');
      }
      expect(a['categories:performance'][1].minScore).toBe(
        budget.lighthouse.gates.performanceScore.value,
      );
    }
  });

  it('turn strict "<" gates into a ceiling just below the §8 number, and ">=" into minScore', () => {
    const g = budget.lighthouse.gates;
    const a = mobile.ci.assert.assertions;
    expect(a['largest-contentful-paint'][1].maxNumericValue).toBeLessThan(
      g.largestContentfulPaintMs.value,
    );
    expect(a['largest-contentful-paint'][1].maxNumericValue).toBeGreaterThan(
      g.largestContentfulPaintMs.value - 0.001,
    );
    expect(a['cumulative-layout-shift'][1].maxNumericValue).toBeLessThan(
      g.cumulativeLayoutShift.value,
    );
    expect(a['cumulative-layout-shift'][1].maxNumericValue).toBeGreaterThan(
      g.cumulativeLayoutShift.value - 1e-6,
    );
    expect(a['total-blocking-time'][1].maxNumericValue).toBeLessThan(g.totalBlockingTimeMs.value);
    expect(maxFor({ value: 10, op: '<=' })).toBe(10);
    expect(() => maxFor({ value: 10, op: '>=' })).toThrow();
    expect(minScoreFor({ value: 0.9, op: '>=' })).toBe(0.9);
    expect(() => minScoreFor({ value: 0.9, op: '<' })).toThrow();
  });

  it('refuses a preset that budget.json does not list', () => {
    expect(() => buildLhciConfig({ preset: 'tablet' })).toThrow(/not listed/);
  });
});
