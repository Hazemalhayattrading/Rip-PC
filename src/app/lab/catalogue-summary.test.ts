import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../../scripts/catalogue/catalogue';
import { utcToday } from '../../data/validate';
import { summariseCatalogue } from './catalogue-summary';

const ROOT = resolve(import.meta.dirname, '../../..');
const { catalogue } = buildCatalogue(readDataFiles(ROOT), utcToday());
const summary = summariseCatalogue(catalogue);

type DataFile = Readonly<Record<string, unknown>>;

/** A data file as JSON, read without the code under test. */
function dataFile(path: string): DataFile {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as DataFile;
}

/** How many entries a list in a data file has. */
function lengthOf(file: DataFile, key: string): number {
  const list = file[key];
  if (!Array.isArray(list)) throw new Error(`${key} is not a list`);
  return list.length;
}

describe('summariseCatalogue', () => {
  it('counts the parts of each category, in data-lead’s category order', () => {
    expect(summary.parts.map((row) => row.category)).toEqual([
      'cpu',
      'motherboard',
      'ram',
      'gpu-chip',
      'gpu-card',
      'storage',
      'psu',
      'cooler',
      'case',
      'case-fan',
    ]);
    for (const row of summary.parts) {
      expect(row.count, row.category).toBe(
        lengthOf(dataFile(`data/parts/${row.category}.json`), 'items'),
      );
    }
    expect(summary.partsTotal).toBe(summary.parts.reduce((sum, row) => sum + row.count, 0));
  });

  it('counts each market’s price observations and gaps, with its batch window', () => {
    expect(summary.markets.map((row) => row.market)).toEqual(['SA', 'US']);
    for (const row of summary.markets) {
      const file = dataFile(`data/prices/${row.market.toLowerCase()}.json`);
      const batch = file.batch as { id: string; windowStart: string; windowEnd: string };
      expect(row).toEqual({
        market: row.market,
        currency: file.currency,
        observations: lengthOf(file, 'observations'),
        gaps: lengthOf(file, 'gaps'),
        batchId: batch.id,
        windowStart: batch.windowStart,
        windowEnd: batch.windowEnd,
        priceBasis: file.priceBasis,
      });
    }
  });

  it('counts the game and creator anchors', () => {
    const games = lengthOf(dataFile('data/benchmarks/game.json'), 'items');
    const creator = lengthOf(dataFile('data/benchmarks/creator.json'), 'items');
    expect(summary.anchors).toEqual({
      game: games,
      creator,
      total: games + creator,
    });
  });

  it('counts the games and publishers the catalogue lists', () => {
    expect(summary.games).toBe(lengthOf(dataFile('data/games.json'), 'games'));
    expect(summary.publishers).toBe(lengthOf(dataFile('data/publishers.json'), 'publishers'));
  });

  it('names the data by the first 12 hex digits of its hash', () => {
    expect(summary.dataHashShort).toMatch(/^[0-9a-f]{12}$/);
    expect(catalogue.dataHash.startsWith(summary.dataHashShort)).toBe(true);
  });
});
