/**
 * Spec evidence: reading one spec from a catalogue record, with its unit, its note and the
 * sources that back it (`SpecEvidence` in `./types`). The lab's parts page and every
 * compatibility rule build their evidence here, so the two always cite the same sources.
 *
 * Field paths are the dot paths of `SourceRef.fields`: `lengthMm`, `gpuClearance.1.maxLengthMm`,
 * with `*` for any array index, and "a path covers everything below it".
 */
import type { Note, SourceRef, SpecCategory } from '../data/schema';
import { UNITS, type SpecEvidence, type SpecValue, type Unit } from './types';

/** What these helpers need from a catalogue record. */
export interface SourcedRecord {
  readonly id: string;
  readonly sources: readonly SourceRef[];
  readonly notes?: readonly Note[] | undefined;
}

/** Top-level fields that are not specs: identity, and the record's own sources and notes. */
const NOT_SPECS = new Set(['id', 'category', 'manufacturer', 'sources', 'notes']);

/**
 * Fields with no source of their own, which the lab shows apart: a GPU card's `chipId` is a
 * reference to its chip, and a case's `size` is derived from its boards (`deriveCaseSize`).
 */
export const UNSOURCED_FIELDS: Readonly<Partial<Record<SpecCategory, readonly string[]>>> = {
  'gpu-card': ['chipId'],
  case: ['size'],
};

const isIndex = (segment: string | undefined): boolean =>
  segment !== undefined && (segment === '*' || /^\d+$/.test(segment));

/** Equal segments match, and `*` matches any index. A missing segment matches nothing. */
function segmentsMatch(a: string, b: string | undefined): boolean {
  return a === b || ((a === '*' || b === '*') && isIndex(a) && isIndex(b));
}

/** True when `cover` is `path` or a path above it. `*` matches any array index. */
export function pathCovers(cover: string, path: string): boolean {
  const covered = path.split('.');
  return cover.split('.').every((segment, i) => segmentsMatch(segment, covered[i]));
}

/** True when either path covers the other. */
export function pathsOverlap(a: string, b: string): boolean {
  return pathCovers(a, b) || pathCovers(b, a);
}

/** The sources that back `path`: those whose `fields` overlap it, and those with no `fields`. */
export function sourcesFor(record: Pick<SourcedRecord, 'sources'>, path: string): SourceRef[] {
  return record.sources.filter(
    (source) =>
      source.fields === undefined || source.fields.some((field) => pathsOverlap(field, path)),
  );
}

/**
 * The notes on `path` or a path above it, word for word, the most specific first and joined by
 * a space. `null` when there are none.
 */
export function noteFor(record: Pick<SourcedRecord, 'notes'>, path: string): string | null {
  const notes = (record.notes ?? [])
    .filter((note): note is Note & { field: string } => note.field !== undefined)
    .filter((note) => pathCovers(note.field, path))
    .sort((a, b) => b.field.split('.').length - a.field.split('.').length);
  return notes.length === 0 ? null : notes.map((note) => note.text).join(' ');
}

/** Field-name suffixes and the unit each stands for. Longer suffixes first. */
const SUFFIX_UNITS: readonly (readonly [string, Unit])[] = [
  ['MmH2O', 'mmH2O'],
  ['GBps', 'GB/s'],
  ['MBps', 'MB/s'],
  ['Gbps', 'Gbps'],
  ['Mtps', 'MT/s'],
  ['Mhz', 'MHz'],
  ['Tbw', 'TBW'],
  ['Bits', 'bits'],
  ['Rpm', 'RPM'],
  ['Cfm', 'CFM'],
  ['Years', 'years'],
  ['Slots', 'slots'],
  ['Lanes', 'lanes'],
  ['Mm', 'mm'],
  ['Gb', 'GB'],
  ['Mb', 'MB'],
  ['W', 'W'],
  ['V', 'V'],
];

const NAME_UNITS: Readonly<Record<string, Unit>> = { slots: 'slots', lanes: 'lanes' };

function unitOfName(name: string): Unit | null {
  return NAME_UNITS[name] ?? SUFFIX_UNITS.find(([suffix]) => name.endsWith(suffix))?.[1] ?? null;
}

function isUnit(value: unknown): value is Unit {
  return (UNITS as readonly unknown[]).includes(value);
}

/**
 * The unit of a spec, from its field name (`lengthMm` is in mm, `dimensionsMm.height` too), or
 * for a `value` field, from the `unit` the record states next to it (a fan's noise in dBA or
 * sone). `null` for a value without a unit, or a path that ends in an array index.
 */
export function unitOfField(path: string, record?: unknown): Unit | null {
  const segments = path.split('.');
  const last = path.slice(path.lastIndexOf('.') + 1);
  if (isIndex(last)) return null;
  if (last === 'value') {
    const stated = valueAt(record, [...segments.slice(0, -1), 'unit'].join('.'));
    return isUnit(stated) ? stated : null;
  }
  const parent = segments
    .slice(0, -1)
    .filter((segment) => !isIndex(segment))
    .at(-1);
  return unitOfName(last) ?? (parent === undefined ? null : unitOfName(parent));
}

/** The value at a dot path, or `undefined` when the record has nothing there. */
export function valueAt(record: unknown, path: string): unknown {
  let node: unknown = record;
  for (const segment of path.split('.')) {
    if (Array.isArray(node)) {
      if (!/^\d+$/.test(segment)) return undefined;
      node = (node as readonly unknown[])[Number(segment)];
    } else if (typeof node === 'object' && node !== null && Object.hasOwn(node, segment)) {
      node = (node as Readonly<Record<string, unknown>>)[segment];
    } else {
      return undefined;
    }
  }
  return node;
}

function isScalar(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/** One value, or a list of plain values (a case's supported boards): a single spec. */
function isSpecValue(value: unknown): value is SpecValue {
  return (
    value === null ||
    isScalar(value) ||
    (Array.isArray(value) &&
      value.every((item) => typeof item === 'string' || typeof item === 'number'))
  );
}

/** Counts in a sentence: words from one to nine, digits from 10 (copy guide §3). */
const COUNT_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export function countInWords(count: number): string {
  const word = Number.isInteger(count) && count >= 1 ? COUNT_WORDS[count - 1] : undefined;
  return word ?? String(count);
}

/** Radiator positions as a phrase names them. A position without a word gets no phrase. */
const POSITION_WORDS: Readonly<Partial<Record<string, string>>> = {
  front: 'front',
  top: 'top',
  rear: 'rear',
  bottom: 'bottom',
  side: 'side',
};

const SIZES = new Intl.ListFormat('en-GB', { type: 'disjunction' });

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * A layout condition as a phrase inside a sentence (copy guide §3), or `null` when its kind has
 * no phrase, so the limit shows on its own:
 * - radiator: "with a 360 mm front radiator"; several sizes join with "or", the unit once;
 * - drive trays: "with one HDD tray", "with two HDD trays".
 * Text from data written before conditions were structured (WP-D1) passes through as it is.
 */
export function conditionPhrase(condition: unknown): string | null {
  if (typeof condition === 'string') return condition;
  const kind = valueAt(condition, 'kind');
  if (kind === 'radiator') {
    const position = valueAt(condition, 'position');
    const where = typeof position === 'string' ? POSITION_WORDS[position] : undefined;
    const sizes = valueAt(condition, 'sizesMm');
    if (where === undefined || !Array.isArray(sizes) || sizes.length === 0) return null;
    if (!sizes.every(isPositiveNumber)) return null;
    return `with a ${SIZES.format(sizes.map(String))}\u00A0mm ${where} radiator`;
  }
  if (kind === 'drive-trays') {
    const count = valueAt(condition, 'count');
    if (!isPositiveNumber(count) || !Number.isInteger(count)) return null;
    return `with ${countInWords(count)} HDD ${count === 1 ? 'tray' : 'trays'}`;
  }
  return null;
}

/** The path of the `condition` in the same row as `path`, or `null` outside such a row. */
function conditionPath(path: string): string | null {
  const segments = path.split('.');
  if (segments.length < 2 || segments.includes('condition')) return null;
  return [...segments.slice(0, -1), 'condition'].join('.');
}

/**
 * The condition of a conditional limit, as a phrase: from the `condition` beside the value in
 * its row (`gpuClearance.1.maxLengthMm` reads `gpuClearance.1.condition`). `null` for a value
 * outside such a row, an unconditional row, the condition's own fields, and a kind without a
 * phrase.
 */
export function conditionOf(record: unknown, path: string): string | null {
  const at = conditionPath(path);
  return at === null ? null : conditionPhrase(valueAt(record, at));
}

/**
 * The maker's own words for that condition (`asPublished`), which the lab quotes under the
 * value for audit (lab-spec §5). `null` when the row has no structured condition.
 */
export function conditionAsPublished(record: unknown, path: string): string | null {
  const at = conditionPath(path);
  const asPublished = at === null ? undefined : valueAt(record, `${at}.asPublished`);
  return typeof asPublished === 'string' ? asPublished : null;
}

/**
 * The evidence for one spec of a record.
 * @param noneOnNull the record's "null means none" paths (data-lead's `nullMeansNone`), so a
 *   null there reads as `none` ("no integrated graphics"), not as `not-published`
 * @throws {RangeError} when the record has no spec at `path`, or holds a group of specs there
 */
export function evidenceFor(
  category: SpecCategory,
  record: SourcedRecord,
  path: string,
  noneOnNull: readonly string[],
): SpecEvidence {
  const value = valueAt(record, path);
  if (value === undefined) throw new RangeError(`${record.id} has no spec at ${path}.`);
  if (!isSpecValue(value)) {
    throw new RangeError(`${record.id} has no single value at ${path}: it is a group of specs.`);
  }
  const availability =
    value !== null
      ? 'published'
      : noneOnNull.some((pattern) => pathCovers(pattern, path))
        ? 'none'
        : 'not-published';
  return {
    partId: record.id,
    category,
    field: path,
    value,
    unit: unitOfField(path, record),
    availability,
    condition: conditionOf(record, path),
    note: noteFor(record, path),
    sources: sourcesFor(record, path),
  };
}

/** The paths of every single spec under `node`, in record order. */
function leafPaths(node: unknown, path: string): string[] {
  if (isSpecValue(node)) return [path];
  const entries: [string, unknown][] = Array.isArray(node)
    ? (node as readonly unknown[]).map((item, i) => [String(i), item])
    : Object.entries(node as Readonly<Record<string, unknown>>);
  return entries.flatMap(([key, child]) => leafPaths(child, `${path}.${key}`));
}

/**
 * Every spec of a record, as evidence, for the lab's parts page: one entry per value, and one
 * per list of plain values. Identity fields, sources, notes and `UNSOURCED_FIELDS` are left out.
 */
export function specLeaves(
  category: SpecCategory,
  record: SourcedRecord,
  noneOnNull: readonly string[],
): SpecEvidence[] {
  const skipped = new Set([...NOT_SPECS, ...(UNSOURCED_FIELDS[category] ?? [])]);
  return Object.entries(record)
    .filter(([key]) => !skipped.has(key))
    .flatMap(([key, value]) => leafPaths(value, key))
    .map((path) => evidenceFor(category, record, path, noneOnNull));
}
