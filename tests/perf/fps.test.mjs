/**
 * Unit tests for the fps tooling: the statistics in tests/perf/fps-meter.js (loaded into a Node
 * sandbox, the same file the browser runs) and the verdict rules in tests/perf/fps-probe.mjs.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { defaultOut, loadFpsBudget, verdictFor } from './fps-probe.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(path.join(HERE, 'fps-meter.js'), 'utf8'), sandbox);
const meter = sandbox.window.__rigLabFpsMeter;
const fps = loadFpsBudget();

/** Timestamps from a list of frame intervals (ms). */
const stampsFrom = (intervals) =>
  intervals.reduce((acc, d) => [...acc, acc[acc.length - 1] + d], [1000]);

describe('fps-meter summarize', () => {
  it('steady 60 Hz frames give 60 fps average, 1% low and min', () => {
    const s = meter.summarize(stampsFrom(Array(120).fill(1000 / 60)));
    expect(s.frames).toBe(121);
    expect(s.avgFps).toBeCloseTo(60, 1);
    expect(s.onePercentLowFps).toBeCloseTo(60, 1);
    expect(s.minFps).toBeCloseTo(60, 1);
    expect(s.framesOverPct).toBe(0);
  });

  it('1% low is 1000 / nearest-rank p99 interval: one hitch in 100 intervals shows only in min fps', () => {
    // 100 intervals: p99 is the 99th smallest, so a single 100 ms hitch sits above it.
    const one = meter.summarize(stampsFrom([...Array(99).fill(10), 100]));
    expect(one.avgFps).toBeCloseTo((100 / (99 * 10 + 100)) * 1000, 1); // 91.74 fps
    expect(one.onePercentLowFps).toBe(100);
    expect(one.minFps).toBe(10);
    // Two hitches: the 99th smallest interval is now a hitch.
    const two = meter.summarize(stampsFrom([...Array(98).fill(10), 100, 100]));
    expect(two.onePercentLowFps).toBe(10);
    expect(two.p99Ms).toBe(100);
  });

  it('uses nearest-rank percentiles', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(meter.percentile(sorted, 0.5)).toBe(5);
    expect(meter.percentile(sorted, 0.95)).toBe(10);
    expect(meter.percentile(sorted, 0.99)).toBe(10);
    expect(meter.percentile(sorted, 0.1)).toBe(1);
  });

  it('counts frames that missed a 60 Hz deadline (> 25 ms), not vsync jitter around 16.7 ms', () => {
    const s = meter.summarize(stampsFrom([16, 17.2, 16.1, 40, 16.9, 16, 16.4, 16, 16, 34]));
    expect(s.framesOverMs).toBe(25);
    expect(s.framesOverPct).toBe(20);
    expect(s.maxMs).toBe(40);
    expect(s.minFps).toBe(25);
  });

  it('refuses fewer than 3 frames', () => {
    expect(() => meter.summarize([0, 16])).toThrow(/fewer than 3 frames/);
  });

  it('takes the median of every numeric field across runs', () => {
    const m = meter.medianOf([
      { avgFps: 50, p99Ms: 30 },
      { avgFps: 70, p99Ms: 20 },
      { avgFps: 60, p99Ms: 25 },
    ]);
    expect(m).toEqual({ avgFps: 60, p99Ms: 25 });
  });
});

describe('fps-probe verdicts', () => {
  const base = {
    renderer:
      'ANGLE (Intel, Intel(R) Arc(TM) Graphics (0x00007D55) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    expectRenderer: 'Arc',
    targetFps: 60,
    maxRunSpreadPct: fps.maxRunSpreadPct,
  };

  it('reference: PASS when the median average meets the target', () => {
    const v = verdictFor({
      ...base,
      mode: 'reference',
      medianAvgFps: 71.2,
      calibrationFps: 480,
      runAvgFps: [70.1, 71.2, 72.0],
    });
    expect(v.verdict).toBe('PASS');
  });

  it('reference: PASS is still proven when the frame rate is capped (a cap only lowers the average)', () => {
    const v = verdictFor({
      ...base,
      mode: 'reference',
      targetFps: 60,
      medianAvgFps: 119.5,
      calibrationFps: 120,
      runAvgFps: [119.4, 119.5, 119.6],
    });
    expect(v.verdict).toBe('PASS');
  });

  it('reference: FAIL below target when the browser was not capped', () => {
    const v = verdictFor({
      ...base,
      mode: 'reference',
      medianAvgFps: 48.3,
      calibrationFps: 480,
      runAvgFps: [47.9, 48.3, 49.0],
    });
    expect(v.verdict).toBe('FAIL');
  });

  it('reference: INCONCLUSIVE below target when the frame rate is capped near the target', () => {
    const v = verdictFor({
      ...base,
      mode: 'reference',
      medianAvgFps: 59.6,
      calibrationFps: 60,
      runAvgFps: [59.5, 59.6, 59.8],
    });
    expect(v.verdict).toBe('INCONCLUSIVE');
    expect(v.reasons.join(' ')).toMatch(/capped/);
  });

  it('reference: INVALID on software rendering (hardware acceleration off)', () => {
    for (const renderer of [
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
      'llvmpipe (LLVM 15.0.7, 256 bits)',
      'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)',
      null,
    ]) {
      expect(
        verdictFor({
          ...base,
          renderer,
          mode: 'reference',
          medianAvgFps: 200,
          calibrationFps: 500,
          runAvgFps: [200, 200, 200],
        }).verdict,
      ).toBe('INVALID');
    }
  });

  it('reference: INVALID on the wrong GPU (a hybrid laptop running on its discrete GPU)', () => {
    const v = verdictFor({
      ...base,
      renderer:
        'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)',
      mode: 'reference',
      medianAvgFps: 140,
      calibrationFps: 500,
      runAvgFps: [139, 140, 141],
    });
    expect(v.verdict).toBe('INVALID');
    expect(v.reasons.join(' ')).toMatch(/not the expected "Arc"/);
  });

  it('any mode: INCONCLUSIVE when runs disagree (seen with uncapped SwiftShader: 379, 3.8, 2.2 fps)', () => {
    expect(
      verdictFor({
        ...base,
        mode: 'reference',
        medianAvgFps: 3.84,
        calibrationFps: 58,
        runAvgFps: [379.32, 3.84, 2.18],
      }).verdict,
    ).toBe('INCONCLUSIVE');
    expect(
      verdictFor({
        ...base,
        mode: 'ci',
        medianAvgFps: 3.84,
        calibrationFps: 58,
        runAvgFps: [379.32, 3.84, 2.18],
      }).verdict,
    ).toBe('INCONCLUSIVE');
  });

  it('ci: PROXY, never PASS, and a regression is flagged but non-blocking until calibrated', () => {
    expect(
      verdictFor({
        ...base,
        mode: 'ci',
        medianAvgFps: 5.3,
        calibrationFps: 60,
        runAvgFps: [5.2, 5.3, 5.4],
      }).verdict,
    ).toBe('PROXY');
    const drop = verdictFor({
      ...base,
      mode: 'ci',
      medianAvgFps: 4.0,
      calibrationFps: 60,
      runAvgFps: [4.0, 4.0, 4.1],
      baselineAvgFps: 5.3,
      maxRegressionPct: 10,
      regressionBlocking: false,
    });
    expect(drop).toMatchObject({ verdict: 'PROXY', regression: true });
    const blocking = verdictFor({
      ...base,
      mode: 'ci',
      medianAvgFps: 4.0,
      calibrationFps: 60,
      runAvgFps: [4.0, 4.0, 4.1],
      baselineAvgFps: 5.3,
      maxRegressionPct: 10,
      regressionBlocking: true,
    });
    expect(blocking.verdict).toBe('FAIL');
    const ok = verdictFor({
      ...base,
      mode: 'ci',
      medianAvgFps: 5.2,
      calibrationFps: 60,
      runAvgFps: [5.1, 5.2, 5.3],
      baselineAvgFps: 5.3,
      maxRegressionPct: 10,
    });
    expect(ok).toMatchObject({ verdict: 'PROXY', regression: false });
  });

  it('names reference runs by UTC minute, so the sustained re-run never overwrites the first', () => {
    const run = (recordedAt) =>
      defaultOut({
        recordedAt,
        mode: 'reference',
        target: { name: 'referenceLaptop' },
        device: { label: 'Acme Book 14, Core Ultra 7 155H' },
        method: { cpuThrottle: 1 },
      });
    const first = run('2026-09-30T18:45:12.345Z');
    const second = run('2026-09-30T18:51:02.001Z');
    expect(path.basename(first)).toBe(
      '2026-09-30T1845Z-referenceLaptop-acme-book-14-core-ultra-7-155h.json',
    );
    expect(first).toContain(path.join('docs', 'qa', 'perf-runs'));
    expect(second).not.toBe(first);
  });

  it('reads its targets from budget.json (60 / 60 / 120 fps, Arc expected on the laptop)', () => {
    expect(fps.targets.referenceLaptop).toMatchObject({ avgFpsMin: 60, expectRenderer: 'Arc' });
    expect(fps.targets.desktop.avgFpsMin).toBe(60);
    expect(fps.targets.highEndDesktop.avgFpsMin).toBe(120);
    expect(fps.ciProxy.blocking).toBe(false);
  });
});
