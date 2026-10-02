import { COMPAT_RULE_IDS, FIXTURE_OUTCOMES, type Fixture, type FixtureParts } from '../schema/compat-fixtures';
import { DATA_PATHS, type SpecCategory, type SpecRecord } from '../schema/files';
import { COVERAGE_KINDS, type PublisherKind } from '../schema/publisher';
import { nullIsNone } from '../semantics';
import type { IssueSink } from './issues';
import type { Dataset } from './parse';
import { covers, splitPath } from './paths';
import { checkSource, type Registry } from './sources';

/** The catalogue category each slot of a fixture build holds. */
const SLOT_CATEGORY: Readonly<Record<keyof FixtureParts, SpecCategory>> = {
  cpu: 'cpu',
  motherboard: 'motherboard',
  ram: 'ram',
  'gpu-card': 'gpu-card',
  storage: 'storage',
  psu: 'psu',
  cooler: 'cooler',
  case: 'case',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The value at a concrete dot path (array indices as numbers), or `found: false`. */
function valueAt(record: unknown, path: readonly string[]): { found: boolean; value: unknown } {
  let node: unknown = record;
  for (const segment of path) {
    if (Array.isArray(node) && /^\d+$/.test(segment) && Number(segment) < node.length) node = node[Number(segment)];
    else if (isPlainObject(node) && Object.hasOwn(node, segment)) node = node[segment];
    else return { found: false, value: undefined };
  }
  return { found: true, value: node };
}

/** Structural equality for JSON values; object key order doesn't matter. */
function sameJson(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => sameJson(x, b[i]));
  }
  if (isPlainObject(a) || isPlainObject(b)) {
    if (!isPlainObject(a) || !isPlainObject(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => Object.hasOwn(b, k) && sameJson(a[k], b[k]));
  }
  return a === b;
}

const shown = (value: unknown): string => {
  const text = value === undefined ? 'undefined' : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
};

/** The build's part IDs, with the category each must be in. */
function buildParts(parts: FixtureParts): { slot: keyof FixtureParts; category: SpecCategory; id: string }[] {
  return (Object.keys(parts) as (keyof FixtureParts)[]).flatMap((slot) => {
    const value = parts[slot];
    const ids = value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
    return ids.map((id) => ({ slot, category: SLOT_CATEGORY[slot], id }));
  });
}

function checkFixture(
  sink: IssueSink,
  file: string,
  fixture: Fixture,
  at: string,
  byCategory: ReadonlyMap<SpecCategory, ReadonlyMap<string, SpecRecord>>,
  registry: Registry,
  today: string,
): void {
  const fid = fixture.id;
  const inBuild = new Map<string, SpecRecord>();
  const parts = buildParts(fixture.parts);
  if (parts.length === 0 && fixture.parts['gpu-card'] !== null) sink.error('fixture-fact', file, 'the fixture names no part', fid, `${at}.parts`);
  for (const p of parts) {
    const record = byCategory.get(p.category)?.get(p.id);
    if (record === undefined) sink.error('ref', file, `${p.slot} "${p.id}" is not in ${DATA_PATHS.specs[p.category]}`, fid, `${at}.parts.${p.slot}`);
    else inBuild.set(p.id, record);
  }
  const makerKinds: readonly PublisherKind[] = COVERAGE_KINDS.spec;
  fixture.facts.forEach((fact, j) => {
    const fat = `${at}.facts.${String(j)}`;
    const record = inBuild.get(fact.part);
    if (record === undefined) {
      if (!parts.some((p) => p.id === fact.part)) sink.error('fixture-fact', file, `fact part "${fact.part}" is not in the fixture's build`, fid, `${fat}.part`);
      return;
    }
    const path = splitPath(fact.path);
    const { found, value } = valueAt(record, path);
    if (!found) {
      sink.error('fixture-fact', file, `"${fact.path}" is not a field of "${record.id}"`, fid, `${fat}.path`);
      return;
    }
    if (!sameJson(value, fact.value)) {
      sink.error('fixture-fact', file, `"${record.id}" holds ${shown(value)} at ${fact.path}, not ${shown(fact.value)}`, fid, `${fat}.value`);
      return;
    }
    if (value === null) {
      const noted = (record.notes ?? []).some((n) => n.field !== undefined && covers(splitPath(n.field), path));
      if (!noted && !nullIsNone(record, fact.path)) {
        sink.error('fixture-fact', file, `null at ${fact.path} has no note on "${record.id}" saying why`, fid, fat);
      }
      return;
    }
    const backed = record.sources.some((s) => {
      const kind = registry.get(s.publisher)?.kind;
      if (kind === undefined || !makerKinds.includes(kind)) return false;
      return s.fields === undefined || s.fields.some((f) => covers(splitPath(f), path) || covers(path, splitPath(f)));
    });
    if (!backed) sink.error('fixture-fact', file, `no maker source on "${record.id}" backs ${fact.path}`, fid, fat);
  });
  fixture.sources?.forEach((s, j) => {
    checkSource(sink, file, fid, `${at}.sources.${String(j)}`, s, registry, today);
  });
}

/**
 * The fixture table (`data/compat-fixtures.json`): every rule once, a fixture or a gap per outcome,
 * real parts, and facts that match the catalogue and its sources.
 */
export function checkCompatFixtures(sink: IssueSink, dataset: Dataset, registry: Registry, today: string): void {
  const table = dataset.compatFixtures;
  if (table === null) return;
  const file = DATA_PATHS.compatFixtures;
  const byCategory = new Map<SpecCategory, Map<string, SpecRecord>>();
  for (const category of Object.values(SLOT_CATEGORY)) {
    const records: readonly SpecRecord[] = dataset.specs[category] ?? [];
    byCategory.set(category, new Map(records.map((r) => [r.id, r])));
  }

  const seenRules = new Set<string>();
  const fixtureIds = new Set<string>();
  table.rules.forEach((entry, i) => {
    const at = `rules.${String(i)}`;
    if (seenRules.has(entry.rule)) sink.error('fixture-coverage', file, `rule "${entry.rule}" is listed twice`, entry.rule, at);
    seenRules.add(entry.rule);
    for (const outcome of FIXTURE_OUTCOMES) {
      const fixtures = entry.fixtures.filter((f) => f.outcome === outcome).length;
      const gaps = entry.gaps.filter((g) => g.outcome === outcome).length;
      if (fixtures === 0 && gaps === 0) sink.error('fixture-coverage', file, `no fixture and no gap for "${outcome}"`, entry.rule, at);
      if (fixtures > 0 && gaps > 0) sink.error('fixture-coverage', file, `"${outcome}" has a fixture and a gap`, entry.rule, at);
      if (gaps > 1) sink.error('fixture-coverage', file, `"${outcome}" has ${String(gaps)} gaps; give one`, entry.rule, at);
    }
    entry.fixtures.forEach((fixture, j) => {
      const fat = `${at}.fixtures.${String(j)}`;
      if (fixtureIds.has(fixture.id)) sink.error('id-unique', file, `fixture ID "${fixture.id}" is used twice`, fixture.id, fat);
      fixtureIds.add(fixture.id);
      if (!fixture.id.startsWith(`${entry.rule}-`)) sink.error('fixture-coverage', file, `fixture IDs start with the rule ID ("${entry.rule}-")`, fixture.id, fat);
      checkFixture(sink, file, fixture, fat, byCategory, registry, today);
    });
  });
  for (const rule of COMPAT_RULE_IDS) {
    if (!seenRules.has(rule)) sink.error('fixture-coverage', file, `rule "${rule}" has no entry`, rule);
  }
}
