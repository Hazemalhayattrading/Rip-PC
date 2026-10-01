// Capture names for the price runners (prices_run.py, prices_newegg.py). Every attempt gets its own
// file, so a later attempt never overwrites an earlier one, including a capture rejected in review.
//
//   product page: artifacts/prices/<market>/<partId>--<retailer>--<date>[--<n>]
//   search page:  artifacts/prices/search/<market>/<partId>--<retailer>-search--<date>[--<n>]
//
// The first attempt of a day has no suffix; later ones get --2, --3 and so on. A runner saves
// <base>.html (and .png, .txt) under the base printed here.
//
// CLI: node data/tools/capture-name.mjs <product|search> <US|SA> <partId> <retailer> <YYYY-MM-DD>
// prints the first free base path (no extension), relative to the repo root.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXTENSIONS = ['.html', '.png', '.txt'];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The name of a capture attempt before any attempt suffix, relative to the repo root. */
export function captureStem(kind, market, partId, retailer, date) {
  if (kind !== 'product' && kind !== 'search') throw new Error(`kind must be product or search, not "${kind}"`);
  if (market !== 'US' && market !== 'SA') throw new Error(`market must be US or SA, not "${market}"`);
  if (!ID.test(partId) || !ID.test(retailer)) throw new Error('partId and retailer must be kebab-case IDs');
  if (!DATE.test(date)) throw new Error(`date must be YYYY-MM-DD, not "${date}"`);
  return kind === 'product'
    ? `artifacts/prices/${market}/${partId}--${retailer}--${date}`
    : `artifacts/prices/search/${market}/${partId}--${retailer}-search--${date}`;
}

/** The first of `stem`, `stem--2`, `stem--3`, ... that no saved file uses yet. */
export function freeCaptureBase(stem, exists = (p) => fs.existsSync(path.join(ROOT, p))) {
  for (let n = 1; ; n += 1) {
    const base = n === 1 ? stem : `${stem}--${n}`;
    if (!EXTENSIONS.some((ext) => exists(base + ext))) return base;
  }
}

if (path.basename(process.argv[1] ?? '') === 'capture-name.mjs') {
  try {
    const [kind, market, partId, retailer, date] = process.argv.slice(2);
    console.log(freeCaptureBase(captureStem(kind, market, partId, retailer, date)));
  } catch (e) {
    console.error(`capture-name: ${e.message}`);
    console.error('usage: node data/tools/capture-name.mjs <product|search> <US|SA> <partId> <retailer> <YYYY-MM-DD>');
    process.exit(2);
  }
}
