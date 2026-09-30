/**
 * Web vitals on the production build (BUILD_PROMPT.md §8): LCP < 2.5 s and CLS < 0.05.
 * INP < 200 ms joins in Phase 2, once the builder has interactions to script (test plan §6.4).
 *
 * Method (docs/qa/test-plan.md §6.4):
 *  - Measured with Google's web-vitals library (attribution IIFE build), injected before any page script.
 *  - Every run is a cold load in a fresh browser context, so the HTTP cache is empty.
 *  - Each route runs at every CPU throttle rate in budget.json (x1 and x4, via Chrome DevTools Protocol).
 *  - After load, network idle and a settle period, the page is hidden. That is when web-vitals reports
 *    final LCP and CLS, exactly as when a real visitor leaves.
 *  - The median of `runs` cold loads is compared with the gate. Routes, runs, throttle rates, settle
 *    time and thresholds all come from tests/perf/budget.json.
 *
 * Runs in the Playwright "perf" project against `vite preview` (base /Rip-PC/), never the dev server.
 * Owner: qa-lead.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { expect, test, type Browser } from '@playwright/test';

type Op = '<' | '<=' | '>=' | '>';
interface Gate {
  value: number;
  op: Op;
  source: string;
}
interface WebVitalsBudget {
  routes: { name: string; path: string }[];
  runs: number;
  cpuThrottleRates: number[];
  settleMs: number;
  gates: { lcpMs: Gate; cls: Gate; inpMs: Gate };
}
interface VitalsStore {
  lcp: number | null;
  lcpTarget: string | null;
  cls: number | null;
  clsTarget: string | null;
  error: string | null;
}
interface Sample {
  lcpMs: number;
  cls: number;
  lcpTarget: string | null;
  clsTarget: string | null;
}

/**
 * Appended to the web-vitals IIFE and run in the page before any other script.
 * The IIFE declares `var webVitals`, and Playwright evaluates init scripts in a function scope, so
 * the library is reachable by that name here but not as self.webVitals (checked 2026-09-30).
 */
const COLLECTOR = `
;(() => {
  if (window.top !== window) return;
  const store = (window.__rigLabVitals = { lcp: null, lcpTarget: null, cls: null, clsTarget: null, error: null });
  if (typeof webVitals === 'undefined') { store.error = 'web-vitals IIFE did not define webVitals'; return; }
  webVitals.onLCP((m) => { store.lcp = m.value; store.lcpTarget = (m.attribution && m.attribution.target) || null; }, { reportAllChanges: true });
  webVitals.onCLS((m) => { store.cls = m.value; store.clsTarget = (m.attribution && m.attribution.largestShiftTarget) || null; }, { reportAllChanges: true });
})();`;

function passes(value: number, gate: Gate): boolean {
  switch (gate.op) {
    case '<':
      return value < gate.value;
    case '<=':
      return value <= gate.value;
    case '>=':
      return value >= gate.value;
    case '>':
      return value > gate.value;
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

async function measureOnce(browser: Browser, url: string, cpuRate: number, settleMs: number, script: string): Promise<Sample> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    await context.addInitScript({ content: script });
    const page = await context.newPage();
    if (cpuRate > 1) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
    }
    const response = await page.goto(url, { waitUntil: 'load' });
    expect(response?.status(), `${url} must load directly with HTTP 200`).toBe(200);
    const devServer = await page.locator('script[src*="/@vite/client"]').count();
    expect(devServer, 'web vitals must be measured on the production build (vite preview), not the dev server').toBe(0);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(settleMs);
    // Hide the page: web-vitals reports final LCP and CLS on visibilitychange to hidden.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const store = await page.evaluate(() => (window as unknown as { __rigLabVitals?: VitalsStore }).__rigLabVitals ?? null);
    expect(store, 'the web-vitals collector did not run (was the init script blocked?)').not.toBeNull();
    expect(store!.error, 'the web-vitals library failed to load in the page').toBeNull();
    expect(store!.lcp, 'no LCP was reported: the page painted no contentful element').not.toBeNull();
    expect(store!.cls, 'no CLS was reported: web-vitals reports CLS only after first contentful paint').not.toBeNull();
    return { lcpMs: store!.lcp!, cls: store!.cls!, lcpTarget: store!.lcpTarget, clsTarget: store!.clsTarget };
  } finally {
    await context.close();
  }
}

test('web vitals: LCP and CLS within budget on every route, at every CPU throttle rate', async ({ browser, browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'LCP entries and CPU throttling need Chromium');
  const budgetFile = path.join(path.dirname(testInfo.file), 'budget.json');
  const budget = (JSON.parse(readFileSync(budgetFile, 'utf8')) as { webVitals: WebVitalsBudget }).webVitals;
  const baseURL = testInfo.project.use.baseURL;
  if (!baseURL || !baseURL.endsWith('/')) {
    throw new Error(`the perf project needs use.baseURL ending in "/", e.g. http://localhost:4173/Rip-PC/ (got ${String(baseURL)})`);
  }
  const require = createRequire(testInfo.file);
  const webVitalsDir = path.dirname(require.resolve('web-vitals'));
  const script = readFileSync(path.join(webVitalsDir, 'web-vitals.attribution.iife.js'), 'utf8') + COLLECTOR;
  test.setTimeout(budget.routes.length * budget.cpuThrottleRates.length * budget.runs * 30_000 + 30_000);

  const results: Array<Record<string, unknown>> = [];
  for (const route of budget.routes) {
    for (const cpuRate of budget.cpuThrottleRates) {
      await test.step(`${route.name} (${route.path}) at CPU x${cpuRate}, median of ${budget.runs} cold loads`, async () => {
        const url = new URL(route.path, baseURL).href;
        const samples: Sample[] = [];
        for (let i = 0; i < budget.runs; i += 1) samples.push(await measureOnce(browser, url, cpuRate, budget.settleMs, script));
        const lcpMs = median(samples.map((s) => s.lcpMs));
        const cls = median(samples.map((s) => s.cls));
        const lcpPass = passes(lcpMs, budget.gates.lcpMs);
        const clsPass = passes(cls, budget.gates.cls);
        results.push({ route: route.name, url, cpuRate, runs: budget.runs, lcpMs: Math.round(lcpMs), cls: Number(cls.toFixed(4)), lcpPass, clsPass, samples });
        testInfo.annotations.push({
          type: `web-vitals ${route.name} CPU x${cpuRate}`,
          description: `LCP ${Math.round(lcpMs)} ms (${lcpPass ? 'pass' : 'FAIL'}, ${budget.gates.lcpMs.op} ${budget.gates.lcpMs.value}); CLS ${cls.toFixed(4)} (${clsPass ? 'pass' : 'FAIL'}, ${budget.gates.cls.op} ${budget.gates.cls.value})`,
        });
        expect.soft(lcpPass, `LCP median ${Math.round(lcpMs)} ms must be ${budget.gates.lcpMs.op} ${budget.gates.lcpMs.value} ms on ${url} at CPU x${cpuRate}; LCP element: ${samples[0]?.lcpTarget ?? 'unknown'}`).toBe(true);
        expect.soft(clsPass, `CLS median ${cls.toFixed(4)} must be ${budget.gates.cls.op} ${budget.gates.cls.value} on ${url} at CPU x${cpuRate}; largest shift: ${samples[0]?.clsTarget ?? 'none'}`).toBe(true);
      });
    }
  }
  await testInfo.attach('web-vitals.json', { body: JSON.stringify({ budgetFile, gates: budget.gates, results }, null, 2), contentType: 'application/json' });
});
