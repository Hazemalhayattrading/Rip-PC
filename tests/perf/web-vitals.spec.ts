/**
 * Web vitals on the production build (BUILD_PROMPT.md §8): LCP < 2.5 s and CLS < 0.05.
 * INP < 200 ms joins in Phase 2, once the builder has interactions to script (test plan §6.4).
 *
 * Method (docs/qa/test-plan.md §6.4):
 *  - Measured with Google's web-vitals library (attribution IIFE build), injected before any page script.
 *  - Every run is a cold load in a fresh browser context, so the HTTP cache is empty.
 *  - Each route runs at every viewport in budget.json `webVitals.viewports` (390 and 1440, sized by
 *    `visual.viewports`) and every CPU throttle rate (x1 and x4, via Chrome DevTools Protocol). The
 *    phone width is measured here as well because Lighthouse's mobile run missed a late layout
 *    shift that the browser itself reported (test plan §6.3, WP-Q1 mutation M4).
 *  - After load, network idle and a settle period, the page is hidden. That is when web-vitals reports
 *    final LCP and CLS, exactly as when a real visitor leaves.
 *  - The median of `runs` cold loads is compared with the gate. Routes, runs, throttle rates, settle
 *    time and thresholds all come from tests/perf/budget.json.
 *
 * Runs in the Playwright "perf" project against `vite preview` (base /Rip-PC/), never the dev server.
 * Every cold-load context is watched by the shared fixture (tests/e2e/fixtures.ts), so a console
 * error or failed request during a measurement fails the test too.
 * Owner: qa-lead.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Browser } from '@playwright/test';
import { expect, test, type ProblemGuard } from '../e2e/fixtures.ts';

type Op = '<' | '<=' | '>=' | '>';
interface Gate {
  value: number;
  op: Op;
  source: string;
}
interface WebVitalsBudget {
  routes: { name: string; path: string }[];
  viewports: string[];
  runs: number;
  cpuThrottleRates: number[];
  settleMs: number;
  gates: { lcpMs: Gate; cls: Gate; inpMs: Gate };
}
interface Viewport {
  name: string;
  width: number;
  height: number;
  isMobile: boolean;
  hasTouch: boolean;
}
interface VisualBudget {
  viewports: Viewport[];
  deviceScaleFactor: number;
}
interface Shift {
  value: number;
  startTime: number;
  hadRecentInput: boolean;
}
interface VitalsStore {
  lcp: number | null;
  lcpTarget: string | null;
  cls: number | null;
  clsTarget: string | null;
  shifts: Shift[];
  error: string | null;
}
interface Sample {
  lcpMs: number;
  /** The gated value: the larger of web-vitals' CLS and CLS over every shift (see clsOfAllShifts). */
  cls: number;
  webVitalsCls: number;
  allShiftsCls: number;
  /** Shifts Chromium flagged as following input, although this load has none. */
  inputFlaggedShifts: number;
  lcpTarget: string | null;
  clsTarget: string | null;
}

/**
 * Appended to the web-vitals IIFE and run in the page before any other script.
 * The IIFE declares `var webVitals`, and Playwright evaluates init scripts in a function scope, so
 * the library is reachable by that name here but not as self.webVitals (checked 2026-09-30).
 * It also keeps every raw layout-shift entry, for clsOfAllShifts.
 */
const COLLECTOR = `
;(() => {
  if (window.top !== window) return;
  const store = (window.__rigLabVitals = { lcp: null, lcpTarget: null, cls: null, clsTarget: null, shifts: [], error: null });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) store.shifts.push({ value: e.value, startTime: e.startTime, hadRecentInput: e.hadRecentInput });
  }).observe({ type: 'layout-shift', buffered: true });
  if (typeof webVitals === 'undefined') { store.error = 'web-vitals IIFE did not define webVitals'; return; }
  webVitals.onLCP((m) => { store.lcp = m.value; store.lcpTarget = (m.attribution && m.attribution.target) || null; }, { reportAllChanges: true });
  webVitals.onCLS((m) => { store.cls = m.value; store.clsTarget = (m.attribution && m.attribution.largestShiftTarget) || null; }, { reportAllChanges: true });
})();`;

/**
 * CLS over every layout shift, with web-vitals' own session windows (a window closes after a 1 s
 * gap or at 5 s; CLS is the largest window). web-vitals leaves out shifts flagged as following
 * recent input. These loads have no input, yet under mobile emulation Chromium 1194 flags real
 * shifts that way (measured 2026-09-30 at 390 px, test plan §6.4), so the gate counts them too.
 */
function clsOfAllShifts(shifts: readonly Shift[]): number {
  let largest = 0;
  let windowValue = 0;
  let windowStart = 0;
  let previous = 0;
  for (const shift of [...shifts].sort((a, b) => a.startTime - b.startTime)) {
    const continues =
      windowValue > 0 && shift.startTime - previous < 1000 && shift.startTime - windowStart < 5000;
    if (continues) {
      windowValue += shift.value;
    } else {
      windowValue = shift.value;
      windowStart = shift.startTime;
    }
    previous = shift.startTime;
    largest = Math.max(largest, windowValue);
  }
  return largest;
}

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

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid];
  const lower = sorted[mid - 1];
  if (upper === undefined) throw new Error('median of an empty list');
  return sorted.length % 2 === 1 || lower === undefined ? upper : (lower + upper) / 2;
}

async function measureOnce(
  browser: Browser,
  problemGuard: ProblemGuard,
  url: string,
  viewport: Viewport,
  deviceScaleFactor: number,
  cpuRate: number,
  settleMs: number,
  script: string,
): Promise<Sample> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    screen: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    deviceScaleFactor,
  });
  try {
    await problemGuard.watch(context);
    await context.addInitScript({ content: script });
    const page = await context.newPage();
    if (cpuRate > 1) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
    }
    const response = await page.goto(url, { waitUntil: 'load' });
    expect(response?.status(), `${url} must load directly with HTTP 200`).toBe(200);
    const devServer = await page.locator('script[src*="/@vite/client"]').count();
    expect(
      devServer,
      'web vitals must be measured on the production build (vite preview), not the dev server',
    ).toBe(0);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(settleMs);
    // Hide the page: web-vitals reports final LCP and CLS on visibilitychange to hidden.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const store = await page.evaluate(
      () => (window as unknown as { __rigLabVitals?: VitalsStore }).__rigLabVitals ?? null,
    );
    if (store === null)
      throw new Error('the web-vitals collector did not run (was the init script blocked?)');
    if (store.error !== null)
      throw new Error(`the web-vitals library failed to load in the page: ${store.error}`);
    if (store.lcp === null)
      throw new Error('no LCP was reported: the page painted no contentful element');
    if (store.cls === null) {
      throw new Error(
        'no CLS was reported: web-vitals reports CLS only after first contentful paint',
      );
    }
    const allShiftsCls = clsOfAllShifts(store.shifts);
    return {
      lcpMs: store.lcp,
      cls: Math.max(store.cls, allShiftsCls),
      webVitalsCls: store.cls,
      allShiftsCls,
      inputFlaggedShifts: store.shifts.filter((shift) => shift.hadRecentInput).length,
      lcpTarget: store.lcpTarget,
      clsTarget: store.clsTarget,
    };
  } finally {
    await context.close();
  }
}

test('web vitals: LCP and CLS within budget on every route, at every CPU throttle rate', async ({
  browser,
  browserName,
  problemGuard,
}, testInfo) => {
  test.skip(browserName !== 'chromium', 'LCP entries and CPU throttling need Chromium');
  const budgetFile = path.join(path.dirname(testInfo.file), 'budget.json');
  const everything = JSON.parse(readFileSync(budgetFile, 'utf8')) as {
    webVitals: WebVitalsBudget;
    visual: VisualBudget;
  };
  const budget = everything.webVitals;
  const viewports = budget.viewports.map((name) => {
    const viewport = everything.visual.viewports.find((candidate) => candidate.name === name);
    if (viewport === undefined) {
      throw new Error(
        `budget.json webVitals.viewports names "${name}", which visual.viewports lacks`,
      );
    }
    return viewport;
  });
  const baseURL = testInfo.project.use.baseURL;
  if (!baseURL?.endsWith('/')) {
    throw new Error(
      `the perf project needs use.baseURL ending in "/", e.g. http://127.0.0.1:4173/Rip-PC/ (got ${String(baseURL)})`,
    );
  }
  const require = createRequire(testInfo.file);
  let webVitalsDir: string;
  try {
    webVitalsDir = path.dirname(require.resolve('web-vitals'));
  } catch {
    throw new Error(
      'web-vitals is not installed: add "web-vitals": "6.2.2" to devDependencies (docs/qa/test-plan.md, Appendix B)',
    );
  }
  const script =
    readFileSync(path.join(webVitalsDir, 'web-vitals.attribution.iife.js'), 'utf8') + COLLECTOR;
  test.setTimeout(
    budget.routes.length *
      viewports.length *
      budget.cpuThrottleRates.length *
      budget.runs *
      30_000 +
      30_000,
  );

  const results: Record<string, unknown>[] = [];
  const lcpGate = `${budget.gates.lcpMs.op} ${String(budget.gates.lcpMs.value)} ms`;
  const clsGate = `${budget.gates.cls.op} ${String(budget.gates.cls.value)}`;
  for (const route of budget.routes) {
    for (const viewport of viewports) {
      for (const cpuRate of budget.cpuThrottleRates) {
        await measureRoute(route, viewport, cpuRate);
      }
    }
  }
  await testInfo.attach('web-vitals.json', {
    body: JSON.stringify({ budgetFile, gates: budget.gates, results }, null, 2),
    contentType: 'application/json',
  });

  async function measureRoute(
    route: { name: string; path: string },
    viewport: Viewport,
    cpuRate: number,
  ): Promise<void> {
    const where = `${route.name} (${route.path}) at ${viewport.name} px, CPU x${String(cpuRate)}`;
    await test.step(`${where}, median of ${String(budget.runs)} cold loads`, async () => {
      const url = new URL(route.path, baseURL).href;
      const samples: Sample[] = [];
      for (let i = 0; i < budget.runs; i += 1) {
        samples.push(
          await measureOnce(
            browser,
            problemGuard,
            url,
            viewport,
            everything.visual.deviceScaleFactor,
            cpuRate,
            budget.settleMs,
            script,
          ),
        );
      }
      const lcpMs = median(samples.map((s) => s.lcpMs));
      const cls = median(samples.map((s) => s.cls));
      const lcpPass = passes(lcpMs, budget.gates.lcpMs);
      const clsPass = passes(cls, budget.gates.cls);
      const lcpText = `${String(Math.round(lcpMs))} ms`;
      const clsText = cls.toFixed(4);
      results.push({
        route: route.name,
        url,
        viewport: viewport.name,
        cpuRate,
        runs: budget.runs,
        lcpMs: Math.round(lcpMs),
        cls: Number(clsText),
        lcpPass,
        clsPass,
        samples,
      });
      testInfo.annotations.push({
        type: `web-vitals ${route.name} ${viewport.name} px CPU x${String(cpuRate)}`,
        description: `LCP ${lcpText} (${lcpPass ? 'pass' : 'FAIL'}, ${lcpGate}); CLS ${clsText} (${clsPass ? 'pass' : 'FAIL'}, ${clsGate})`,
      });
      const flagged = samples.reduce((sum, s) => sum + s.inputFlaggedShifts, 0);
      if (flagged > 0) {
        testInfo.annotations.push({
          type: `web-vitals ${route.name} ${viewport.name} px CPU x${String(cpuRate)}: input-flagged shifts`,
          description: `Chromium flagged ${String(flagged)} shift(s) as following input on loads with no input; they are counted (web-vitals alone: ${samples.map((s) => s.webVitalsCls.toFixed(4)).join('/')})`,
        });
      }
      const lcpElement = samples[0]?.lcpTarget ?? 'unknown';
      const shiftElement =
        samples[0]?.clsTarget ??
        (flagged > 0 ? 'flagged as following input, see annotations' : 'none');
      expect
        .soft(
          lcpPass,
          `LCP median ${lcpText} must be ${lcpGate} on ${where}; LCP element: ${lcpElement}`,
        )
        .toBe(true);
      expect
        .soft(
          clsPass,
          `CLS median ${clsText} must be ${clsGate} on ${where}; largest shift: ${shiftElement}`,
        )
        .toBe(true);
    });
  }
});
