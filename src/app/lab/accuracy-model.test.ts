import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../../scripts/catalogue/catalogue';
import type { CreatorBenchmark, GameBenchmark } from '../../data/schema';
import { utcToday } from '../../data/validate';
import type { Catalogue } from '../../engine/types';
import {
  anchorTables,
  buildAccuracyModel,
  cellCount,
  emptyColumns,
  emptyRows,
  gapCells,
  gapId,
  type CoverageGrid,
} from './accuracy-model';

const ROOT = resolve(import.meta.dirname, '../../..');
const { catalogue } = buildCatalogue(readDataFiles(ROOT), utcToday());
const model = buildAccuracyModel(catalogue);

/** The benchmark files as JSON, read without the code under test. */
const rawGame = (
  JSON.parse(readFileSync(resolve(ROOT, 'data/benchmarks/game.json'), 'utf8')) as {
    items: { limiter: string }[];
  }
).items;

/** The anchor ids in the data files, read without the code under test. */
const rawGameIds = (
  JSON.parse(readFileSync(resolve(ROOT, 'data/benchmarks/game.json'), 'utf8')) as {
    items: { id: string }[];
  }
).items.map((row) => row.id);
const rawCreatorIds = (
  JSON.parse(readFileSync(resolve(ROOT, 'data/benchmarks/creator.json'), 'utf8')) as {
    items: { id: string }[];
  }
).items.map((row) => row.id);

function sumOfCells(grid: CoverageGrid): number {
  return (
    grid.counts.flat().reduce((sum, count) => sum + count, 0) +
    grid.outside.reduce((sum, count) => sum + count, 0) +
    grid.unlistedRows
  );
}

describe('buildAccuracyModel on the real catalogue', () => {
  // Counted from the data files, not pinned: every WP-D2 batch adds anchor rows.
  it('counts every anchor of the data files: each game row and each creator row', () => {
    expect(model.gameAnchors).toBe(rawGameIds.length);
    expect(model.creatorAnchors).toBe(rawCreatorIds.length);
  });

  it('puts every GPU-bound game anchor in the games × GPU chips grid, and drops none', () => {
    const gpuBound = rawGame.filter((row) => row.limiter === 'gpu').length;
    expect(model.gpuBound.total).toBe(gpuBound);
    expect(sumOfCells(model.gpuBound)).toBe(gpuBound);
  });

  it('puts every CPU-bound game anchor in the games × CPUs grid, and drops none', () => {
    const cpuBound = rawGame.filter((row) => row.limiter === 'cpu').length;
    expect(model.cpuBound.total).toBe(cpuBound);
    expect(sumOfCells(model.cpuBound)).toBe(cpuBound);
    expect(model.gpuBound.total + model.cpuBound.total).toBe(rawGameIds.length);
  });

  it('accounts for every creator row in the Cinebench grid, the Blender grid or apart', () => {
    expect(sumOfCells(model.cinebench)).toBe(model.cinebench.total);
    expect(sumOfCells(model.blender)).toBe(model.blender.total);
    expect(model.cinebench.total + model.blender.total + model.otherCreatorRows).toBe(
      rawCreatorIds.length,
    );
  });

  it('lays the grids out in catalogue order: games by GPU chip, games by CPU, parts by test', () => {
    expect(model.gpuBound.rows).toEqual(catalogue.games.map((game) => game.id));
    expect(model.gpuBound.columns).toEqual(catalogue.parts['gpu-chip'].map((chip) => chip.id));
    expect(model.cpuBound.columns).toEqual(catalogue.parts.cpu.map((cpu) => cpu.id));
    expect(model.cinebench.rows).toEqual(catalogue.parts.cpu.map((cpu) => cpu.id));
    expect(model.cinebench.columns).toEqual(['multi-core', 'single-core']);
    expect(model.blender.rows).toEqual(catalogue.parts['gpu-chip'].map((chip) => chip.id));
  });

  it('counts known cells, read by hand from the data files', () => {
    expect(cellCount(model.gpuBound, 'cyberpunk-2077', 'amd-radeon-rx-9070-xt')).toBe(4);
    expect(cellCount(model.cpuBound, 'cyberpunk-2077', 'amd-ryzen-7-9800x3d')).toBe(1);
    expect(cellCount(model.cinebench, 'amd-ryzen-7-9800x3d', 'multi-core')).toBe(1);
    expect(cellCount(model.gpuBound, 'minecraft', 'nvidia-geforce-rtx-5090')).toBe(0);
  });
});

/** The value, or a failed test when the data no longer has it. */
function found<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`The catalogue has no ${what} any more.`);
  return value;
}

describe('buildAccuracyModel on a hand-made selection of real rows', () => {
  const gpuRow = found(
    catalogue.gameBenchmarks.find(
      (row) =>
        row.limiter === 'gpu' &&
        row.gameId === 'cyberpunk-2077' &&
        row.testSystem.gpu.chipId === 'amd-radeon-rx-9070-xt',
    ),
    'GPU-bound Cyberpunk 2077 row on the RX 9070 XT',
  );
  const cpuRow = found(
    catalogue.gameBenchmarks.find(
      (row) =>
        row.limiter === 'cpu' &&
        row.gameId === 'counter-strike-2' &&
        row.testSystem.cpu.catalogueId === 'intel-core-ultra-9-285k',
    ),
    'CPU-bound Counter-Strike 2 row on the Core Ultra 9 285K',
  );
  const blenderRow = found(
    catalogue.creatorBenchmarks.find((row) => row.app === 'blender' && row.subject.type === 'gpu'),
    'Blender row on a GPU',
  );
  const cinebenchRow = found(
    catalogue.creatorBenchmarks.find((row) => row.app === 'cinebench-2024'),
    'Cinebench row',
  );

  const chipOutside: GameBenchmark = {
    ...gpuRow,
    id: 'test-chip-outside',
    testSystem: { ...gpuRow.testSystem, gpu: { ...gpuRow.testSystem.gpu, chipId: null } },
  };
  const cpuOutside: GameBenchmark = {
    ...cpuRow,
    id: 'test-cpu-outside',
    testSystem: { ...cpuRow.testSystem, cpu: { ...cpuRow.testSystem.cpu, catalogueId: null } },
  };
  const unlistedGame: GameBenchmark = {
    ...gpuRow,
    id: 'test-unlisted-game',
    gameId: 'no-such-game',
  };
  const blenderOnCpu: CreatorBenchmark = {
    ...blenderRow,
    id: 'test-blender-on-cpu',
    device: 'cpu',
    subject: { type: 'cpu', cpuId: 'amd-ryzen-5-5600' },
  };

  const selection: Catalogue = {
    ...catalogue,
    gameBenchmarks: [gpuRow, chipOutside, unlistedGame, cpuRow, cpuOutside],
    creatorBenchmarks: [blenderRow, cinebenchRow, blenderOnCpu],
  };
  const small = buildAccuracyModel(selection);
  const blenderChip = blenderRow.subject.type === 'gpu' ? blenderRow.subject.chipId : '';

  it('counts an anchor whose test chip or CPU is outside the catalogue apart, by game', () => {
    expect(cellCount(small.gpuBound, 'cyberpunk-2077', 'amd-radeon-rx-9070-xt')).toBe(1);
    const cyberpunk = small.gpuBound.rows.indexOf('cyberpunk-2077');
    expect(small.gpuBound.outside[cyberpunk]).toBe(1);
    const cs2 = small.cpuBound.rows.indexOf('counter-strike-2');
    expect(small.cpuBound.outside[cs2]).toBe(1);
  });

  it('counts an anchor for a game the catalogue does not list, instead of dropping it', () => {
    expect(small.gpuBound.unlistedRows).toBe(1);
    expect(small.gpuBound.total).toBe(3);
    expect(sumOfCells(small.gpuBound)).toBe(3);
  });

  it('counts a creator row that fits neither creator grid apart', () => {
    expect(small.blender.total).toBe(1);
    expect(small.cinebench.total).toBe(1);
    expect(small.otherCreatorRows).toBe(1);
  });

  it('lists the games with no anchor at all', () => {
    expect(small.noAnchors.games).toEqual(
      catalogue.games
        .map((game) => game.id)
        .filter((id) => id !== 'cyberpunk-2077' && id !== 'counter-strike-2'),
    );
  });

  it('counts a chip with only a creator anchor as anchored, but as empty in the game grid', () => {
    expect(small.noAnchors.chips).not.toContain(blenderChip);
    expect(small.noAnchors.chips).not.toContain('amd-radeon-rx-9070-xt');
    expect(emptyColumns(small.gpuBound)).toContain(blenderChip);
    expect(emptyColumns(small.gpuBound)).not.toContain('amd-radeon-rx-9070-xt');
  });

  it('counts a CPU tested by a CPU-bound game row or a creator row as anchored', () => {
    expect(small.noAnchors.cpus).not.toContain('intel-core-ultra-9-285k');
    expect(small.noAnchors.cpus).not.toContain('amd-ryzen-5-5600');
    const cinebenchCpu = cinebenchRow.subject.type === 'cpu' ? cinebenchRow.subject.cpuId : '';
    expect(small.noAnchors.cpus).not.toContain(cinebenchCpu);
    expect(small.noAnchors.cpus).toContain('intel-core-i5-12400f');
  });

  it('never counts the bench CPU of a GPU-bound row as an anchor for that CPU', () => {
    expect(gpuRow.testSystem.cpu.catalogueId).toBe('amd-ryzen-7-9800x3d');
    expect(small.noAnchors.cpus).toContain('amd-ryzen-7-9800x3d');
  });

  it('lists the rows of a grid that have no anchor, outside ones included', () => {
    expect(emptyRows(small.gpuBound)).not.toContain('cyberpunk-2077');
    expect(emptyRows(small.gpuBound)).toContain('minecraft');
    expect(emptyRows(small.cpuBound)).not.toContain('counter-strike-2');
  });
});

describe('the gaps under each coverage grid', () => {
  it('has one line for every empty cell, in the grid’s order, and none for a counted one', () => {
    const gaps = gapCells(model.gpuBound);
    const cells = model.gpuBound.rows.length * model.gpuBound.columns.length;
    const counted = model.gpuBound.counts.flat().filter((count) => count > 0).length;
    expect(gaps).toHaveLength(cells - counted);
    expect(gaps).toContainEqual({ row: 'minecraft', column: 'nvidia-geforce-rtx-5090' });
    expect(gaps).not.toContainEqual({ row: 'cyberpunk-2077', column: 'amd-radeon-rx-9070-xt' });
    expect(gaps[0]).toEqual({
      row: model.gpuBound.rows[0],
      column: model.gpuBound.columns.find((_, c) => (model.gpuBound.counts[0]?.[c] ?? 0) === 0),
    });
  });

  it('gives each line an id of its own on the page, across all four grids', () => {
    const ids = (
      [
        ['gpu', model.gpuBound],
        ['cpu', model.cpuBound],
        ['cinebench', model.cinebench],
        ['blender', model.blender],
      ] as const
    ).flatMap(([key, grid]) => gapCells(grid).map((gap) => gapId(key, gap)));
    expect(new Set(ids).size).toBe(ids.length);
    expect(gapId('gpu', { row: 'minecraft', column: 'nvidia-geforce-rtx-5090' })).toBe(
      'gap-gpu-minecraft-nvidia-geforce-rtx-5090',
    );
    // Creator tests are words, not ids: "benchmark score (all scenes summed)".
    expect(
      gapId('blender', { row: 'intel-arc-b580', column: 'benchmark score (all scenes summed)' }),
    ).toBe('gap-blender-intel-arc-b580-benchmark-score-all-scenes-summed');
  });
});

describe('anchorTables', () => {
  const tables = anchorTables(catalogue);

  it('holds every game anchor of the data file, in catalogue order', () => {
    expect(tables.game.map((row) => row.id)).toEqual(rawGameIds);
    expect(tables.game.length).toBeGreaterThan(0);
  });

  it('holds every creator anchor of the data file once, in a table per unit', () => {
    const ids = [...tables.cinebench, ...tables.blender, ...tables.otherCreator].map(
      (row) => row.id,
    );
    expect([...ids].sort()).toEqual([...rawCreatorIds].sort());
    expect(ids).toHaveLength(rawCreatorIds.length);
    expect(tables.cinebench.every((row) => row.unit === 'points')).toBe(true);
    expect(tables.blender.every((row) => row.unit === 'samples-per-minute')).toBe(true);
  });

  it('keeps each anchor’s sources, so every row can show where its number comes from', () => {
    const rows = [...tables.game, ...tables.cinebench, ...tables.blender, ...tables.otherCreator];
    expect(rows.filter((row) => row.sources.length === 0).map((row) => row.id)).toEqual([]);
  });
});
