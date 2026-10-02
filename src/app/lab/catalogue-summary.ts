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
