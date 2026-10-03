import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../../scripts/catalogue/catalogue';
import { utcToday } from '../../data/validate';
import {
  anchorsBreakdown,
  gapsBreakdown,
  partsBreakdown,
  priceWindow,
  pricesBreakdown,
  summariseCatalogue,
  type CatalogueSummary,
  type MarketSummary,
} from './catalogue-summary';

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

/** A market's summary, for the text tests: only the counts and the window matter there. */
function market(
  fields: Pick<MarketSummary, 'market' | 'observations' | 'gaps'> & Partial<MarketSummary>,
): MarketSummary {
  return {
    currency: fields.market === 'SA' ? 'SAR' : 'USD',
    batchId: 'batch',
    windowStart: '2026-09-30',
    windowEnd: '2026-10-01',
    priceBasis: 'as shown',
    ...fields,
  };
}

const SMALL: CatalogueSummary = {
  dataHashShort: '0123456789ab',
  parts: [
    { category: 'cpu', count: 16 },
    { category: 'motherboard', count: 1 },
    { category: 'psu', count: 5 },
    { category: 'case-fan', count: 3 },
  ],
  partsTotal: 25,
  markets: [
    market({ market: 'SA', observations: 45, gaps: 17 }),
    market({ market: 'US', observations: 52, gaps: 10, windowStart: '2026-09-29' }),
  ],
  anchors: { game: 116, creator: 27, total: 143 },
  games: 15,
  publishers: 26,
};

describe('the lab home’s counts in words', () => {
  it('breaks the parts down by category, in digits, with no serial comma', () => {
    expect(partsBreakdown(SMALL)).toBe('16 CPUs, 1 motherboard, 5 power supplies and 3 case fans');
  });

  it('gives the prices per market, named as the copy guide names them', () => {
    expect(pricesBreakdown(SMALL)).toBe('45 in Saudi Arabia and 52 in the US');
    expect(gapsBreakdown(SMALL)).toBe('17 parts in Saudi Arabia and 10 in the US');
  });

  it('leaves out a market with no gap, and says nothing when no price is missing', () => {
    const [sa, us] = SMALL.markets;
    if (sa === undefined || us === undefined) throw new Error('two markets expected');
    expect(gapsBreakdown({ ...SMALL, markets: [{ ...sa, gaps: 0 }, us] })).toBe(
      '10 parts in the US',
    );
    expect(
      gapsBreakdown({
        ...SMALL,
        markets: [
          { ...sa, gaps: 1 },
          { ...us, gaps: 0 },
        ],
      }),
    ).toBe('1 part in Saudi Arabia');
    expect(
      gapsBreakdown({
        ...SMALL,
        markets: [
          { ...sa, gaps: 0 },
          { ...us, gaps: 0 },
        ],
      }),
    ).toBeNull();
  });

  it('spans the price batches from the earliest start to the latest end', () => {
    expect(priceWindow(SMALL)).toEqual({ start: '2026-09-29', end: '2026-10-01' });
  });

  it('splits the anchors into game and creator anchors', () => {
    expect(anchorsBreakdown(SMALL)).toBe('116 game anchors and 27 creator anchors');
  });
});
