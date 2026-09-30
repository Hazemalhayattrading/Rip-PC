import * as z from 'zod';

/**
 * Kebab-case, globally unique, stable ID. Share URLs depend on IDs, so an ID is never renamed.
 */
export const Id = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'must be kebab-case: a-z, 0-9 and single hyphens' });
export type Id = z.infer<typeof Id>;

/** Slot or rule ID that is unique inside one record, e.g. `m2-1`, `pcie-2`, `sata-3`, `ls-1`. */
export const LocalId = Id;

/** Calendar date in ISO 8601 form (YYYY-MM-DD). Retrieval dates are UTC dates. */
export const IsoDate = z.iso.date();
export type IsoDate = z.infer<typeof IsoDate>;

/**
 * A date exactly as the manufacturer or publisher states it: a day (2024-11-07), a month (2024-11),
 * a quarter (2024-Q4) or a year (2024). Never widen or narrow a published date.
 */
export const PublishedDate = z
  .string()
  .regex(/^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?|-Q[1-4])?$/, {
    error: 'must be YYYY, YYYY-MM, YYYY-MM-DD or YYYY-Qn',
  });
export type PublishedDate = z.infer<typeof PublishedDate>;

/** HTTPS URL. Plain HTTP is not accepted for sources. */
export const HttpsUrl = z.url({ protocol: /^https$/, error: 'must be an https URL' });

/** Lower-case hostname without scheme or path, e.g. `amd.com`. Subdomains match it. */
export const Hostname = z
  .string()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/, { error: 'must be a lower-case hostname' });

export const MARKETS = ['SA', 'US'] as const;
export const Market = z.enum(MARKETS);
export type Market = z.infer<typeof Market>;

export const CURRENCIES = ['SAR', 'USD'] as const;
export const Currency = z.enum(CURRENCIES);
export type Currency = z.infer<typeof Currency>;

/** The only currency each market may be priced in. Prices are observed, never converted. */
export const MARKET_CURRENCY: Readonly<Record<Market, Currency>> = { SA: 'SAR', US: 'USD' };

/**
 * Dot path into a record: `memory.speeds`, `m2Slots.1.lanes`, `gpuClearance.*.maxLengthMm`.
 * Numeric segments index arrays and `*` matches any index. A path covers everything below it.
 */
export const FieldPath = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9]*(?:\.(?:[A-Za-z][A-Za-z0-9]*|\d+|\*))*$/, { error: 'must be a dot path such as memory.speeds' });
export type FieldPath = z.infer<typeof FieldPath>;

/** What kind of document a source is. Some fields demand a specific kind (see the validator). */
export const DOC_TYPES = [
  'spec-page',
  'product-page',
  'manual',
  'datasheet',
  'cpu-support-list',
  'bios-release-notes',
  'support-article',
  'press-release',
  'review',
  'benchmark-database',
  'tracker-page',
  'store-page',
  'news-article',
  /** A machine-readable response from the publisher's own public API (e.g. the Steam Web API). */
  'api-response',
] as const;
export const DocType = z.enum(DOC_TYPES);
export type DocType = z.infer<typeof DocType>;

/**
 * One source behind a record.
 * - `publisher` is an ID from `data/publishers.json`, and `url` must be on one of its domains.
 * - `retrievedAt` is the UTC date the page was read.
 * - `archiveUrl` is a Wayback Machine snapshot of `url` (full 14-digit timestamp form). Allowed for
 *   specs and for published benchmark reviews (which then need `publishedAt`); never for prices,
 *   which carry no `sources` at all (Owner's rule 1).
 * - `fields` lists the dot paths this source backs. Omitted means it backs the whole record.
 */
export const SourceRef = z.strictObject({
  url: HttpsUrl,
  publisher: Id,
  retrievedAt: IsoDate,
  docType: DocType,
  archiveUrl: HttpsUrl.optional(),
  fields: z.array(FieldPath).min(1).optional(),
  title: z.string().min(1).optional(),
  /** Where in the document the values are, e.g. "Manual p. 1-4, Expansion slots". */
  locator: z.string().min(1).optional(),
});
export type SourceRef = z.infer<typeof SourceRef>;

export const Sources = z.array(SourceRef).min(1);

/**
 * A note on the record. A note with `field` explains that path, for example why it is null
 * ("Noctua publishes NSPR, not TDP"). Every null spec value needs one, unless the schema documents
 * that null means "none" for that field.
 */
export const Note = z.strictObject({
  field: FieldPath.optional(),
  text: z.string().min(1),
});
export type Note = z.infer<typeof Note>;

export const Notes = z.array(Note).min(1).optional();

/** Positive integer. */
export const PosInt = z.int().positive();
/** Zero or positive integer (counts). */
export const Count = z.int().nonnegative();
/** Positive number (millimetres, watts, volts...). */
export const PosNum = z.number().positive();

/** Fields every catalogue spec record carries. */
export const specRecordBase = {
  id: Id,
  /** Publisher ID of the company that makes the part. At least one source must be from it. */
  manufacturer: Id,
  /** Brand as printed on the product, e.g. "ASUS", "G.Skill", "be quiet!". */
  brand: z.string().min(1),
  /** Full product name as the manufacturer publishes it. */
  name: z.string().min(1),
  sources: Sources,
  notes: Notes,
} as const;
