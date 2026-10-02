'use strict';
/**
 * Builds the Lighthouse CI config from tests/perf/budget.json, the single source of truth.
 * Used by lighthouserc.cjs (mobile preset, the default) and lighthouserc.desktop.cjs.
 * Owner: qa-lead. No numbers are typed here: runs, aggregation, routes and every threshold come
 * from budget.json (lighthouse.*), and the base path from bundle.basePath.
 *
 * Chrome: LHCI launches the browser at $CHROME_PATH. CI sets it to the Chromium that
 * @playwright/test@1.56.1 installs (Chromium 1194), and so did the cloud container. Without it, LHCI
 * finds installed Google Chrome, as on the home PC (docs/qa/test-plan.md §6.3).
 */
const { createHash } = require('node:crypto');
const path = require('node:path');
const budget = require('./budget.json');

/**
 * A stable port per checkout, derived from the repository root's path, so several git worktrees
 * on one machine can run Lighthouse at the same time. A fixed 4173 made two teams' runs collide on
 * the home PC (2026-10-01). playwright.config.ts derives its preview port the same way in
 * 20000-29999; this takes 30000-39999, so the two never clash within a checkout. Below Windows'
 * dynamic range (49152 and up).
 */
function portForThisCheckout() {
  const digest = createHash('sha256')
    .update(path.resolve(__dirname, '..', '..'))
    .digest();
  return 30_000 + (digest.readUInt16BE(0) % 10_000);
}

/**
 * `vite preview` serves the production build under the base path, answering like GitHub Pages
 * (build-lead's scripts/vite/github-pages-preview.ts). 127.0.0.1 rather than localhost because the
 * cloud container had no IPv6. --strictPort fails loudly on a clash; LHCI_PORT overrides the port.
 */
const port = Number(process.env.LHCI_PORT ?? portForThisCheckout());
const PREVIEW = {
  origin: `http://127.0.0.1:${String(port)}`,
  command: `npm run preview -- --host 127.0.0.1 --port ${String(port)} --strictPort`,
  // vite preview prints "  ➜  Local:   http://127.0.0.1:<port>/Rip-PC/" when it is ready.
  readyPattern: 'Local',
  readyTimeoutMs: 60000,
};

/**
 * LHCI's maxNumericValue passes when value <= max. The §8 bars are strict ("LCP < 2.5 s"), so for a
 * "<" gate the ceiling is moved just below the number. The difference is far below Lighthouse's
 * own precision; it only decides the exact-equality case the way §8 words it.
 */
function maxFor(gate) {
  if (gate.op === '<=') return gate.value;
  if (gate.op === '<') return gate.value - Math.max(Math.abs(gate.value) * 1e-9, 1e-12);
  throw new Error(`lighthouse gate op "${gate.op}" cannot be expressed as a maximum`);
}

/** LHCI's minScore passes when score >= min, which is exactly a ">=" gate. */
function minScoreFor(gate) {
  if (gate.op !== '>=') throw new Error(`lighthouse score gate op "${gate.op}" must be ">="`);
  return gate.value;
}

/** @param {{ preset: 'mobile' | 'desktop' }} options */
function buildLhciConfig({ preset }) {
  const lh = budget.lighthouse;
  if (!lh.presets.includes(preset)) {
    throw new Error(
      `preset "${preset}" is not listed in budget.json lighthouse.presets (${lh.presets.join(', ')})`,
    );
  }
  const base = budget.bundle.basePath;
  const url = lh.routes.map(
    (route) => new URL(route.replace(/^\//, ''), PREVIEW.origin + base).href,
  );
  const aggregationMethod = lh.aggregationMethod;
  const g = lh.gates;
  return {
    ci: {
      collect: {
        startServerCommand: PREVIEW.command,
        startServerReadyPattern: PREVIEW.readyPattern,
        startServerReadyTimeout: PREVIEW.readyTimeoutMs,
        url,
        numberOfRuns: lh.numberOfRuns,
        settings: {
          // Lighthouse has no "mobile" preset: mobile is its default (simulated slow 4G, 4x CPU slowdown).
          ...(preset === 'desktop' ? { preset: 'desktop' } : {}),
          // Chrome's sandbox fails as root in containers and under Ubuntu 24.04's AppArmor rules.
          chromeFlags: '--no-sandbox',
        },
      },
      assert: {
        assertions: {
          'categories:performance': [
            'error',
            { minScore: minScoreFor(g.performanceScore), aggregationMethod },
          ],
          'largest-contentful-paint': [
            'error',
            { maxNumericValue: maxFor(g.largestContentfulPaintMs), aggregationMethod },
          ],
          'cumulative-layout-shift': [
            'error',
            { maxNumericValue: maxFor(g.cumulativeLayoutShift), aggregationMethod },
          ],
          'total-blocking-time': [
            'error',
            { maxNumericValue: maxFor(g.totalBlockingTimeMs), aggregationMethod },
          ],
        },
      },
      upload: {
        target: 'filesystem',
        outputDir: path.join('artifacts', 'lhci', preset),
        reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%.report.%%EXTENSION%%',
      },
    },
  };
}

module.exports = { buildLhciConfig, maxFor, minScoreFor, portForThisCheckout, PREVIEW };
