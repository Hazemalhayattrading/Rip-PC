/**
 * The audit-sample manifest builder (docs/qa/test-plan.md §7.2): one stratum per data file, with
 * keys for the records that carry no id.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { StrataError, strataFromDataRoot } from './strata.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, 'strata.mjs');
const dirs = [];

/** A tiny data folder in the Rig Lab layout. */
function dataRoot(overrides = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'rig-lab-strata-'));
  dirs.push(root);
  const files = {
    'parts/cpu.json': {
      schemaVersion: 1,
      category: 'cpu',
      items: [{ id: 'amd-ryzen-7-9800x3d' }, { id: 'intel-core-ultra-7-265k' }],
    },
    'parts/case-fan.json': { schemaVersion: 1, category: 'case-fan', items: [{ id: 'fan-a' }] },
    'benchmarks/game.json': { schemaVersion: 1, items: [{ id: 'bench-1' }, { id: 'bench-2' }] },
    'prices/sa.json': {
      schemaVersion: 1,
      market: 'SA',
      observations: [
        { partId: 'amd-ryzen-7-9800x3d', retailer: 'amazon-sa', retrievedAt: '2026-09-30' },
        { partId: 'amd-ryzen-7-9800x3d', retailer: 'jarir', retrievedAt: '2026-09-30' },
      ],
      gaps: [{ partId: 'fan-a', checkedAt: '2026-09-30' }],
    },
    'games.json': { schemaVersion: 1, games: [{ id: 'counter-strike-2' }], considered: [{}] },
    'publishers.json': { schemaVersion: 1, publishers: [{ id: 'amd' }] },
    ...overrides,
  };
  for (const [rel, body] of Object.entries(files)) {
    if (body === undefined) continue;
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), JSON.stringify(body));
  }
  return root;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('strataFromDataRoot', () => {
  it('makes one stratum per data file, named by its path under data/', () => {
    const strata = strataFromDataRoot(dataRoot());
    expect(Object.keys(strata).sort()).toEqual([
      'benchmarks/game',
      'games',
      'parts/case-fan',
      'parts/cpu',
      'prices/sa',
    ]);
    expect(strata['parts/cpu']).toEqual(['amd-ryzen-7-9800x3d', 'intel-core-ultra-7-265k']);
    expect(strata['benchmarks/game']).toEqual(['bench-1', 'bench-2']);
    expect(strata.games).toEqual(['counter-strike-2']);
  });

  it('keys a price by its capture name and a gap record by its part, in one stratum per market', () => {
    expect(strataFromDataRoot(dataRoot())['prices/sa']).toEqual([
      'amd-ryzen-7-9800x3d--amazon-sa--2026-09-30',
      'amd-ryzen-7-9800x3d--jarir--2026-09-30',
      'gap--fan-a',
    ]);
  });

  it('leaves out the source registry and the games considered but not listed', () => {
    const strata = strataFromDataRoot(dataRoot());
    expect(strata).not.toHaveProperty('publishers');
    expect(strata.games).toHaveLength(1);
  });

  it('refuses a record with no id, a price with no key fields, and an unknown file', () => {
    expect(() =>
      strataFromDataRoot(dataRoot({ 'parts/ram.json': { items: [{ name: 'x' }] } })),
    ).toThrow(StrataError);
    expect(() =>
      strataFromDataRoot(
        dataRoot({ 'prices/us.json': { observations: [{ partId: 'a' }], gaps: [] } }),
      ),
    ).toThrow(/retailer/);
    expect(() => strataFromDataRoot(dataRoot({ 'extra.json': { items: [] } }))).toThrow(
      /not a known data file/,
    );
  });

  it('refuses a duplicate key, which would make the sample ambiguous', () => {
    const dupe = {
      schemaVersion: 1,
      market: 'SA',
      observations: [],
      gaps: [{ partId: 'fan-a' }, { partId: 'fan-a' }],
    };
    expect(() => strataFromDataRoot(dataRoot({ 'prices/sa.json': dupe }))).toThrow(/duplicate/);
  });
});

describe('the CLI', () => {
  it('writes { strata } for sample.mjs, and exits 2 on bad input', () => {
    const root = dataRoot();
    const out = path.join(root, 'out', 'strata.json');
    const ok = spawnSync(process.execPath, [CLI, '--data-dir', root, '--out', out], {
      encoding: 'utf8',
    });
    expect(ok.status, ok.stderr).toBe(0);
    const manifest = JSON.parse(readFileSync(out, 'utf8'));
    expect(manifest.strata['prices/sa']).toContain('gap--fan-a');
    expect(ok.stdout).toMatch(/prices\/sa: 3/);

    const bad = spawnSync(process.execPath, [CLI, '--data-dir', path.join(root, 'nope')], {
      encoding: 'utf8',
    });
    expect(bad.status).toBe(2);
    expect(bad.stderr).toMatch(/audit strata:/);
  });
});
