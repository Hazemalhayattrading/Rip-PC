import type { DocType, Note, SourceRef } from '../schema/common';
import { COVERAGE_KINDS, type Publisher, type PublisherKind } from '../schema/publisher';
import type { IssueSink } from './issues';
import { collectLeaves, covers, coversAny, joinPath, patternExists, splitPath, type Leaf } from './paths';
import { hostMatches, hostOf, isArchiveUrl, normaliseUrl, parseWayback } from './urls';

export type RecordType = keyof typeof COVERAGE_KINDS;

export interface SourcedRecord {
  id: string;
  sources: readonly SourceRef[];
  notes?: readonly Note[] | undefined;
}

export interface RecordPolicy {
  type: RecordType;
  /** Identity, reference and editorial paths: not sourced values, so never checked for coverage. */
  exempt: readonly string[];
  /** Paths where `null` means "none" and needs no note. */
  nullMeansNone: readonly string[];
  /** Paths whose covering source must be one of these document types. */
  docTypes?: readonly { path: string; docTypes: readonly DocType[] }[];
  /** Publisher ID that must appear among the sources (a spec record's own manufacturer). */
  manufacturer?: string;
  /** Review publish date (benchmark rows): an archived snapshot may not predate it. */
  publishedAt?: string;
}

export type Registry = ReadonlyMap<string, Publisher>;

const MAX_LISTED = 8;

function listPaths(leaves: readonly Leaf[]): string {
  const shown = leaves.slice(0, MAX_LISTED).map((l) => joinPath(l.path));
  const more = leaves.length > MAX_LISTED ? `, and ${String(leaves.length - MAX_LISTED)} more` : '';
  return `${shown.join(', ')}${more}`;
}

function sourceCovers(source: SourceRef, path: readonly string[]): boolean {
  return source.fields === undefined || source.fields.some((f) => covers(splitPath(f), path));
}

/** Checks one source's URL, publisher, dates and archive link. */
export function checkSource(
  sink: IssueSink,
  file: string,
  recordId: string,
  at: string,
  source: SourceRef,
  registry: Registry,
  today: string,
  publishedAt?: string,
): void {
  const publisher = registry.get(source.publisher);
  if (publisher === undefined) {
    sink.error('publisher-known', file, `publisher "${source.publisher}" is not in data/publishers.json`, recordId, at);
  }
  if (isArchiveUrl(source.url)) {
    sink.error(
      'url-is-archive',
      file,
      `url ${source.url} is an archive or cache link; keep the original page in url and put the snapshot in archiveUrl`,
      recordId,
      `${at}.url`,
    );
  } else if (publisher !== undefined) {
    const host = hostOf(source.url);
    if (host === null || !publisher.domains.some((d) => hostMatches(host, d))) {
      sink.error(
        'publisher-domain',
        file,
        `url host ${host ?? '(invalid)'} is not a domain of publisher "${publisher.id}" (${publisher.domains.join(', ')})`,
        recordId,
        `${at}.url`,
      );
    }
  }
  if (source.retrievedAt > today) {
    sink.error('date-future', file, `retrievedAt ${source.retrievedAt} is after today (${today})`, recordId, `${at}.retrievedAt`);
  }
  if (source.archiveUrl !== undefined) {
    const snap = parseWayback(source.archiveUrl);
    if (snap === null) {
      sink.error(
        'archive-form',
        file,
        'archiveUrl must be a Wayback snapshot: https://web.archive.org/web/<YYYYMMDDhhmmss>/<url>',
        recordId,
        `${at}.archiveUrl`,
      );
    } else {
      if (normaliseUrl(snap.original) !== normaliseUrl(source.url)) {
        sink.error(
          'archive-form',
          file,
          `archiveUrl snapshots ${snap.original}, not the source url ${source.url}`,
          recordId,
          `${at}.archiveUrl`,
        );
      }
      if (snap.date > source.retrievedAt) {
        sink.error(
          'archive-form',
          file,
          `snapshot dated ${snap.date} is after retrievedAt ${source.retrievedAt}`,
          recordId,
          `${at}.archiveUrl`,
        );
      }
      if (publishedAt !== undefined && snap.date < publishedAt) {
        sink.error(
          'benchmark-snapshot-date',
          file,
          `snapshot dated ${snap.date} predates the review's publishedAt ${publishedAt}`,
          recordId,
          `${at}.archiveUrl`,
        );
      }
    }
  }
}

/**
 * Checks a record's sources and value coverage:
 * sources are registered, on their publisher's domains, not archive links, not future-dated;
 * every non-null value is backed by an allowed publisher kind (and the required document type);
 * every null value has a note; `fields` and note paths exist.
 */
export function checkSourcedRecord(
  sink: IssueSink,
  file: string,
  record: SourcedRecord,
  policy: RecordPolicy,
  registry: Registry,
  today: string,
): void {
  const leaves = collectLeaves(record);
  const exempt = policy.exempt.map(splitPath);
  const valueLeaves = leaves.filter((l) => !coversAny(exempt, l.path));

  record.sources.forEach((source, i) => {
    const at = `sources.${String(i)}`;
    checkSource(sink, file, record.id, at, source, registry, today, policy.publishedAt);
    source.fields?.forEach((f, j) => {
      if (!patternExists(splitPath(f), leaves)) {
        sink.error('field-path', file, `fields entry "${f}" matches no field of the record`, record.id, `${at}.fields.${String(j)}`);
      }
    });
  });

  (record.notes ?? []).forEach((note, i) => {
    if (note.field !== undefined && !patternExists(splitPath(note.field), leaves)) {
      sink.error('field-path', file, `note field "${note.field}" matches no field of the record`, record.id, `notes.${String(i)}.field`);
    }
  });

  if (policy.type === 'spec') {
    const kinds = record.sources.map((s) => registry.get(s.publisher)?.kind);
    if (kinds.length > 0 && kinds.every((k) => k === 'retailer')) {
      sink.error('spec-retailer-only', file, 'every source is a retailer; specs must come from the manufacturer', record.id, 'sources');
    }
    if (policy.manufacturer !== undefined && !record.sources.some((s) => s.publisher === policy.manufacturer)) {
      sink.error(
        'spec-own-manufacturer',
        file,
        `no source is from the manufacturer "${policy.manufacturer}"`,
        record.id,
        'sources',
      );
    }
  }

  const allowed: readonly PublisherKind[] = COVERAGE_KINDS[policy.type];
  const eligible = record.sources.filter((s) => {
    const kind = registry.get(s.publisher)?.kind;
    return kind !== undefined && allowed.includes(kind) && !isArchiveUrl(s.url);
  });

  const uncovered: Leaf[] = [];
  const wrongDocType: Leaf[] = [];
  for (const leaf of valueLeaves) {
    if (leaf.value === null) continue;
    const requirement = policy.docTypes?.find((d) => covers(splitPath(d.path), leaf.path));
    const pool = requirement === undefined ? eligible : eligible.filter((s) => requirement.docTypes.includes(s.docType));
    if (pool.some((s) => sourceCovers(s, leaf.path))) continue;
    if (requirement !== undefined && eligible.some((s) => sourceCovers(s, leaf.path))) wrongDocType.push(leaf);
    else uncovered.push(leaf);
  }
  if (uncovered.length > 0) {
    sink.error(
      'coverage',
      file,
      `${String(uncovered.length)} value(s) have no ${allowed.join(' or ')} source: ${listPaths(uncovered)}`,
      record.id,
    );
  }
  if (wrongDocType.length > 0) {
    const needed = [...new Set(policy.docTypes?.flatMap((d) => d.docTypes) ?? [])].join(' or ');
    sink.error(
      'doc-type',
      file,
      `${String(wrongDocType.length)} value(s) need a ${needed} source: ${listPaths(wrongDocType)}`,
      record.id,
    );
  }

  const nullNone = policy.nullMeansNone.map(splitPath);
  const noteFields = (record.notes ?? []).flatMap((n) => (n.field === undefined ? [] : [splitPath(n.field)]));
  const unexplained = valueLeaves.filter(
    (l) => l.value === null && !coversAny(nullNone, l.path) && !coversAny(noteFields, l.path),
  );
  if (unexplained.length > 0) {
    sink.error(
      'null-note',
      file,
      `${String(unexplained.length)} null value(s) have no note saying why: ${listPaths(unexplained)}`,
      record.id,
    );
  }
}
