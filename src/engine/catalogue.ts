/**
 * Reading the catalogue. The data was validated with data-lead's Zod schemas at build time
 * (`scripts/catalogue/catalogue.ts`), so this module never imports Zod: it only checks that a
 * downloaded file has the catalogue's shape before the engine reads it.
 */
import type { Market, SpecCategory } from '../data/schema';
import type { Catalogue } from './types';

/** Every spec category, in data-lead's order. Typed so that a new category must be added here. */
const CATEGORY_KEYS: Readonly<Record<SpecCategory, null>> = {
  cpu: null,
  motherboard: null,
  ram: null,
  'gpu-chip': null,
  'gpu-card': null,
  storage: null,
  psu: null,
  cooler: null,
  case: null,
  'case-fan': null,
};
export const CATALOGUE_CATEGORIES = Object.keys(CATEGORY_KEYS) as readonly SpecCategory[];

const MARKET_KEYS: Readonly<Record<Market, null>> = { SA: null, US: null };
const CATALOGUE_MARKETS = Object.keys(MARKET_KEYS) as readonly Market[];

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * True when `value` has the catalogue's shape: schema version 1, a SHA-256 data hash, and every
 * section present with the right kind of value. The records themselves are not re-validated.
 */
export function isCatalogue(value: unknown): value is Catalogue {
  if (!isRecord(value)) return false;
  const { schemaVersion, dataHash, publishers, parts, prices } = value;
  return (
    schemaVersion === 1 &&
    typeof dataHash === 'string' &&
    /^[0-9a-f]{64}$/.test(dataHash) &&
    Array.isArray(publishers) &&
    Array.isArray(value.games) &&
    Array.isArray(value.gameBenchmarks) &&
    Array.isArray(value.creatorBenchmarks) &&
    isRecord(parts) &&
    CATALOGUE_CATEGORIES.every((category) => Array.isArray(parts[category])) &&
    isRecord(prices) &&
    CATALOGUE_MARKETS.every((market) => isRecord(prices[market]))
  );
}
