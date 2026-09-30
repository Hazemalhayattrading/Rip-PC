/**
 * Every rule the data validator enforces. The IDs are stable: tests and hand-offs refer to them.
 */
export const RULES = {
  'file-missing': 'Every data file listed in DATA_PATHS exists.',
  schema: 'Every file parses against its strict Zod schema; unknown keys are rejected.',
  'id-kebab': 'IDs are kebab-case.',
  'id-unique': 'IDs are unique across the catalogue, games and benchmark rows; publisher IDs are unique in the registry.',
  registry: 'The publisher registry is well formed: no shared domains, and markets set on retailers only.',
  'publisher-known': 'Every publisher, manufacturer and retailer ID is in the registry.',
  'publisher-domain': "A source or price URL is on one of its publisher's domains.",
  'publisher-kind': "A record's manufacturer is a manufacturer-kind publisher.",
  'url-is-archive': 'A url is never an archive or cache link. An archived read keeps the original url and adds archiveUrl.',
  'archive-form': 'An archiveUrl is a timestamped Wayback snapshot of the same url, taken no later than retrievedAt.',
  'date-future': 'No retrievedAt, checkedAt, asOf or publishedAt is later than today (UTC).',
  coverage: 'Every non-null value is backed by a source whose publisher kind may back that record type.',
  'null-note': 'Every null value has a note, unless the schema documents null as "none" for that field.',
  'field-path': 'Every source `fields` entry and every note `field` points at a real field of the record.',
  'spec-retailer-only': 'A spec record whose only sources are retailers is rejected.',
  'spec-own-manufacturer': 'A spec record has at least one source from its own manufacturer.',
  'doc-type': 'Motherboard BIOS support comes from a CPU support list, and lane sharing from the manual.',
  ref: 'References point at real records: cards to chips, prices and gaps to parts, benchmarks to games, CPUs, chips and cards.',
  'ref-slot': 'Lane-sharing rules point at real slot IDs on the same board, and slot IDs are unique per board.',
  'bios-coverage': "Each board has a BIOS row for every catalogue CPU on its socket and for that CPU's family.",
  sanity: 'Physical and logical sanity: threads >= cores, boost >= base, socket, memory and chipset agree, and similar.',
  'price-currency': 'A price is in its market currency (SA: SAR, US: USD).',
  'price-archive': 'A price never has an archiveUrl and never comes from an archive, cache, tracker or aggregator.',
  'price-retailer': 'A price or gap names retailer-kind publishers that sell in that market.',
  'price-window': "A price's retrievedAt, and a gap's checkedAt, fall inside the batch window.",
  'price-capture':
    'A price names its capture as artifacts/prices/<market>/<partId>--<retailer>--<retrievedAt>.<html|png>, with its SHA-256.',
  'price-gap-reason': 'A gap record states its reason.',
  'price-coverage': 'Every purchasable part has, per market, at least one price or exactly one gap, never both.',
  'price-duplicate': 'At most one observation per part, retailer and market.',
  'benchmark-published-at': 'Every benchmark row, archived or live, records the review publish date (publishedAt).',
  'benchmark-snapshot-date': "A Wayback snapshot of a review is not dated before the review's publishedAt.",
  'benchmark-conflict': 'Comparable rows from different publishers that differ by more than 10% flag each other.',
  'benchmark-conditions': 'Upscaling state, limiter subject, aggregate and test system are consistent.',
  'game-list': 'Franchise slots appear once, replacements name what they replace, and player counts are dated.',
} as const;

export type RuleId = keyof typeof RULES;

export type Severity = 'error' | 'warning';

export interface Issue {
  severity: Severity;
  rule: RuleId;
  /** Repo-relative data file, e.g. `data/parts/cpu.json`. */
  file: string;
  recordId?: string;
  /** Dot path inside the record (or file, for schema issues). */
  path?: string;
  message: string;
}

export function formatIssue(issue: Issue): string {
  const where = [issue.file, issue.recordId, issue.path].filter((s) => s !== undefined && s !== '').join(' > ');
  return `[${issue.severity}] ${issue.rule} @ ${where}: ${issue.message}`;
}

/** Collects issues with the file (and record) already filled in. */
export class IssueSink {
  readonly issues: Issue[] = [];

  add(issue: Issue): void {
    this.issues.push(issue);
  }

  error(rule: RuleId, file: string, message: string, recordId?: string, path?: string): void {
    this.issues.push({
      severity: 'error',
      rule,
      file,
      message,
      ...(recordId === undefined ? {} : { recordId }),
      ...(path === undefined ? {} : { path }),
    });
  }

  warn(rule: RuleId, file: string, message: string, recordId?: string, path?: string): void {
    this.issues.push({
      severity: 'warning',
      rule,
      file,
      message,
      ...(recordId === undefined ? {} : { recordId }),
      ...(path === undefined ? {} : { path }),
    });
  }
}
