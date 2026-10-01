#!/usr/bin/env node
/**
 * Builds the stratum manifest that tests/audit/sample.mjs draws the seeded data audit from
 * (docs/qa/test-plan.md §7.2). Owner: qa-lead. Zero dependencies, Node >= 22.
 *
 * One stratum per data file, named by its path under data/ without ".json":
 *   parts/<category>, benchmarks/game, benchmarks/creator   items[].id
 *   prices/sa, prices/us   each observation as <partId>--<retailer>--<retrievedAt> (its capture's
 *                          own name) and each gap record as gap--<partId>
 *   games                  games[].id (titles in "considered" are not on the list, so not sampled)
 * Not strata: publishers.json, the source registry, and audits.json, data-lead's own audit records.
 * Neither holds values shown to visitors. Any other .json file is refused, so a new data file
 * cannot silently drop out of the audit.
 *
 * Usage:
 *   node tests/audit/strata.mjs --data-dir data --out strata.json
 *   node tests/audit/sample.mjs --seed rig-lab-audit:phase-0:<sha> --manifest strata.json --json sample.json
 * Exit codes: 0 manifest written · 2 bad input.
 */
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export class StrataError extends Error {}

const NOT_SAMPLED = new Set(['publishers', 'audits']);

/** Every .json file under `dir`, as forward-slash paths relative to it, sorted. */
function jsonFiles(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...jsonFiles(dir, rel));
    else if (entry.name.endsWith('.json')) out.push(rel);
  }
  return out.sort();
}

function idsOf(list, file) {
  return list.map((record, i) => {
    if (!record || typeof record.id !== 'string' || record.id === '') {
      throw new StrataError(`${file}: record ${String(i)} has no string "id"`);
    }
    return record.id;
  });
}

/** Keys for a price file: observations by their capture name, then gap records. */
function priceKeys(raw, file) {
  if (!Array.isArray(raw.observations) || !Array.isArray(raw.gaps)) {
    throw new StrataError(`${file}: a price file needs "observations" and "gaps" lists`);
  }
  const prices = raw.observations.map((row, i) => {
    for (const field of ['partId', 'retailer', 'retrievedAt']) {
      if (typeof row?.[field] !== 'string' || row[field] === '') {
        throw new StrataError(`${file}: observation ${String(i)} has no string "${field}"`);
      }
    }
    return `${row.partId}--${row.retailer}--${row.retrievedAt}`;
  });
  const gaps = raw.gaps.map((gap, i) => {
    if (typeof gap?.partId !== 'string' || gap.partId === '') {
      throw new StrataError(`${file}: gap ${String(i)} has no string "partId"`);
    }
    return `gap--${gap.partId}`;
  });
  return [...prices, ...gaps];
}

/** Strata from a Rig Lab data folder (the repository's data/). */
export function strataFromDataRoot(dataDir) {
  let isDir = false;
  try {
    isDir = statSync(dataDir).isDirectory();
  } catch {
    // reported below
  }
  if (!isDir) throw new StrataError(`not a folder: ${dataDir}`);
  const strata = {};
  for (const file of jsonFiles(dataDir)) {
    const name = file.replace(/\.json$/, '');
    if (NOT_SAMPLED.has(name)) continue;
    let raw;
    try {
      raw = JSON.parse(readFileSync(path.join(dataDir, file), 'utf8'));
    } catch (error) {
      throw new StrataError(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
    let keys;
    if (name.startsWith('prices/')) keys = priceKeys(raw, file);
    else if (name === 'games') keys = idsOf(Array.isArray(raw.games) ? raw.games : [], file);
    else if (name.startsWith('parts/') || name.startsWith('benchmarks/')) {
      if (!Array.isArray(raw.items)) throw new StrataError(`${file}: no "items" list`);
      keys = idsOf(raw.items, file);
    } else {
      throw new StrataError(`${file}: not a known data file, so it has no stratum rule`);
    }
    const dupes = keys.filter((key, i) => keys.indexOf(key) !== i);
    if (dupes.length) {
      throw new StrataError(`${file}: duplicate keys ${[...new Set(dupes)].join(', ')}`);
    }
    strata[name] = keys;
  }
  if (!Object.keys(strata).length) throw new StrataError(`no data files in ${dataDir}`);
  return strata;
}

export function main(argv = process.argv.slice(2)) {
  try {
    const { values } = parseArgs({
      args: argv,
      options: { 'data-dir': { type: 'string' }, out: { type: 'string' } },
      strict: true,
    });
    if (!values['data-dir']) throw new StrataError('--data-dir is required');
    const strata = strataFromDataRoot(values['data-dir']);
    if (values.out) {
      mkdirSync(path.dirname(path.resolve(values.out)), { recursive: true });
      writeFileSync(path.resolve(values.out), `${JSON.stringify({ strata }, null, 2)}\n`);
    }
    const total = Object.values(strata).reduce((sum, keys) => sum + keys.length, 0);
    const lines = Object.entries(strata).map(([name, keys]) => `  ${name}: ${String(keys.length)}`);
    process.stdout.write(
      `Audit strata · ${String(total)} records in ${String(lines.length)} strata\n${lines.join('\n')}\n`,
    );
    return 0;
  } catch (error) {
    process.stderr.write(
      `audit strata: ${error instanceof Error ? error.message : String(error)}\n`,
    );
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
