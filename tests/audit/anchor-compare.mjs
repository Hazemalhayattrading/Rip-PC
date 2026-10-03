#!/usr/bin/env node
/**
 * Check C, stage 2 (docs/qa/phase-1-worker-briefs.md brief C; test plan §7.3). Owner: qa-lead.
 * Zero dependencies, Node >= 22.
 *
 * Compares a worker's blind transcription (transcribed.json) with the anchor rows it was blind to,
 * field by field, with test plan §7.3's outcomes:
 *   MATCH · NULL OK · MISMATCH (Blocker) · NOT COVERED, a value the source doesn't give (Blocker) ·
 *   NULL BUT PUBLISHED (Major for a value; Blocker for a condition, since "a missing condition is a
 *   Blocker") · UNVERIFIABLE (Major).
 * - A printed value must equal the data at the printed precision, and the data may not be more
 *   precise than the print. A value read off a chart must be within ±1% or ±1 unit, whichever is
 *   larger, and the row must say it was read from a chart (CHART NOT MARKED, Major, if not).
 * - A field the validator exempts from source coverage (src/data/validate/benchmarks.ts: gameId,
 *   limiter, conflictsWith, a creator row's subject) is EXEMPT when the source doesn't state it. A
 *   source that contradicts one is still a MISMATCH.
 * - Three conventions, and nothing else, turn a worker's NOT STATED into a MATCH (as Phase 0's
 *   audit accepted):
 *   - absence: upscaling.method "native", frameGeneration "off" or rayTracing "off", when the
 *     source mentions the feature nowhere and a note on the row says the value was recorded from
 *     that silence;
 *   - read date: a live database's publishedAt, equal to the covering source's retrievedAt, with a
 *     note on publishedAt saying so;
 *   - validator unit: a creator row's unit, which the validator fixes by its app.
 * It also checks what the worker never sees, the catalogue ids (MAPPING, Blocker): each exists in
 * the catalogue, and a CPU, chip or card id names the part the source names.
 *
 * --resolutions holds qa-lead's reviewed judgement on single fields, each with its why and
 * evidence, such as a live database that moved on after the row's retrievedAt. A resolution names
 * the outcome it replaces, so one that no longer fits stops the comparison (exit 2).
 *
 * Usage:
 *   node tests/audit/anchor-compare.mjs --transcribed <transcribed.json> --key-list <key-list.json>
 *     [--resolutions <file>] [--anchors <files>] [--catalogue data/parts] [--repo-root .]
 *     [--json <out>]
 * Exit codes: 0 every field MATCH, NULL OK or EXEMPT · 1 a defect · 2 cannot measure (a key list or
 * transcription that doesn't fit, or data that changed since the key list was built).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { DEFAULT_ANCHORS, keyEntry, KeyInputError, readingsOf, rowsOf } from './anchor-keys.mjs';

export const DEFAULT_CATALOGUE = path.join('data', 'parts');
const VALUES = { game: ['avgFps', 'onePercentLowFps'], creator: ['score'] };
const BASE_CLAIMS = {
  game: [
    'gameId',
    'limiter',
    'resolution',
    'preset',
    'rayTracing',
    'upscaling.method',
    'upscaling.mode',
    'upscaling.version',
    'frameGeneration',
    'scene',
    'gameVersion',
    'publishedAt',
  ],
  creator: [
    'app',
    'appVersion',
    'test',
    'device',
    'backend',
    'subject',
    'unit',
    'aggregate',
    'publishedAt',
  ],
};
const CATALOGUE_IDS = [
  'testSystem.cpu.catalogueId',
  'testSystem.gpu.chipId',
  'testSystem.gpu.cardId',
];
/** Exempt from source coverage by the validator (src/data/validate/benchmarks.ts). */
const EXEMPT = { game: ['gameId', 'limiter', 'conflictsWith'], creator: ['subject'] };
const SEVERITY = {
  MATCH: null,
  'NULL OK': null,
  EXEMPT: null,
  MISMATCH: 'Blocker',
  'NOT COVERED': 'Blocker',
  MAPPING: 'Blocker',
  UNVERIFIABLE: 'Major',
  'CHART NOT MARKED': 'Major',
};

/** Bad input: the comparison cannot be made. */
export class CompareInputError extends Error {}

function readJson(file, what) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    throw new CompareInputError(`cannot read the ${what} ${file}: ${error.message}`);
  }
  try {
    return { json: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex') };
  } catch (error) {
    throw new CompareInputError(`the ${what} ${file} is not JSON: ${error.message}`);
  }
}

const get = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
const same = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
const decimalsOf = (n) => (String(n).split('.')[1] ?? '').length;
// Intel's official names say "Processor" ("Intel Core Ultra 9 Processor 285K"); sources leave it out.
const squash = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\bprocessor\b/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Every claim path of a row: its conditions and test system, never its catalogue ids. */
export function claimPaths(row, kind) {
  const paths = [...BASE_CLAIMS[kind]];
  (function walk(o, p) {
    if (o && typeof o === 'object' && !Array.isArray(o))
      for (const [k, v] of Object.entries(o)) walk(v, `${p}.${k}`);
    else if (!CATALOGUE_IDS.includes(p)) paths.push(p);
  })(row.testSystem, 'testSystem');
  return paths;
}

/** The source that covers a field: its own path, or a parent of it, in sources[].fields. */
function sourceFor(row, field) {
  return (
    row.sources.find((s) =>
      (s.fields ?? []).some((f) => field === f || field.startsWith(`${f}.`)),
    ) ?? null
  );
}

/** The decimals a printed number has, read so that it means the worker's value. */
export function printedDecimals(printedAs, value) {
  const token = String(printedAs ?? '').replace(/\s/g, '');
  const reading = readingsOf(token).find((r) => same(r.n, value));
  return reading ? reading.decimals : null;
}

/** §7.3 for one value field. */
export function compareValue(dataValue, t, notes, field) {
  if (!t) return { outcome: 'INPUT', note: `no ${field} in the transcription` };
  if (t.how === 'not published')
    return dataValue === null
      ? { outcome: 'NULL OK' }
      : { outcome: 'NOT COVERED', note: 'the source publishes no such value' };
  if (typeof t.value !== 'number' || !Number.isFinite(t.value))
    return { outcome: 'INPUT', note: `${field}: the worker's value is not a number` };
  if (dataValue === null) return { outcome: 'NULL BUT PUBLISHED', severity: 'Major' };
  if (t.how === 'chart') {
    const within = Math.abs(dataValue - t.value) <= Math.max(Math.abs(dataValue) * 0.01, 1);
    if (!within)
      return { outcome: 'MISMATCH', note: 'outside ±1% or ±1 unit of the chart reading' };
    const marked = notes.some((n) => n.field === field && /chart/i.test(n.text ?? ''));
    return marked
      ? { outcome: 'MATCH', note: 'read off a chart, within tolerance' }
      : { outcome: 'CHART NOT MARKED', note: "read off a chart, but the row doesn't say so" };
  }
  if (t.how !== 'printed') return { outcome: 'INPUT', note: `${field}: "how" is ${t.how}` };
  const d = printedDecimals(t.printedAs, t.value);
  if (d === null)
    return {
      outcome: 'INPUT',
      note: `${field}: printedAs "${t.printedAs}" does not read as ${t.value}`,
    };
  if (decimalsOf(dataValue) > d)
    return { outcome: 'MISMATCH', note: `the data has more decimals than the print (${d})` };
  return same(round(dataValue, d), t.value)
    ? { outcome: 'MATCH' }
    : { outcome: 'MISMATCH', note: `the source prints ${t.printedAs}` };
}

const ABSENCE = {
  'upscaling.method': { claim: 'native', note: /upscal/i },
  frameGeneration: { claim: 'off', note: /frame ?gen/i },
  rayTracing: { claim: 'off', note: /ray ?trac/i },
};

/** A documented convention that makes a NOT STATED a MATCH, or null. */
export function convention(row, field, claim) {
  // The validator fixes a creator row's unit by its app (src/data/validate/benchmarks.ts).
  if (field === 'unit' && row.app !== undefined)
    return claim === (row.app === 'blender' ? 'samples-per-minute' : 'points')
      ? 'validator unit'
      : null;
  const absence = ABSENCE[field];
  if (absence && claim === absence.claim) {
    const noted = (row.notes ?? []).some(
      (n) => absence.note.test(n.text ?? '') && /\b(no|not|none|without)\b/i.test(n.text ?? ''),
    );
    return noted ? 'absence' : null;
  }
  if (field === 'publishedAt' && typeof claim === 'string') {
    const source = sourceFor(row, field);
    const noted = (row.notes ?? []).some(
      (n) => n.field === 'publishedAt' && /\b(read|retrieved)\b/i.test(n.text ?? ''),
    );
    return source && source.retrievedAt === claim && noted ? 'read date' : null;
  }
  return null;
}

/** §7.3 for one condition, from the worker's verdict on the data's claim. */
export function compareCondition(row, kind, field, claim, v) {
  if (!v) return { outcome: 'INPUT', note: `no verdict for ${field}` };
  const exempt = EXEMPT[kind].includes(field);
  switch (v.verdict) {
    case 'MATCH':
      return { outcome: claim === null ? 'NULL OK' : 'MATCH' };
    case 'MISMATCH':
      return claim === null
        ? { outcome: 'NULL BUT PUBLISHED', severity: 'Blocker' }
        : { outcome: 'MISMATCH' };
    case 'NOT STATED': {
      if (claim === null) return { outcome: 'NULL OK' };
      if (exempt)
        return { outcome: 'EXEMPT', note: 'exempt from source coverage by the validator' };
      const how = convention(row, field, claim);
      return how ? { outcome: 'MATCH', convention: how } : { outcome: 'NOT COVERED' };
    }
    case 'UNVERIFIABLE':
      return { outcome: 'UNVERIFIABLE' };
    default:
      return { outcome: 'INPUT', note: `verdict "${v.verdict}" for ${field}` };
  }
}

/** Every catalogue part id, by file: { cpu: Map(id -> item), ... }. */
export function readCatalogue(dir) {
  const out = {};
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const { json } = readJson(path.join(dir, name), 'catalogue file');
    out[name.replace(/\.json$/, '')] = new Map((json.items ?? []).map((i) => [i.id, i]));
  }
  return out;
}

/** The catalogue ids of one row: each exists, and names the part the source names. */
export function compareMapping(row, kind, catalogue) {
  const checks = [];
  const check = (field, file, id, sourceName) => {
    if (id === null || id === undefined) return;
    const item = catalogue[file]?.get(id);
    if (!item) {
      checks.push({ field, value: id, outcome: 'MAPPING', note: `not in data/parts/${file}.json` });
      return;
    }
    if (sourceName !== undefined && !squash(sourceName).includes(squash(item.name))) {
      checks.push({
        field,
        value: id,
        outcome: 'MAPPING',
        note: `the catalogue's "${item.name}" is not the source's "${sourceName}"`,
      });
      return;
    }
    checks.push({ field, value: id, outcome: 'MATCH', note: `the catalogue's "${item.name}"` });
  };
  if (kind === 'game') {
    const ts = row.testSystem ?? {};
    check('testSystem.cpu.catalogueId', 'cpu', ts.cpu?.catalogueId, ts.cpu?.name);
    check('testSystem.gpu.chipId', 'gpu-chip', ts.gpu?.chipId, ts.gpu?.chipName);
    check('testSystem.gpu.cardId', 'gpu-card', ts.gpu?.cardId, ts.gpu?.card);
    const card = ts.gpu?.cardId ? catalogue['gpu-card']?.get(ts.gpu.cardId) : null;
    if (card && card.chipId !== ts.gpu.chipId)
      checks.push({
        field: 'testSystem.gpu.cardId',
        value: ts.gpu.cardId,
        outcome: 'MAPPING',
        note: `the card's chip is ${card.chipId}, the row's ${ts.gpu.chipId}`,
      });
  } else {
    const s = row.subject ?? {};
    if (s.type === 'cpu') check('subject.cpuId', 'cpu', s.cpuId);
    else if (s.type === 'gpu') check('subject.chipId', 'gpu-chip', s.chipId);
  }
  return checks;
}

/**
 * qa-lead's reviewed judgements on single fields, such as a live database that moved on after the
 * row's retrievedAt. Each names the outcome it expects to replace, so a resolution that no longer
 * fits the comparison stops it instead of hiding a new finding.
 */
function applyResolutions(records, resolutions) {
  for (const [i, r] of resolutions.entries()) {
    if (!r || typeof r.why !== 'string' || !r.why || typeof r.evidence !== 'string' || !r.evidence)
      throw new CompareInputError(`resolution ${i} needs a "why" and its "evidence"`);
    if (!(r.outcome in SEVERITY))
      throw new CompareInputError(`resolution ${i}: "${r.outcome}" is not an outcome`);
    const found = records.find((x) => x.record === r.record && x.field === r.field);
    if (!found)
      throw new CompareInputError(`resolution ${i}: ${r.record} ${r.field} is not compared`);
    if (found.outcome !== r.from)
      throw new CompareInputError(
        `resolution ${i}: ${r.record} ${r.field} is ${found.outcome} now, not ${r.from}; review it again`,
      );
    found.resolvedFrom = found.outcome;
    found.outcome = r.outcome;
    found.severity = SEVERITY[r.outcome];
    found.resolution = { why: r.why, evidence: r.evidence };
  }
}

/** The comparison of one transcription, with its key list and the data rows. */
export function compare({
  transcribed,
  keyList,
  keyListSha256,
  rows,
  catalogue,
  resolutions = [],
}) {
  if (transcribed?.keyListSha256 !== keyListSha256)
    throw new CompareInputError(
      `the transcription was made from key list ${transcribed?.keyListSha256}, not this one (${keyListSha256})`,
    );
  if (!Array.isArray(transcribed.rows))
    throw new CompareInputError('the transcription has no rows');
  const byId = new Map(rows.map((r) => [r.row.id, r]));
  const records = [];
  const stale = [];
  for (const key of keyList.keys) {
    const data = byId.get(key.id);
    if (!data) {
      stale.push(`${key.id} is no longer in the anchor files`);
      continue;
    }
    // The key list must still describe the row: every claim but the notes is unchanged.
    const now = keyEntry(data);
    const strip = (entry) => {
      const claims = { ...entry };
      delete claims.notes;
      delete claims.withheldNotes;
      return claims;
    };
    if (JSON.stringify(strip(now)) !== JSON.stringify(strip(key))) {
      stale.push(`${key.id} changed since the key list was built`);
      continue;
    }
    const { row, kind } = data;
    const t = transcribed.rows.find((r) => r.id === row.id);
    if (!t) throw new CompareInputError(`the transcription has no row ${row.id}`);
    const add = (field, value, result, found) => {
      const source = sourceFor(row, field);
      records.push({
        record: row.id,
        field,
        value,
        sourceUrl: source?.url ?? null,
        archiveUrl: source?.archiveUrl ?? null,
        found,
        outcome: result.outcome,
        severity: result.severity ?? SEVERITY[result.outcome] ?? null,
        ...(result.convention && { convention: result.convention }),
        ...(result.note && { note: result.note }),
      });
    };
    if (t.unverifiable) {
      for (const field of [...VALUES[kind], ...claimPaths(row, kind)])
        add(
          field,
          get(row, field) ?? null,
          { outcome: 'UNVERIFIABLE', note: String(t.unverifiable) },
          null,
        );
      continue;
    }
    for (const field of VALUES[kind]) {
      const tv = t.values?.[field];
      add(
        field,
        row[field] ?? null,
        compareValue(row[field] ?? null, tv, row.notes ?? [], field),
        tv?.printedAs ?? null,
      );
    }
    for (const field of claimPaths(row, kind)) {
      const claim = get(row, field) ?? null;
      let v = t.conditions?.[field];
      if (!v) {
        const s = transcribed.shared?.[field];
        if (s && JSON.stringify(s.claim ?? null) === JSON.stringify(claim)) v = s;
      }
      add(field, claim, compareCondition(row, kind, field, claim, v), v?.source ?? null);
    }
    if (catalogue)
      for (const m of compareMapping(row, kind, catalogue))
        add(m.field, m.value, { outcome: m.outcome, note: m.note }, null);
  }
  if (stale.length)
    throw new CompareInputError(
      `the data changed since the key list was built; rebuild it and transcribe again: ${stale.join('; ')}`,
    );
  const inputProblems = records.filter((r) => r.outcome === 'INPUT');
  if (inputProblems.length)
    throw new CompareInputError(
      `the transcription doesn't fit: ${inputProblems.map((r) => `${r.record} ${r.field}: ${r.note}`).join('; ')}`,
    );
  applyResolutions(records, resolutions);
  const counts = {};
  for (const r of records) counts[r.outcome] = (counts[r.outcome] ?? 0) + 1;
  const defects = records.filter((r) => r.severity);
  return {
    ok: defects.length === 0,
    review: keyList.review,
    summary: {
      rows: keyList.keys.length,
      fields: records.length,
      counts,
      blockers: defects.filter((d) => d.severity === 'Blocker').length,
      majors: defects.filter((d) => d.severity === 'Major').length,
      conventions: records.filter((r) => r.convention).length,
      resolved: records.filter((r) => r.resolvedFrom).length,
    },
    defects,
    records,
  };
}

export function formatCompare(result) {
  const s = result.summary;
  const lines = [
    `Check C, stage 2 · ${result.review} · ${s.rows} rows, ${s.fields} fields`,
    `  ${Object.entries(s.counts)
      .map(([k, v]) => `${k} ${v}`)
      .join(' · ')}${s.conventions ? ` · (${s.conventions} by a documented convention)` : ''}`,
  ];
  for (const r of result.records.filter((x) => x.resolvedFrom))
    lines.push(
      `  ~ resolved ${r.resolvedFrom} -> ${r.outcome}: ${r.record} ${r.field}: ${r.resolution.why}`,
    );
  for (const d of result.defects)
    lines.push(
      `  - ${d.severity} ${d.outcome}: ${d.record} ${d.field}: data ${JSON.stringify(d.value)}, source ${JSON.stringify(d.found)}${d.note ? ` (${d.note})` : ''}`,
    );
  lines.push(result.ok ? 'PASS' : `FAIL: ${s.blockers} Blocker(s), ${s.majors} Major(s)`);
  return lines.join('\n');
}

export function main(argv = process.argv.slice(2)) {
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        transcribed: { type: 'string' },
        'key-list': { type: 'string' },
        anchors: { type: 'string' },
        catalogue: { type: 'string' },
        resolutions: { type: 'string' },
        'repo-root': { type: 'string' },
        json: { type: 'string' },
      },
      strict: true,
    });
    if (!values.transcribed || !values['key-list'])
      throw new CompareInputError('--transcribed and --key-list are required');
    const repoRoot = path.resolve(values['repo-root'] ?? '.');
    const files = (values.anchors ?? DEFAULT_ANCHORS.join(','))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((file) => {
        const doc = readJson(path.resolve(repoRoot, file), 'anchor file');
        return { file, json: doc.json, sha256: doc.sha256 };
      });
    const keyDoc = readJson(values['key-list'], 'key list');
    const tDoc = readJson(values.transcribed, 'transcription');
    const catalogueDir = path.resolve(repoRoot, values.catalogue ?? DEFAULT_CATALOGUE);
    const resDoc = values.resolutions ? readJson(values.resolutions, 'resolutions file') : null;
    if (resDoc && !Array.isArray(resDoc.json?.resolutions))
      throw new CompareInputError('the resolutions file must be { "resolutions": [ ... ] }');
    const result = compare({
      transcribed: tDoc.json,
      keyList: keyDoc.json,
      keyListSha256: keyDoc.sha256,
      rows: rowsOf(files),
      catalogue: readCatalogue(catalogueDir),
      resolutions: resDoc?.json.resolutions ?? [],
    });
    const inputs = {
      transcribed: { file: values.transcribed, sha256: tDoc.sha256 },
      keyList: { file: values['key-list'], sha256: keyDoc.sha256 },
      anchors: files.map((f) => ({ file: f.file, sha256: f.sha256 })),
      ...(resDoc && { resolutions: { file: values.resolutions, sha256: resDoc.sha256 } }),
    };
    if (values.json) {
      const out = path.resolve(values.json);
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(
        out,
        `${JSON.stringify({ tool: 'anchor-compare', inputs, ...result }, null, 2)}\n`,
      );
    }
    process.stdout.write(`${formatCompare(result)}\n`);
    return result.ok ? 0 : 1;
  } catch (error) {
    // Any failure to measure is exit 2, never 1 (an uncaught exception would exit 1).
    const detail =
      error instanceof CompareInputError || error instanceof KeyInputError
        ? error.message
        : (error?.stack ?? String(error));
    process.stderr.write(`anchor-compare: ${detail}\n`);
    return 2;
  }
}

function invokedDirectly() {
  try {
    return (
      Boolean(process.argv[1]) &&
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (invokedDirectly()) process.exitCode = main();
