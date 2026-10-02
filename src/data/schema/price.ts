import * as z from 'zod';
import { Currency, HttpsUrl, Id, IsoDate, Market, Notes, PosNum } from './common';

/**
 * One observed price (architecture call 4.6, Owner's rule 1).
 * - Read from a live retailer product page during the batch. Never an archive, cache, search
 *   snippet, tracker or aggregator, and never a conversion from another currency or market.
 * - `retrievedAt` is the UTC date of that live fetch.
 * - `capture` is the saved page (HTML or screenshot) under `artifacts/`, kept as audit evidence.
 */
export const PriceObservation = z.strictObject({
  partId: Id,
  /** The batch it was read in (an `id` in the file's `batches`). Its date falls inside that window. */
  batch: Id,
  market: Market,
  currency: Currency,
  /** Amount exactly as displayed on the page, in `currency`. */
  amount: PosNum,
  /** Publisher ID of the retailer (kind `retailer`). */
  retailer: Id,
  /** The live product page the amount was read from. */
  url: HttpsUrl,
  inStock: z.boolean(),
  /** Sold by a third-party seller on a marketplace rather than the retailer itself. */
  isMarketplace: z.boolean(),
  /** Seller name as the page shows it (e.g. "Amazon.sa", "Newegg"). */
  seller: z.string().min(1),
  retrievedAt: IsoDate,
  /**
   * The saved live page (HTML or screenshot), relative to the repo root. Fixed convention:
   * `artifacts/prices/<market>/<partId>--<retailer>--<retrievedAt>[--<n>].<html|png>`, where `--<n>`
   * (2 and up) numbers a later attempt on the same day. The validator enforces the name; `artifacts/`
   * is git-ignored, so the file itself lives in the worktree.
   */
  capture: z
    .string()
    .regex(/^artifacts\/prices\/(?:SA|US)\/[a-z0-9-]+--[a-z0-9-]+--\d{4}-\d{2}-\d{2}(?:--(?:[2-9]|[1-9]\d+))?\.(?:html|png)$/, {
      error: 'must be artifacts/prices/<market>/<partId>--<retailer>--<YYYY-MM-DD>[--<n>].<html|png>',
    }),
  /** SHA-256 of the capture file, so an audit can prove it is the file that was read. */
  captureSha256: z.string().regex(/^[0-9a-f]{64}$/, { error: 'must be a lower-case hex SHA-256' }),
  notes: Notes,
});
export type PriceObservation = z.infer<typeof PriceObservation>;

export const GapReasonCode = z.enum(['not-listed', 'blocked', 'no-price-shown', 'unavailable']);

/** A price that could not be observed. It stays missing; the UI says "no price found as of <date>". */
export const PriceGap = z.strictObject({
  partId: Id,
  /** The batch it was checked in (an `id` in the file's `batches`). */
  batch: Id,
  market: Market,
  reasonCode: GapReasonCode,
  /** What happened, in one sentence. Required. */
  reason: z.string().min(1),
  /** Retailer publisher IDs that were checked. */
  retailersTried: z.array(Id).min(1),
  checkedAt: IsoDate,
  notes: Notes,
});
export type PriceGap = z.infer<typeof PriceGap>;

/**
 * One price batch: the days its pages were read. Parts added later (for example the WP-D1 fixture
 * parts) get their own batch, so no observation is ever dated outside its window.
 */
export const PriceBatch = z.strictObject({
  id: Id,
  /** What the batch covers, e.g. "Seed catalogue (WP-D0)". */
  label: z.string().min(1),
  windowStart: IsoDate,
  windowEnd: IsoDate,
});
export type PriceBatch = z.infer<typeof PriceBatch>;

export const PriceFile = z.strictObject({
  schemaVersion: z.literal(1),
  market: Market,
  currency: Currency,
  /** Every observation and gap names one of these and falls inside its window (inclusive). */
  batches: z.array(PriceBatch).min(1),
  /** How amounts are displayed in this market (e.g. VAT included or not). */
  priceBasis: z.string().min(1),
  observations: z.array(PriceObservation),
  gaps: z.array(PriceGap),
});
export type PriceFile = z.infer<typeof PriceFile>;
