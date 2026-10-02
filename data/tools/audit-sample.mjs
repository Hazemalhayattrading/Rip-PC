// Seeded 20% audit sample for one data batch (README, "Review"). Node port of audit_sample.py, for
// this PC, which has no Python. The generator differs, so a sample drawn here records this rule.
//
// Usage: node data/tools/audit-sample.mjs <population.json> <seed> <out.json>
//   population.json: { "batches": { "<batch name>": ["<item>", ...], ... } }, the batch's new or changed
//   items per audit batch (data/audits.json names: spec:<category>, price-observations:<sa|us>,
//   price-gaps:<sa|us>, benchmark:game, benchmark:creator, games, compat-fixtures).
// Draws ceil(20%) of every batch with one mulberry32(seed) generator, in the file's key order: sort the
// items ascending, run a partial Fisher-Yates shuffle for the sample size, then sort the drawn items.
// Refuses to overwrite <out.json>, which is audit evidence.
import fs from 'node:fs';
import path from 'node:path';

export const RULE =
  'One mulberry32(seed) generator for the whole draw. For each batch, in the order listed: sort the items ascending, partial Fisher-Yates shuffle (for i from 0 to size-1, swap item i with item i + floor(rng() * (n - i))), take the first ceil(20% of n), then sort them. Script: data/tools/audit-sample.mjs.';

/** mulberry32: a small seeded generator with uniform output in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws ceil(20%) of every batch, in key order, with one generator. */
export function drawSample(batches, seed) {
  const rng = mulberry32(seed);
  const out = {};
  for (const [name, items] of Object.entries(batches)) {
    const ids = [...new Set(items)].sort();
    const size = Math.ceil(ids.length / 5);
    for (let i = 0; i < size; i++) {
      const j = i + Math.floor(rng() * (ids.length - i));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    out[name] = { population: new Set(items).size, size, ids: ids.slice(0, size).sort() };
  }
  return out;
}

if (path.basename(process.argv[1] ?? '') === 'audit-sample.mjs') {
  const [populationFile, seedText, outFile] = process.argv.slice(2);
  if (!populationFile || !/^\d+$/.test(seedText ?? '') || !outFile) {
    console.error('usage: node data/tools/audit-sample.mjs <population.json> <seed> <out.json>');
    process.exit(2);
  }
  if (fs.existsSync(outFile)) {
    console.error(`${outFile} exists and is audit evidence; move it aside before drawing again`);
    process.exit(1);
  }
  const { batches } = JSON.parse(fs.readFileSync(populationFile, 'utf8'));
  const seed = Number(seedText);
  const sample = { seed, rule: RULE, population: populationFile, batches: drawSample(batches, seed) };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(sample, null, 2) + '\n');
  for (const [name, b] of Object.entries(sample.batches)) {
    console.log(`${name.padEnd(28)} ${String(b.size).padStart(3)}/${String(b.population).padEnd(4)} ${b.ids.join(', ')}`);
  }
}
