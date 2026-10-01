/**
 * Unit tests for tests/audit/sample.mjs: the seeded, stratified 10% audit sample (test plan §7).
 * Golden vectors were computed independently with coreutils:
 *   printf '%s\n%s\n%s' "<seed>" "<stratum>" "<id>" | sha256sum
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { auditDefaults, drawSample, rankOf, strataFromDataDir } from './sample.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, 'sample.mjs');
const SEED = `rig-lab-audit:phase-0:${'0'.repeat(40)}`;
const OTHER_SEED = `rig-lab-audit:phase-0:${'f'.repeat(40)}`;
const ids = (n, prefix = 'part') =>
  Array.from({ length: n }, (_, i) => `${prefix}-${String(i).padStart(3, '0')}`);
const temp = [];
afterAll(() => temp.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('sha256-rank-v1', () => {
  it('matches golden vectors computed outside Node (coreutils sha256sum)', () => {
    expect(rankOf(SEED, 'cpu', 'amd-ryzen-7-9800x3d')).toBe(
      '14c473692156e5c0f43d0c395800909fbba5db1e561569e02fc56358d24d3fd2',
    );
    expect(rankOf(SEED, 'price-sa', 'amd-ryzen-7-9800x3d--jarir')).toBe(
      '016aaa3705a1807a1a2dc9cfe50b086f6e015ee406dfcdcd634ee0dc422cf1f3',
    );
  });

  it('takes ceil(10%) per stratum with at least one, and everything from tiny strata', () => {
    const r = drawSample({
      seed: SEED,
      strata: { cpu: ids(37), case: ids(5), fan: ids(1) },
      fraction: 0.1,
      minPerStratum: 1,
    });
    expect(r.strata.cpu.sampleSize).toBe(4); // ceil(3.7)
    expect(r.strata.case.sampleSize).toBe(1); // ceil(0.5)
    expect(r.strata.fan.sampleSize).toBe(1);
    expect(r.totalSample).toBe(6);
    expect(r.totalPopulation).toBe(43);
  });

  it('is deterministic and independent of input order', () => {
    const population = ids(50);
    const a = drawSample({
      seed: SEED,
      strata: { gpu: population },
      fraction: 0.1,
      minPerStratum: 1,
    });
    const b = drawSample({
      seed: SEED,
      strata: { gpu: [...population].reverse() },
      fraction: 0.1,
      minPerStratum: 1,
    });
    expect(b.strata.gpu.sample).toEqual(a.strata.gpu.sample);
    expect(b.strata.gpu.fingerprint).toBe(a.strata.gpu.fingerprint);
  });

  it('depends on the seed, so the commit SHA decides the sample, not the auditor', () => {
    const population = ids(100);
    const a = drawSample({
      seed: SEED,
      strata: { ram: population },
      fraction: 0.1,
      minPerStratum: 1,
    });
    const b = drawSample({
      seed: OTHER_SEED,
      strata: { ram: population },
      fraction: 0.1,
      minPerStratum: 1,
    });
    expect(b.strata.ram.sample.map((s) => s.id)).not.toEqual(a.strata.ram.sample.map((s) => s.id));
  });

  it('keeps every existing rank when records are added (the sample only changes by displacement)', () => {
    const before = drawSample({
      seed: SEED,
      strata: { psu: ids(30) },
      fraction: 0.1,
      minPerStratum: 1,
    });
    const after = drawSample({
      seed: SEED,
      strata: { psu: [...ids(30), ...ids(10, 'new')] },
      fraction: 0.1,
      minPerStratum: 1,
    });
    const rankBefore = Object.fromEntries(before.strata.psu.sample.map((s) => [s.id, s.rank]));
    for (const s of after.strata.psu.sample)
      if (s.id in rankBefore) expect(s.rank).toBe(rankBefore[s.id]);
    // The new sample is exactly the lowest ranks of the new population.
    const all = [...ids(30), ...ids(10, 'new')].map((id) => rankOf(SEED, 'psu', id)).sort();
    expect(after.strata.psu.sample.map((s) => s.rank)).toEqual(
      all.slice(0, after.strata.psu.sampleSize),
    );
  });

  it('ranks the same id differently in different strata', () => {
    expect(rankOf(SEED, 'price-sa', 'x')).not.toBe(rankOf(SEED, 'price-us', 'x'));
  });

  it('rejects a free-form seed, duplicate ids and a bad fraction', () => {
    expect(() =>
      drawSample({ seed: 'lucky-7', strata: { cpu: ids(3) }, fraction: 0.1, minPerStratum: 1 }),
    ).toThrow(/does not match/);
    expect(() =>
      drawSample({ seed: SEED, strata: { cpu: ['a', 'b', 'a'] }, fraction: 0.1, minPerStratum: 1 }),
    ).toThrow(/duplicate ids: a/);
    expect(() =>
      drawSample({ seed: SEED, strata: { cpu: ids(3) }, fraction: 0, minPerStratum: 1 }),
    ).toThrow(/fraction/);
  });

  it('reads its defaults from budget.json (10%, at least 1 per stratum)', () => {
    expect(auditDefaults()).toEqual({ fraction: 0.1, minPerStratum: 1 });
  });
});

describe('inputs and CLI', () => {
  it('builds strata from a data folder, one category per JSON file', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'rig-lab-audit-'));
    temp.push(dir);
    writeFileSync(path.join(dir, 'cpu.json'), JSON.stringify([{ id: 'cpu-a' }, { id: 'cpu-b' }]));
    writeFileSync(path.join(dir, 'gpu-card.json'), JSON.stringify({ records: [{ id: 'card-a' }] }));
    writeFileSync(path.join(dir, 'notes.txt'), 'ignored');
    expect(strataFromDataDir(dir)).toEqual({ cpu: ['cpu-a', 'cpu-b'], 'gpu-card': ['card-a'] });
  });

  it('writes the same sample from the CLI and exits 2 on bad input', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'rig-lab-audit-'));
    temp.push(dir);
    mkdirSync(path.join(dir, 'out'));
    const manifest = path.join(dir, 'strata.json');
    writeFileSync(manifest, JSON.stringify({ strata: { cpu: ids(20), case: ids(5) } }));
    const out = path.join(dir, 'out', 'sample.json');
    const ok = spawnSync(
      process.execPath,
      [CLI, '--seed', SEED, '--manifest', manifest, '--json', out],
      { encoding: 'utf8' },
    );
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain('3 of 25 records');
    const expected = drawSample({
      seed: SEED,
      strata: { cpu: ids(20), case: ids(5) },
      fraction: 0.1,
      minPerStratum: 1,
    });
    expect(JSON.parse(readFileSync(out, 'utf8'))).toEqual(expected);
    const bad = spawnSync(
      process.execPath,
      [CLI, '--seed', 'free-choice', '--manifest', manifest],
      { encoding: 'utf8' },
    );
    expect(bad.status).toBe(2);
    expect(bad.stderr).toMatch(/does not match/);
  });
});
