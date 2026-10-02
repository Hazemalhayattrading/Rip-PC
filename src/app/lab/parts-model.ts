/**
 * What the lab's parts page shows for a build: the picked parts in builder order, each graphics
 * card's chip, the chip from the link, and every price record of a part. Pure: it reads the
 * catalogue it is given.
 */
import type {
  Currency,
  Market,
  PriceGap,
  PriceObservation,
  SpecCategory,
  SpecRecordByCategory,
} from '../../data/schema';
import type { Catalogue } from '../../engine/types';
import type { RigBuild } from '../../state/build-codec';
import { PART_CATEGORIES } from '../../state/categories';

export function findRecord<C extends SpecCategory>(
  catalogue: Catalogue,
  category: C,
  id: string,
): SpecRecordByCategory[C] | null {
  const records: readonly SpecRecordByCategory[C][] = catalogue.parts[category];
  return records.find((record) => record.id === id) ?? null;
}

/** One part the page shows, or an id that names no part of its category. */
export interface PartSection {
  readonly category: SpecCategory;
  readonly id: string;
  /** `null` when the catalogue has no such part: the page says "Unknown part in this link". */
  readonly record: SpecRecordByCategory[SpecCategory] | null;
  /** Picked in the build, the chip of the picked card, or the chip named in the link. */
  readonly via: 'build' | 'card' | 'link';
}

/**
 * The parts to show: the build's picks in builder order, each graphics card followed by its chip,
 * then the chip from the link unless it is that card's chip already.
 */
export function pickedParts(
  catalogue: Catalogue,
  build: RigBuild,
  chipFromLink: string | null,
): PartSection[] {
  const sections: PartSection[] = [];
  for (const category of PART_CATEGORIES) {
    const id = build[category];
    if (id === undefined) continue;
    const record = findRecord(catalogue, category, id);
    sections.push({ category, id, record, via: 'build' });
    if (record?.category === 'gpu-card') {
      const chip = findRecord(catalogue, 'gpu-chip', record.chipId);
      sections.push({ category: 'gpu-chip', id: record.chipId, record: chip, via: 'card' });
    }
  }
  const shown = sections.some(
    (section) => section.category === 'gpu-chip' && section.id === chipFromLink,
  );
  if (chipFromLink !== null && !shown) {
    const record = findRecord(catalogue, 'gpu-chip', chipFromLink);
    sections.push({ category: 'gpu-chip', id: chipFromLink, record, via: 'link' });
  }
  return sections;
}

/** One market's price records for a part. */
export interface MarketPrices {
  readonly market: Market;
  readonly currency: Currency;
  /** How the market's amounts are displayed (VAT, delivery), as data-lead wrote it. */
  readonly priceBasis: string;
  readonly observations: readonly PriceObservation[];
  readonly gaps: readonly PriceGap[];
}

const MARKETS: readonly Market[] = ['SA', 'US'];

/** A part's observations and gaps in Saudi Arabia, then the US, exactly as recorded. */
export function pricesOf(catalogue: Catalogue, partId: string): MarketPrices[] {
  return MARKETS.map((market) => {
    const file = catalogue.prices[market];
    return {
      market,
      currency: file.currency,
      priceBasis: file.priceBasis,
      observations: file.observations.filter((observation) => observation.partId === partId),
      gaps: file.gaps.filter((gap) => gap.partId === partId),
    };
  });
}

const namesByCatalogue = new WeakMap<Catalogue, ReadonlyMap<string, string>>();

/** A publisher's name by its id, or the id itself when the catalogue has no such publisher. */
export function publisherName(catalogue: Catalogue, id: string): string {
  let names = namesByCatalogue.get(catalogue);
  if (names === undefined) {
    names = new Map(catalogue.publishers.map((publisher) => [publisher.id, publisher.name]));
    namesByCatalogue.set(catalogue, names);
  }
  return names.get(id) ?? id;
}
