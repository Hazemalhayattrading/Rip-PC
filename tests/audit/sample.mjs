#!/usr/bin/env node
/**
 * Seeded, stratified, reproducible audit sample for the data-auditor (docs/qa/test-plan.md §7).
 * Owner: qa-lead. Zero dependencies, Node >= 22.
 *
 * Algorithm "sha256-rank-v1":
 *   rank(id) = lowercase hex SHA-256 of the UTF-8 string  seed + "\n" + stratum + "\n" + id
 *   Within each stratum, sort by rank ascending and take the first
 *   k = max(minPerStratum, ceil(fraction * population)) records (all of them if fewer exist).
 * Seed format: "rig-lab-audit:<phase>:<full 40-hex commit SHA of the integration branch being audited>".
 * Why: the commit is fixed before sampling, so the auditor cannot choose a convenient seed; anyone can
 * re-derive the sample; input order does not matter; adding records never changes an existing
 * record's rank.
 *
 * Usage:
 *   node tests/audit/sample.mjs --seed rig-lab-audit:phase-0:<sha> --manifest strata.json [--json out.json]
 *   node tests/audit/sample.mjs --seed rig-lab-audit:phase-0:<sha> --data-dir src/data/<dir> [--json out.json]
 * A manifest is { "strata": { "<stratum>": ["<id>", ...] } }. --data-dir reads every *.json file in the
 * folder: stratum = file name without .json; records = a top-level array, or the first array found
 * under "records", "items" or "data"; id = record.id. Defaults come from tests/perf/budget.json dataAudit.
 * Exit codes: 0 sample written · 2 bad input.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ALGORITHM = 'sha256-rank-v1';
export const SEED_RE = /^rig-lab-audit:[a-z0-9][a-z0-9-]*:[0-9a-f]{40}$/;

export class SampleError extends Error {}

export function auditDefaults(budgetFile = path.join(HERE, '..', 'perf', 'budget.json')) {
  const d = JSON.parse(readFileSync(budgetFile, 'utf8')).dataAudit;
  if (d.algorithm !== ALGORITHM)
    throw new SampleError(
      `budget.json dataAudit.algorithm is ${d.algorithm}, this tool implements ${ALGORITHM}`,
    );
  return { fraction: d.sampleFraction, minPerStratum: d.minPerStratum };
}

/** The rank of one record: hex SHA-256 of seed, stratum and id joined by newlines. */
export function rankOf(seed, stratum, id) {
  return createHash('sha256').update(`${seed}\n${stratum}\n${id}`, 'utf8').digest('hex');
}

/** SHA-256 over the sorted ids of a stratum, so a report can prove which population was sampled. */
export function populationFingerprint(ids) {
  return createHash('sha256')
    .update([...ids].sort().join('\n'), 'utf8')
    .digest('hex');
}

/**
 * @param {{ seed: string, strata: Record<string, string[]>, fraction: number, minPerStratum: number, allowAnySeed?: boolean }} input
 */
export function drawSample({ seed, strata, fraction, minPerStratum, allowAnySeed = false }) {
  if (!allowAnySeed && !SEED_RE.test(seed)) {
    throw new SampleError(
      `seed "${seed}" does not match rig-lab-audit:<phase>:<40-hex commit sha>`,
    );
  }
  if (!(fraction > 0 && fraction <= 1))
    throw new SampleError(`fraction must be in (0, 1], got ${fraction}`);
  if (!Number.isInteger(minPerStratum) || minPerStratum < 0)
    throw new SampleError(`minPerStratum must be a non-negative integer`);
  const out = {};
  let totalPopulation = 0;
  let totalSample = 0;
  for (const stratum of Object.keys(strata).sort()) {
    const ids = strata[stratum];
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || id === '')) {
      throw new SampleError(`stratum "${stratum}" must be a list of non-empty string ids`);
    }
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length)
      throw new SampleError(
        `stratum "${stratum}" has duplicate ids: ${[...new Set(dupes)].join(', ')}`,
      );
    const ranked = ids
      .map((id) => ({ id, rank: rankOf(seed, stratum, id) }))
      .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : a.id < b.id ? -1 : 1));
    const k = Math.min(ids.length, Math.max(minPerStratum, Math.ceil(fraction * ids.length)));
    out[stratum] = {
      population: ids.length,
      sampleSize: k,
      fingerprint: populationFingerprint(ids),
      sample: ranked.slice(0, k),
    };
    totalPopulation += ids.length;
    totalSample += k;
  }
  return {
    algorithm: ALGORITHM,
    seed,
    fraction,
    minPerStratum,
    totalPopulation,
    totalSample,
    strata: out,
  };
}

/** Build strata from a folder of JSON data files (one category per file). */
export function strataFromDataDir(dir) {
  const strata = {};
  for (const name of readdirSync(dir)
    .filter((n) => n.endsWith('.json'))
    .sort()) {
    const raw = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
    const list = Array.isArray(raw)
      ? raw
      : [raw?.records, raw?.items, raw?.data].find(Array.isArray);
    if (!list) throw new SampleError(`${name}: no top-level array and no records/items/data array`);
    const ids = list.map((r, i) => {
      if (!r || typeof r.id !== 'string')
        throw new SampleError(`${name}: record ${i} has no string "id"`);
      return r.id;
    });
    strata[name.replace(/\.json$/, '')] = ids;
  }
  if (!Object.keys(strata).length) throw new SampleError(`no *.json data files in ${dir}`);
  return strata;
}

export function formatSample(result) {
  const lines = [
    `Audit sample ${result.algorithm} · seed ${result.seed}`,
    `fraction ${result.fraction}, at least ${result.minPerStratum} per stratum · ${result.totalSample} of ${result.totalPopulation} records`,
  ];
  for (const [stratum, s] of Object.entries(result.strata)) {
    lines.push(
      `  ${stratum}: ${s.sampleSize} of ${s.population} (population sha256 ${s.fingerprint.slice(0, 12)}…)`,
    );
    for (const r of s.sample) lines.push(`    - ${r.id}  (rank ${r.rank.slice(0, 12)}…)`);
  }
  return lines.join('\n');
}

export function main(argv = process.argv.slice(2)) {
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        seed: { type: 'string' },
        manifest: { type: 'string' },
        'data-dir': { type: 'string' },
        fraction: { type: 'string' },
        min: { type: 'string' },
        json: { type: 'string' },
      },
      strict: true,
    });
    if (!values.seed) throw new SampleError('--seed is required');
    if (Boolean(values.manifest) === Boolean(values['data-dir']))
      throw new SampleError('give exactly one of --manifest or --data-dir');
    const defaults = auditDefaults();
    const strata = values.manifest
      ? JSON.parse(readFileSync(values.manifest, 'utf8')).strata
      : strataFromDataDir(values['data-dir']);
    if (!strata || typeof strata !== 'object')
      throw new SampleError('manifest must look like { "strata": { "<stratum>": ["<id>", ...] } }');
    const result = drawSample({
      seed: values.seed,
      strata,
      fraction: values.fraction ? Number(values.fraction) : defaults.fraction,
      minPerStratum: values.min ? Number(values.min) : defaults.minPerStratum,
    });
    if (values.json) {
      mkdirSync(path.dirname(path.resolve(values.json)), { recursive: true });
      writeFileSync(path.resolve(values.json), `${JSON.stringify(result, null, 2)}\n`);
    }
    process.stdout.write(`${formatSample(result)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`audit sample: ${error.message}\n`);
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
