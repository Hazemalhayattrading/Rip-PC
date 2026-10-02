import { describe, expect, it } from 'vitest';
import { drawSample, mulberry32 } from '../../data/tools/audit-sample.mjs';

/** The audit sampler (`data/tools/audit-sample.mjs`): ceil(20%) per batch, reproducible from its seed. */

const items = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${String(i).padStart(2, '0')}`);

describe('the seeded audit sampler', () => {
  it('draws ceil(20%) of each batch, without repeats, sorted, from the batch', () => {
    const batches = { 'spec:cpu': items('cpu', 17), 'spec:ram': items('ram', 1), 'compat-fixtures': items('fx', 53) };
    const sample = drawSample(batches, 20261002);
    for (const [name, list] of Object.entries(batches)) {
      const b = sample[name];
      expect(b?.population, name).toBe(list.length);
      expect(b?.size, name).toBe(Math.ceil(list.length / 5));
      expect(new Set(b?.ids).size, name).toBe(b?.size);
      expect(b?.ids, name).toEqual([...(b?.ids ?? [])].sort());
      for (const id of b?.ids ?? []) expect(list, name).toContain(id);
    }
  });

  it('gives the same sample for the same seed and data, whatever the input order', () => {
    const a = drawSample({ 'spec:psu': items('psu', 12) }, 7);
    const b = drawSample({ 'spec:psu': items('psu', 12).reverse() }, 7);
    expect(a).toEqual(b);
    expect(drawSample({ 'spec:psu': items('psu', 12) }, 8)).not.toEqual(a);
  });

  it('uses one generator for the whole draw, in key order', () => {
    const both = drawSample({ first: items('a', 10), second: items('b', 10) }, 99);
    const alone = drawSample({ second: items('b', 10) }, 99);
    expect(both.second).not.toEqual(alone.second);
  });

  it('has a uniform-looking generator in [0, 1)', () => {
    const rng = mulberry32(1);
    const draws = Array.from({ length: 2000 }, rng);
    expect(Math.min(...draws)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...draws)).toBeLessThan(1);
    const mean = draws.reduce((s, x) => s + x, 0) / draws.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});
