/**
 * tests/perf/budget.json is the single source of truth for the BUILD_PROMPT.md §8 numbers.
 * These tests keep it honest: every gate names its source, and the §8 numbers in budget.json match
 * the §8 text. If either side changes alone, this fails and the change goes to the Director.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const budget = JSON.parse(readFileSync(path.join(HERE, 'budget.json'), 'utf8'));
const buildPrompt = readFileSync(path.resolve(HERE, '../../BUILD_PROMPT.md'), 'utf8');
const section8 = buildPrompt.slice(buildPrompt.indexOf('## 8.'), buildPrompt.indexOf('## 9.'));

function number(re) {
  const m = section8.match(re);
  if (!m) throw new Error(`BUILD_PROMPT.md §8 no longer contains ${re}; update budget.json and this test together`);
  return Number(m[1]);
}

/** Every object in budget.json that has an "op" is a gate. */
function gates(node, trail = []) {
  if (!node || typeof node !== 'object') return [];
  const here = 'op' in node ? [{ trail: trail.join('.'), gate: node }] : [];
  return here.concat(...Object.entries(node).map(([k, v]) => gates(v, [...trail, k])));
}

describe('budget.json integrity', () => {
  it('has §8 in BUILD_PROMPT.md to compare against', () => {
    expect(section8).toContain('Quality bars');
  });

  const all = gates(budget);
  it('has gates to check', () => {
    expect(all.length).toBeGreaterThanOrEqual(10);
  });

  for (const { trail, gate } of all) {
    it(`${trail}: numeric value, a known operator and a source`, () => {
      const value = gate.value ?? gate.maxGzipBytes ?? gate.avgFpsMin;
      expect(typeof value).toBe('number');
      expect(['<', '<=', '>=', '>']).toContain(gate.op);
      expect(typeof gate.source).toBe('string');
      expect(gate.source.length).toBeGreaterThan(10);
    });
  }
});

describe('budget.json matches BUILD_PROMPT.md §8', () => {
  it('Lighthouse performance ≥ 90', () => {
    expect(budget.lighthouse.gates.performanceScore.value * 100).toBe(number(/Lighthouse performance ≥ (\d+)/));
    expect(budget.lighthouse.gates.performanceScore.op).toBe('>=');
  });

  it('LCP < 2.5 s (Lighthouse and web-vitals)', () => {
    const ms = number(/LCP < ([\d.]+) s/) * 1000;
    expect(budget.lighthouse.gates.largestContentfulPaintMs).toMatchObject({ value: ms, op: '<' });
    expect(budget.webVitals.gates.lcpMs).toMatchObject({ value: ms, op: '<' });
  });

  it('CLS < 0.05 (Lighthouse and web-vitals)', () => {
    const cls = number(/CLS < ([\d.]+)/);
    expect(budget.lighthouse.gates.cumulativeLayoutShift).toMatchObject({ value: cls, op: '<' });
    expect(budget.webVitals.gates.cls).toMatchObject({ value: cls, op: '<' });
  });

  it('INP < 200 ms, with TBT < 200 ms as its lab proxy', () => {
    const ms = number(/INP < (\d+) ms/);
    expect(budget.webVitals.gates.inpMs).toMatchObject({ value: ms, op: '<' });
    expect(budget.lighthouse.gates.totalBlockingTimeMs).toMatchObject({ value: ms, op: '<' });
    expect(budget.lighthouse.gates.totalBlockingTimeMs.source).toMatch(/web\.dev\/articles\/tbt/);
  });

  it('Initial JS < 250 KB gzip', () => {
    const kb = number(/Initial JS < (\d+) KB gzip/);
    expect(budget.bundle.initialJs.maxGzipBytes).toBe(kb * budget.bundle.gzip.bytesPerKilobyte);
    expect(budget.bundle.initialJs.op).toBe('<');
  });

  it('60 fps on the reference laptop and on desktop, 120 fps on a high-end desktop GPU', () => {
    expect(budget.fps.targets.referenceLaptop.avgFpsMin).toBe(number(/\*\*(\d+) fps\*\* in the 3D garage/));
    expect(budget.fps.targets.desktop.avgFpsMin).toBe(number(/\*\*(\d+) fps\*\* in the 3D garage/));
    expect(budget.fps.targets.highEndDesktop.avgFpsMin).toBe(number(/(\d+) fps on a high-end desktop GPU/));
    expect(section8).toMatch(/Intel Core Ultra 7 155H with Arc iGPU/);
    expect(budget.fps.targets.referenceLaptop.hardware).toMatch(/Core Ultra 7 155H/);
  });

  it('visual regression at 390, 768 and 1440 px', () => {
    const m = section8.match(/at (\d+) px, (\d+) px, (\d+) px/);
    expect(m).not.toBeNull();
    expect(budget.visual.viewports.map((v) => v.width)).toEqual([Number(m[1]), Number(m[2]), Number(m[3])]);
  });

  it('WCAG 2.1 AA with matching axe tags', () => {
    expect(section8).toContain('WCAG 2.1 AA');
    expect(budget.accessibility.standard).toBe('WCAG 2.1 AA');
    expect(budget.accessibility.axeTags).toEqual(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  });

  it('zero console errors and zero unhandled rejections', () => {
    expect(section8).toMatch(/Zero console errors\. Zero unhandled promise rejections\./);
    expect(budget.console).toMatchObject({ maxConsoleErrors: 0, maxPageErrors: 0, maxUnhandledRejections: 0 });
  });

  it('golden tests within ±5% (BUILD_PROMPT.md §5.3)', () => {
    expect(buildPrompt).toMatch(/within ±5%/);
    expect(budget.models.goldenTolerancePct).toBe(5);
  });
});
