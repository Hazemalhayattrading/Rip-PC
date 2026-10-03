#!/usr/bin/env node
/**
 * Blind anchor key list (docs/qa/phase-1-worker-briefs.md brief C; phase-1-plan §4, "Every benchmark
 * anchor: the data"). Owner: qa-lead. Zero dependencies, Node >= 22.
 *
 * Check C's worker reads each anchor row's value from its source before it sees ours. This tool
 * gives the worker everything it needs to find each value, and no value: per row, the id, the game
 * or workload, the test system, every test condition, the notes and the sources (url, archive,
 * locator), all as claims to re-read. The value fields (avgFps, onePercentLowFps, score) never
 * reach the list:
 * - the list is built from known fields only, and a field the tool does not know stops it, so a new
 *   value field cannot slip through;
 * - a free-text field (a source's title or locator, a note) that prints any value of the review,
 *   its own row's or another's, stops it too, and nothing is written. With --drop-leaking-notes a
 *   note that prints one is withheld instead, and the row's entry names the field it was on; a
 *   title or locator that prints one still stops it.
 *
 * A source review is every row whose first source is the same page: its URL without the query or
 * fragment, so Blender Open Data's three backend queries are one review. A review of more than
 * about 50 rows is split with --part (brief C).
 *
 * Usage:
 *   node tests/audit/anchor-keys.mjs --list [--anchors <files>] [--repo-root .]
 *   node tests/audit/anchor-keys.mjs --review <url> [--part <i>/<n>] [--drop-leaking-notes]
 *     --out <key-list.json> [--anchors <files>] [--repo-root .]
 * Exit codes: 0 written (or listed) · 1 a value leaks into a free-text field · 2 cannot build it.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const DEFAULT_ANCHORS = ['data/benchmarks/game.json', 'data/benchmarks/creator.json'];
export const VALUE_FIELDS = ['avgFps', 'onePercentLowFps', 'score'];
/** The fields a key list carries, by row kind. Every other field is a value or unknown. */
export const CLAIM_FIELDS = {
  game: [
    'id',
    'gameId',
    'limiter',
    'testSystem',
    'gameVersion',
    'scene',
    'resolution',
    'preset',
    'rayTracing',
    'upscaling',
    'frameGeneration',
    'publishedAt',
    'sources',
    'notes',
  ],
  creator: [
    'id',
    'app',
    'appVersion',
    'test',
    'device',
    'backend',
    'subject',
    'unit',
    'aggregate',
    'testSystem',
    'publishedAt',
    'sources',
    'notes',
  ],
};
const SOURCE_FIELDS = [
  'url',
  'publisher',
  'retrievedAt',
  'docType',
  'fields',
  'title',
  'locator',
  'archiveUrl',
];
const NOTE_FIELDS = ['field', 'text'];

/** Bad input: the tool cannot build a blind list. */
export class KeyInputError extends Error {}

function readJson(file, what) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    throw new KeyInputError(`cannot read the ${what} ${file}: ${error.message}`);
  }
  try {
    return { json: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex') };
  } catch (error) {
    throw new KeyInputError(`the ${what} ${file} is not JSON: ${error.message}`);
  }
}

/** The review a URL belongs to: the page without its query or fragment. */
export function reviewKey(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    throw new KeyInputError(`not a URL: ${url}`);
  }
}

function kindOf(file) {
  if (file.endsWith('game.json')) return 'game';
  if (file.endsWith('creator.json')) return 'creator';
  throw new KeyInputError(`${file} is neither a game nor a creator anchor file`);
}

/** Every row of the anchor files, with its kind and review. Ids must be unique. */
export function rowsOf(files) {
  const rows = [];
  const seen = new Set();
  for (const { file, json } of files) {
    const kind = kindOf(file);
    if (!json || !Array.isArray(json.items))
      throw new KeyInputError(`${file} must be { "schemaVersion": 1, "items": [ ... ] }`);
    for (const [i, row] of json.items.entries()) {
      if (!row || typeof row.id !== 'string')
        throw new KeyInputError(`${file} item ${i} has no id`);
      if (seen.has(row.id)) throw new KeyInputError(`anchor id ${row.id} is listed twice`);
      seen.add(row.id);
      if (!Array.isArray(row.sources) || !row.sources.length)
        throw new KeyInputError(`anchor ${row.id} has no sources`);
      rows.push({ row, file, kind, review: reviewKey(row.sources[0].url) });
    }
  }
  return rows;
}

/** The source reviews in the anchor files, in file order, with their row counts. */
export function listReviews(rows) {
  const reviews = new Map();
  for (const r of rows) {
    const entry = reviews.get(r.review) ?? { review: r.review, rows: 0, kinds: new Set() };
    entry.rows += 1;
    entry.kinds.add(r.kind);
    reviews.set(r.review, entry);
  }
  return [...reviews.values()].map((e) => ({ ...e, kinds: [...e.kinds] }));
}

function only(object, allowed, where) {
  const unknown = Object.keys(object).filter((k) => !allowed.includes(k));
  if (unknown.length)
    throw new KeyInputError(
      `${where} has a field this tool does not know: ${unknown.join(', ')}. Classify it as a claim or a value in anchor-keys.mjs first`,
    );
}

/** One row's blind entry: its claims, never its values. */
export function keyEntry({ row, kind }) {
  only(row, [...CLAIM_FIELDS[kind], ...VALUE_FIELDS], `anchor ${row.id}`);
  const entry = { kind };
  for (const field of CLAIM_FIELDS[kind]) if (field in row) entry[field] = row[field];
  for (const [i, s] of entry.sources.entries())
    only(s, SOURCE_FIELDS, `anchor ${row.id} source ${i}`);
  for (const [i, n] of (entry.notes ?? []).entries())
    only(n, NOTE_FIELDS, `anchor ${row.id} note ${i}`);
  return structuredClone(entry);
}

// The no-break spaces some publishers group thousands with (5 798,32), built at run time so the
// source holds no irregular whitespace.
const GROUP_SPACES = String.fromCharCode(0xa0, 0x202f);
// Numbers that are not values, blanked before reading: times (21:35:42), dates and ranges
// (2026-06-24, 30-38-38-96, DDR5-6000) and dotted versions (26.3.1, 5.2.0).
const NOT_VALUES = /\d+(?::\d+)+|\d+(?:-\d+)+|\d+(?:\.\d+){2,}/g;
// A number standing alone: not glued to a word before it (B580, R5), and not running on.
const NUMBER = new RegExp(
  String.raw`(?<![\w.,])(\d{1,3}(?:[,.${GROUP_SPACES}]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?![\d]|[.,]\d)`,
  'g',
);

/** What a printed number can mean, as { n, decimals }: "2.448" is 2.448 or 2448, "145,6" 145.6. */
export function readingsOf(token) {
  const out = [];
  for (const point of ['.', ',']) {
    const parts = token.split(point);
    if (parts.length > 2) continue;
    const [whole, fraction] = parts;
    const groups = whole.split(new RegExp(`[${point === '.' ? ',' : '.'}${GROUP_SPACES}]`));
    if (groups.length > 1 && (groups[0].length > 3 || groups.slice(1).some((g) => g.length !== 3)))
      continue;
    const digits = groups.join('');
    out.push({
      n: Number(fraction === undefined ? digits : `${digits}.${fraction}`),
      decimals: fraction?.length ?? 0,
    });
  }
  return out;
}

/** Every number printed in a text, with its readings. */
export function numbersIn(text) {
  return [...text.replace(NOT_VALUES, ' ').matchAll(NUMBER)].map((m) => ({
    token: m[1],
    readings: readingsOf(m[1]),
  }));
}

const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
const same = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

/**
 * Whether a reading gives a value away. Printed at the value's precision or finer, it rounds to the
 * value (16066.367… gives 16066.37 away). Printed coarser, it is the value rounded, and still gives
 * it away with a decimal or 4 digits or more (5798.32 as 5798.3 or 5798; a 33 doesn't give 33.1).
 */
export function givesAway({ n, decimals }, value) {
  const own = (String(value).split('.')[1] ?? '').length;
  if (decimals >= own) return same(round(n, own), value);
  return (decimals >= 1 || Math.abs(value) >= 1000) && same(round(value, decimals), n);
}

/** Every value of the given rows, as { id, field, value }. */
export function valuesOf(rows) {
  return rows.flatMap(({ row }) =>
    VALUE_FIELDS.filter((f) => typeof row[f] === 'number' && Number.isFinite(row[f])).map(
      (field) => ({ id: row.id, field, value: row[field] }),
    ),
  );
}

/**
 * Where a value of the review is printed in an entry's free text. The values are the whole
 * review's, since the worker transcribes every row of it:
 * - a note, which is prose, is checked against every value;
 * - a title or locator, which points into the source, against the row's own values and the other
 *   rows' decimal ones. Another row's whole number there is the source's own numbering, such as
 *   "image 14 of 22", which the worker needs.
 */
export function leaksOf(entry, values) {
  const pointers = entry.sources
    .flatMap((s, i) => [
      [`sources[${i}].title`, s.title],
      [`sources[${i}].locator`, s.locator],
    ])
    .filter(([, text]) => typeof text === 'string');
  const notes = (entry.notes ?? [])
    .map((n, i) => [`notes[${i}].text`, n.text])
    .filter(([, text]) => typeof text === 'string');
  const leaks = [];
  for (const [where, text] of [...pointers, ...notes]) {
    const isNote = where.startsWith('notes');
    for (const { token, readings } of numbersIn(text))
      for (const v of values) {
        if (!isNote && v.id !== entry.id && Number.isInteger(v.value)) continue;
        if (readings.some((r) => givesAway(r, v.value)))
          leaks.push({ id: entry.id, where, text, value: { ...v, printed: token } });
      }
  }
  return leaks;
}

/** Parses "i/n" for --part. */
export function parsePart(part) {
  const m = /^(\d+)\/(\d+)$/.exec(part ?? '');
  const [i, n] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
  if (!m || n < 1 || i < 1 || i > n) throw new KeyInputError(`--part must be i/n, 1 <= i <= n`);
  return { i, n };
}

/**
 * The key list of one review (or one part of it), and any value that still leaks into it. With
 * dropLeakingNotes, a note that prints a value is withheld, and its entry says which field the
 * note was on; a title or locator that prints one still leaks.
 */
export function buildKeyList(rows, review, { part = null, dropLeakingNotes = false } = {}) {
  const key = reviewKey(review);
  const all = rows.filter((r) => r.review === key);
  if (!all.length) throw new KeyInputError(`no anchor row has its first source at ${key}`);
  let picked = all;
  if (part) {
    const size = Math.ceil(all.length / part.n);
    picked = all.slice((part.i - 1) * size, part.i * size);
    if (!picked.length) throw new KeyInputError(`part ${part.i}/${part.n} of ${key} is empty`);
  }
  const values = valuesOf(all);
  const keys = picked.map(keyEntry);
  let withheld = 0;
  if (dropLeakingNotes)
    for (const entry of keys) {
      const leaking = new Set(
        leaksOf(entry, values)
          .map((l) => /^notes\[(\d+)\]/.exec(l.where))
          .filter(Boolean)
          .map((m) => Number(m[1])),
      );
      if (!leaking.size) continue;
      entry.withheldNotes = entry.notes
        .filter((_, i) => leaking.has(i))
        .map((n) => ({ field: n.field ?? null }));
      entry.notes = entry.notes.filter((_, i) => !leaking.has(i));
      withheld += leaking.size;
    }
  const leaks = keys.flatMap((entry) => leaksOf(entry, values));
  return {
    list: {
      schemaVersion: 1,
      tool: 'anchor-keys',
      review: key,
      reviewRows: all.length,
      ...(part && { part: `${part.i}/${part.n}` }),
      rows: keys.length,
      valueFields: VALUE_FIELDS,
      withheldNotes: withheld,
      keys,
    },
    leaks,
  };
}

export function main(argv = process.argv.slice(2)) {
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        list: { type: 'boolean' },
        review: { type: 'string' },
        part: { type: 'string' },
        'drop-leaking-notes': { type: 'boolean' },
        out: { type: 'string' },
        anchors: { type: 'string' },
        'repo-root': { type: 'string' },
      },
      strict: true,
    });
    const repoRoot = path.resolve(values['repo-root'] ?? '.');
    const files = (values.anchors ?? DEFAULT_ANCHORS.join(','))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((file) => {
        const doc = readJson(path.resolve(repoRoot, file), 'anchor file');
        return { file, json: doc.json, sha256: doc.sha256 };
      });
    const rows = rowsOf(files);
    if (values.list) {
      for (const r of listReviews(rows))
        process.stdout.write(`${String(r.rows).padStart(4)}  ${r.kinds.join(',')}  ${r.review}\n`);
      process.stdout.write(`${rows.length} rows\n`);
      return 0;
    }
    if (!values.review || !values.out)
      throw new KeyInputError('use --list, or --review <url> with --out <file>');
    const part = values.part ? parsePart(values.part) : null;
    const { list, leaks } = buildKeyList(rows, values.review, {
      part,
      dropLeakingNotes: Boolean(values['drop-leaking-notes']),
    });
    if (leaks.length) {
      process.stderr.write(
        `anchor-keys: ${leaks.length} value(s) printed in free text; nothing written (a note can be withheld with --drop-leaking-notes):\n`,
      );
      for (const l of leaks)
        process.stderr.write(
          `  - ${l.id} ${l.where}: "${l.value.printed}" is ${l.value.id} ${l.value.field}: ${l.text}\n`,
        );
      return 1;
    }
    const inputs = { anchors: files.map((f) => ({ file: f.file, sha256: f.sha256 })) };
    const out = path.resolve(values.out);
    mkdirSync(path.dirname(out), { recursive: true });
    const text = `${JSON.stringify({ ...list, inputs }, null, 2)}\n`;
    writeFileSync(out, text);
    const sha256 = createHash('sha256').update(text).digest('hex');
    process.stdout.write(
      `${list.rows} row(s) of ${list.review}${list.part ? ` (part ${list.part})` : ''}, no values, ${list.withheldNotes} note(s) withheld\n${sha256}  ${out}\n`,
    );
    return 0;
  } catch (error) {
    // Any failure to build is exit 2, never 1 (an uncaught exception would exit 1).
    const detail = error instanceof KeyInputError ? error.message : (error?.stack ?? String(error));
    process.stderr.write(`anchor-keys: ${detail}\n`);
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
