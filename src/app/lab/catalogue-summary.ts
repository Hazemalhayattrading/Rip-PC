/**
 * What the catalogue holds, counted for the lab's home page (plan §1: "how many parts, prices
 * and anchors loaded"). Pure: it reads the catalogue it is given.
 */
import type { Currency, Market, SpecCategory } from '../../data/schema';
import { CATALOGUE_CATEGORIES } from '../../engine/catalogue';
import type { Catalogue } from '../../engine/types';

export interface MarketSummary {
  readonly market: Market;
  readonly currency: Currency;
  readonly observations: number;
  readonly gaps: number;
  readonly batchId: string;
  /** The batch window, inclusive: every observation and gap falls inside it. */
  readonly windowStart: string;
  readonly windowEnd: string;
  /** How amounts are displayed in this market (VAT, delivery), as data-lead wrote it. */
  readonly priceBasis: string;
}

export interface CatalogueSummary {
  /** The first 12 hex digits of the catalogue's data hash: enough to tell two datasets apart. */
  readonly dataHashShort: string;
  readonly parts: readonly { readonly category: SpecCategory; readonly count: number }[];
  readonly partsTotal: number;
  readonly markets: readonly MarketSummary[];
  readonly anchors: { readonly game: number; readonly creator: number; readonly total: number };
  readonly games: number;
  readonly publishers: number;
}

const MARKETS: readonly Market[] = ['SA', 'US'];

export function summariseCatalogue(catalogue: Catalogue): CatalogueSummary {
  const parts = CATALOGUE_CATEGORIES.map((category) => ({
    category,
    count: catalogue.parts[category].length,
  }));
  const game = catalogue.gameBenchmarks.length;
  const creator = catalogue.creatorBenchmarks.length;
  return {
    dataHashShort: catalogue.dataHash.slice(0, 12),
    parts,
    partsTotal: parts.reduce((sum, row) => sum + row.count, 0),
    markets: MARKETS.map((market) => {
      const file = catalogue.prices[market];
      return {
        market,
        currency: file.currency,
        observations: file.observations.length,
        gaps: file.gaps.length,
        batchId: file.batch.id,
        windowStart: file.batch.windowStart,
        windowEnd: file.batch.windowEnd,
        priceBasis: file.priceBasis,
      };
    }),
    anchors: { game, creator, total: game + creator },
    games: catalogue.games.length,
    publishers: catalogue.publishers.length,
  };
}

/** Lists in text: "A, B and C", with no serial comma (copy guide §3). */
const AND = new Intl.ListFormat('en-GB', { type: 'conjunction' });

/** Each category's noun in a count: one, many. */
const NOUNS: Readonly<Record<SpecCategory, readonly [string, string]>> = {
  cpu: ['CPU', 'CPUs'],
  motherboard: ['motherboard', 'motherboards'],
  ram: ['memory kit', 'memory kits'],
  'gpu-chip': ['GPU chip', 'GPU chips'],
  'gpu-card': ['graphics card', 'graphics cards'],
  storage: ['drive', 'drives'],
  psu: ['power supply', 'power supplies'],
  cooler: ['CPU cooler', 'CPU coolers'],
  case: ['case', 'cases'],
  'case-fan': ['case fan', 'case fans'],
};

/** Markets by name, as the copy guide writes them inside a sentence (§11). */
const MARKET_PLACES: Readonly<Record<Market, string>> = { SA: 'Saudi Arabia', US: 'the US' };

function counted(count: number, [one, many]: readonly [string, string]): string {
  return `${String(count)} ${count === 1 ? one : many}`;
}

/** "16 CPUs, 7 motherboards … and 3 case fans": counts are digits in a summary line. */
export function partsBreakdown(summary: CatalogueSummary): string {
  return AND.format(summary.parts.map((row) => counted(row.count, NOUNS[row.category])));
}

/** "45 in Saudi Arabia and 52 in the US": price observations per market. */
export function pricesBreakdown(summary: CatalogueSummary): string {
  return AND.format(
    summary.markets.map((row) => `${String(row.observations)} in ${MARKET_PLACES[row.market]}`),
  );
}

/** "17 parts in Saudi Arabia and 10 in the US": parts with no price found, or `null` for none. */
export function gapsBreakdown(summary: CatalogueSummary): string | null {
  const markets = summary.markets.filter((row) => row.gaps > 0);
  if (markets.length === 0) return null;
  return AND.format(
    markets.map((row, i) =>
      i === 0
        ? `${counted(row.gaps, ['part', 'parts'])} in ${MARKET_PLACES[row.market]}`
        : `${String(row.gaps)} in ${MARKET_PLACES[row.market]}`,
    ),
  );
}

/** The span of the price batches: the earliest start and the latest end, as ISO dates. */
export function priceWindow(summary: CatalogueSummary): { start: string; end: string } {
  const starts = summary.markets.map((row) => row.windowStart).sort();
  const ends = summary.markets.map((row) => row.windowEnd).sort();
  return { start: starts[0] ?? '', end: ends.at(-1) ?? '' };
}

/** "116 game anchors and 27 creator anchors". */
export function anchorsBreakdown(summary: CatalogueSummary): string {
  const { game, creator } = summary.anchors;
  return AND.format([
    counted(game, ['game anchor', 'game anchors']),
    counted(creator, ['creator anchor', 'creator anchors']),
  ]);
}
