import * as z from 'zod';
import { Hostname, Id, Market } from './common';

/**
 * What a publisher is. The kind decides which records its pages may back:
 * - `manufacturer`: part and chip specs (the only kind that counts toward spec coverage)
 * - `reviewer`, `benchmark-database`: benchmark rows
 * - `retailer`: prices, and nothing else
 * - `tracker`, `platform`, `game-publisher`, `news`: the games list and its player counts
 * - `dataset`: seed lists only; never counts as a source for any value
 */
export const PUBLISHER_KINDS = [
  'manufacturer',
  'reviewer',
  'benchmark-database',
  'retailer',
  'tracker',
  'platform',
  'game-publisher',
  'news',
  'dataset',
] as const;
export const PublisherKind = z.enum(PUBLISHER_KINDS);
export type PublisherKind = z.infer<typeof PublisherKind>;

export const Publisher = z.strictObject({
  id: Id,
  name: z.string().min(1),
  kind: PublisherKind,
  /** Hostnames the publisher's pages live on. A source URL must be on one of them (or a subdomain). */
  domains: z.array(Hostname).min(1),
  /** Markets a retailer sells in. Required for retailers, not allowed for other kinds. */
  markets: z.array(Market).min(1).optional(),
  notes: z.string().min(1).optional(),
});
export type Publisher = z.infer<typeof Publisher>;

export const PublisherFile = z.strictObject({
  schemaVersion: z.literal(1),
  publishers: z.array(Publisher).min(1),
});
export type PublisherFile = z.infer<typeof PublisherFile>;

/** Publisher kinds whose pages count toward coverage, per record type. */
export const COVERAGE_KINDS = {
  spec: ['manufacturer'],
  benchmark: ['reviewer', 'benchmark-database'],
  game: ['tracker', 'platform', 'game-publisher', 'news'],
} as const satisfies Record<string, readonly PublisherKind[]>;
