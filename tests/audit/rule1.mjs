#!/usr/bin/env node
/**
 * Owner's rule 1 compliance check of every price and benchmark row (docs/qa/test-plan.md §7.5).
 * Owner: qa-lead. Zero dependencies, Node >= 22. It reads data-lead's raw JSON on its own and never
 * imports src/data/schema, so a bug there cannot hide a bug here. 100% of rows, not a sample.
 *
 * Usage:
 *   node tests/audit/rule1.mjs --data-dir <dir> --evidence-root <dir> [--manifest <sha256 file>]
 *        [--today YYYY-MM-DD] [--json <out.json>]
 *   --data-dir       holds prices/*.json, benchmarks/game.json, benchmarks/creator.json, parts/*.json
 *                    and publishers.json.
 *   --evidence-root  the folder that contains artifacts/: the captures named by each price row's
 *                    `capture`, and the runner logs artifacts/prices/results-*.jsonl.
 *   --manifest       sha256sum output ("<hash>  <path>"); every capture must be listed with its hash.
 *   --today          the audit date (default: today's UTC date).
 *   --json           writes every check's totals, each failure, the warnings and manual-check lists.
 *
 * Checks (a price row is <market>:<partId>--<retailer>--<retrievedAt>, a gap <market>:gap:<partId>,
 * a coverage cell <market>:coverage:<partId>, a benchmark row its id):
 *   R1-P1  price url: https; host on the retailer's registered domains; the publisher is a retailer
 *          selling in the row's market; not an archive, cache, search engine, price tracker,
 *          aggregator or forum (DENIED_HOSTS); a product page, not a search or listing page.
 *   R1-P2  the raw price row has no archiveUrl, no sources, no other archive-like key.
 *   R1-P3  capture = artifacts/prices/<market>/<partId>--<retailer>--<retrievedAt>[--<n>].<html|png>
 *          (n >= 2 for a later attempt that day); the file exists; its SHA-256 = captureSha256 = the
 *          manifest entry (a path missing from it fails).
 *   R1-P3b HTML captures: the url's product id (ASIN, Newegg item, else last path segment) appears in
 *          the page and its canonical link. Not found is a manual check, never a failure.
 *   R1-P4  retrievedAt: a real date, not after --today, inside the file's batch window, equal to the
 *          UTC date of the capture's modification time, of the load time the saved page records
 *          about itself (pageLoadTimestampUTC, on Amazon pages), and of the matching runner-log
 *          line's product-page fetch (never the search time). Each evidence source: match /
 *          mismatch / none; a mismatch fails.
 *   R1-P5  currency matches market (SA SAR, US USD) and the file's market and currency.
 *   R1-P6a an aid for the 10% sample (R1-P6): the amount appears in the HTML in some display form.
 *          Not found, and every screenshot, is a manual check. A row whose amount equals the search
 *          snippet's price but is not on the product page is listed as a suspect.
 *   R1-P7  partId is a purchasable part (not a gpu-chip); key unique in the market; amount > 0.
 *   R1-G1  gap reasonCode and reason present.     R1-G2  retailersTried: retailers in that market.
 *   R1-G3  checkedAt valid, in window, not future.  R1-G4  no part has a price and a gap in a market.
 *   R1-G5  gap partId is a purchasable part.       R1-C1  every purchasable part has a price or gap.
 *   R1-B1  every benchmark source url: https, on its publisher's domains, never an archive, cache,
 *          search snippet, forum or aggregator.
 *   R1-B2  every source publisher is a registry reviewer or benchmark-database.
 *   R1-B3  publishedAt present, a real date, not after any source retrievedAt or --today.
 *   R1-B4  archiveUrl = https://web.archive.org/web/<14 digits>/<url exactly> (equal only after
 *          normalising scheme, www. or a trailing slash is a warning); publishedAt <= snapshot
 *          <= that source's retrievedAt.
 *   R1-B5  test conditions present (game: resolution, preset, rayTracing, upscaling, frameGeneration
 *          "off", CPU, GPU chip and card, driver, game version; creator: app, version, test, device,
 *          backend, testSystem or aggregate). A null passes only with a note on it or a parent.
 *   R1-B6  no source retrievedAt after --today.
 * Exit codes: 0 every check passes · 1 any check fails · 2 bad input. Warnings and manual checks
 * never change the exit code.
 */
import { createHash } from 'node:crypto';
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

export const VERSION = 'rule1-v1';
/** The only currency each market is priced in (plan §4.6). */
export const MARKET_CURRENCY = Object.freeze({ SA: 'SAR', US: 'USD' });
/**
 * Part categories that are never sold as such, so never priced and not in coverage. A GPU chip is
 * the performance identity; the retail SKU is the GPU card (plan §4.2, the validator's
 * PRICED_CATEGORIES).
 */
export const UNPRICED_CATEGORIES = Object.freeze(['gpu-chip']);

export const CHECKS = Object.freeze([
  {
    id: 'R1-P1',
    title: "price url: https product page on the retailer's domain, never an archive or tracker",
  },
  { id: 'R1-P2', title: 'price row has no archiveUrl and no sources' },
  { id: 'R1-P3', title: 'capture named from the row, present, SHA-256 = captureSha256 = manifest' },
  { id: 'R1-P3b', title: "HTML capture shows the url's product id (else manual check)" },
  { id: 'R1-P4', title: 'retrievedAt valid, in window, not future, = capture and log UTC dates' },
  { id: 'R1-P5', title: 'currency matches market, and the file market and currency' },
  { id: 'R1-P6a', title: 'amount appears in the HTML capture (aid for the 10% sample)' },
  { id: 'R1-P7', title: 'partId is a purchasable part, key unique in market, amount > 0' },
  { id: 'R1-G1', title: 'gap reasonCode and reason present' },
  { id: 'R1-G2', title: 'gap retailersTried: registry retailers that sell in the market' },
  { id: 'R1-G3', title: 'gap checkedAt valid, in window, not future' },
  { id: 'R1-G4', title: 'no part has both a price and a gap in one market' },
  { id: 'R1-G5', title: 'gap partId is a purchasable part' },
  { id: 'R1-C1', title: 'every purchasable part has a price or a gap in each market' },
  {
    id: 'R1-B1',
    title: "source url: https on the publisher's domain, not archive/forum/aggregator",
  },
  { id: 'R1-B2', title: 'source publisher is a reviewer or benchmark-database' },
  { id: 'R1-B3', title: 'publishedAt present, valid, not after source retrievedAt or today' },
  { id: 'R1-B4', title: 'archiveUrl form, original = url, publishedAt <= snapshot <= retrievedAt' },
  { id: 'R1-B5', title: 'test conditions present; a null needs a note on that field' },
  { id: 'R1-B6', title: 'source retrievedAt not after today' },
]);

export class Rule1InputError extends Error {}

// ---------------------------------------------------------------------------------------------
// Dates

/** True for a real calendar date written YYYY-MM-DD. */
export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// ---------------------------------------------------------------------------------------------
// Hosts and URLs

/**
 * Never a price source, never a benchmark `url`. `name.*` matches that name under any TLD
 * (google.com, google.com.sa); other entries match the host or any subdomain of it.
 */
export const DENIED_HOSTS = Object.freeze([
  ['web.archive.org', 'a web archive'],
  ['archive.org', 'a web archive'],
  ['archive.today', 'a web archive'],
  ['archive.ph', 'a web archive'],
  ['archive.is', 'a web archive'],
  ['archive.li', 'a web archive'],
  ['archive.vn', 'a web archive'],
  ['archive.md', 'a web archive'],
  ['archive.fo', 'a web archive'],
  ['ghostarchive.org', 'a web archive'],
  ['timetravel.mementoweb.org', 'a web archive'],
  ['webcache.googleusercontent.com', 'a search-engine cache'],
  ['cachedview.nl', 'a cache viewer'],
  ['cachedview.com', 'a cache viewer'],
  ['google.*', 'a search engine'],
  ['bing.com', 'a search engine'],
  ['duckduckgo.com', 'a search engine'],
  ['yahoo.com', 'a search engine'],
  ['yandex.*', 'a search engine'],
  ['baidu.com', 'a search engine'],
  ['ecosia.org', 'a search engine'],
  ['startpage.com', 'a search engine'],
  ['search.brave.com', 'a search engine'],
  ['camelcamelcamel.com', 'a price tracker'],
  ['keepa.com', 'a price tracker'],
  ['pricespy.*', 'a price comparison site'],
  ['pricerunner.*', 'a price comparison site'],
  ['idealo.*', 'a price comparison site'],
  ['geizhals.*', 'a price comparison site'],
  ['pricegrabber.com', 'a price comparison site'],
  ['shopsavvy.com', 'a price comparison site'],
  ['pricena.com', 'a price comparison site'],
  ['yaoota.com', 'a price comparison site'],
  ['pcpartpicker.com', 'an aggregator'],
  ['slickdeals.net', 'a deals aggregator'],
  ['userbenchmark.com', 'a benchmark aggregator'],
  ['technical.city', 'a benchmark aggregator'],
  ['nanoreview.net', 'a benchmark aggregator'],
  ['versus.com', 'a benchmark aggregator'],
  ['cpu-monkey.com', 'a benchmark aggregator'],
  ['gpucheck.com', 'a benchmark aggregator'],
  ['reddit.com', 'a forum'],
  ['redd.it', 'a forum'],
  ['linustechtips.com', 'a forum'],
  ['overclock.net', 'a forum'],
  ['hardforum.com', 'a forum'],
  ['quora.com', 'a forum'],
]);
/** A host whose first label is one of these is a forum or community site. */
export const FORUM_HOST_LABELS = Object.freeze([
  'forum',
  'forums',
  'community',
  'discourse',
  'discuss',
]);
/** A benchmark source whose path has one of these segments is a forum post, not a review. */
export const FORUM_PATH_SEGMENTS = Object.freeze([
  'forum',
  'forums',
  'community',
  'threads',
  'thread',
  'discussion',
  'discussions',
  'comments',
  'showthread.php',
  'viewtopic.php',
]);

/** True when `host` is `domain` or a subdomain of it. */
export function hostMatches(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

function hasLabelUnderAnyTld(host, name) {
  const labels = host.split('.');
  return labels.some((l, i) => l === name && i < labels.length - 1 && labels.length - 1 - i <= 2);
}

/** Why `host` can never be a source (archive, cache, search engine, tracker...), or null. */
export function deniedHost(host) {
  if (typeof host !== 'string' || host === '') return null;
  const h = host.toLowerCase().replace(/\.$/, '');
  for (const [pattern, what] of DENIED_HOSTS) {
    const hit = pattern.endsWith('.*')
      ? hasLabelUnderAnyTld(h, pattern.slice(0, -2))
      : hostMatches(h, pattern);
    if (hit) return `${what} (${pattern})`;
  }
  const first = h.split('.')[0];
  if (FORUM_HOST_LABELS.includes(first)) return `a forum or community site (${first}.*)`;
  return null;
}

function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * Why `url` is a search, listing or browse page rather than a product page, or null.
 * Flags `/s?`, `/s/`, `/search`, `?k=`, `?q=` (also `field-keywords`, `query`, `search`,
 * `searchterm`), `/p/pl`, `/sch/`, `/browse`, `/category`, Amazon's `/b` browse nodes, best-seller
 * lists and offer listings, and the site root. Not `?keywords=`: Amazon adds it to product links
 * opened from a search result (`/dp/<ASIN>/ref=sr_1_1?keywords=...`).
 */
export function listingPattern(url) {
  const u = parseUrl(url);
  if (!u) return null;
  const p = u.pathname.toLowerCase();
  const segs = p.split('/').filter(Boolean);
  if (segs.length === 0) return 'the site root';
  if (segs.at(-1) === 's') return 'a search page (/s?)';
  if (segs.slice(0, -1).includes('s')) return 'a search page (/s/)';
  if (segs.some((s) => /^search(?:$|[._-]|results)/.test(s))) return 'a search page (/search)';
  const keyword = /[?&](k|q|field-keywords|query|search|searchterm)=/.exec(u.search.toLowerCase());
  if (keyword) return `a search page (?${keyword[1]}=)`;
  if (/(?:^|\/)p\/pl(?:\/|$)/.test(p)) return 'a listing page (/p/pl)';
  if (segs.includes('sch')) return 'a search page (/sch/)';
  if (segs.some((s) => /^browse(?:$|[._-])/.test(s))) return 'a browse page (/browse)';
  if (segs.some((s) => /^categor(?:y|ies)(?:$|[._-])/.test(s)))
    return 'a category page (/category)';
  if (segs.includes('b')) return 'a browse node (/b)';
  if (segs.includes('zgbs') || p.includes('/gp/bestsellers')) return 'a best-seller list';
  if (p.includes('/gp/offer-listing')) return 'an offer listing (/gp/offer-listing)';
  return null;
}

/** Why a benchmark `url` is a forum or community post, or null. */
export function forumPath(url) {
  const u = parseUrl(url);
  if (!u) return null;
  const hit = u.pathname
    .toLowerCase()
    .split('/')
    .find((s) => FORUM_PATH_SEGMENTS.includes(s));
  return hit ? `a forum or community path (/${hit}/)` : null;
}

const GENERIC_SEGMENTS = new Set([
  '-',
  'p',
  'dp',
  'gp',
  'product',
  'products',
  'item',
  'items',
  'en',
  'ar',
  'en-us',
  'en-sa',
  'ar-sa',
  'index',
]);

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** The product identifier in a URL: Amazon ASIN, Newegg item number, else the last meaningful segment. */
export function productIdFromUrl(url) {
  const u = parseUrl(url);
  if (!u) return null;
  const asin =
    /\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/asin|o\/asin)\/([A-Z0-9]{10})(?=[/?#]|$)/i.exec(
      u.pathname,
    );
  if (asin) return asin[1].toUpperCase();
  // A search or listing page names no single product ("s" in /s?k= is not an id).
  if (listingPattern(url)) return null;
  if (hostMatches(u.hostname.toLowerCase(), 'newegg.com')) {
    const item = u.searchParams.get('Item') ?? u.searchParams.get('item');
    if (item) return item;
    const p = /\/p\/([A-Za-z0-9-]+)\/?$/.exec(u.pathname);
    if (p) return p[1];
  }
  const segs = u.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => safeDecode(s).replace(/\.(?:html?|aspx?|php)$/i, ''));
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    if (s.length >= 4 && !GENERIC_SEGMENTS.has(s.toLowerCase())) return s;
  }
  return null;
}

function normaliseLight(url) {
  const u = parseUrl(url);
  if (!u) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const port = u.port ? `:${u.port}` : '';
  return `${host}${port}${u.pathname.replace(/\/+$/, '')}${u.search}${u.hash}`;
}

/** True when two URLs differ at most in the scheme, a leading `www.` and a trailing slash. */
export function equalAfterNormalising(a, b) {
  const x = normaliseLight(a);
  return x !== null && x === normaliseLight(b);
}

/**
 * Parses `https://web.archive.org/web/<YYYYMMDDhhmmss>/<original>`, the only form test plan §7.5
 * allows. Anything else (a short timestamp, a flag such as `im_`, another archive) is `{ ok: false }`.
 */
export function parseWayback(archiveUrl) {
  if (typeof archiveUrl !== 'string') return { ok: false, why: 'archiveUrl is not a string' };
  const m = /^https:\/\/web\.archive\.org\/web\/(\d+)([a-z]{2}_)?\/(.+)$/.exec(archiveUrl);
  if (!m) {
    return { ok: false, why: 'not of the form https://web.archive.org/web/<14 digits>/<original>' };
  }
  const [, ts, flag, original] = m;
  if (ts.length !== 14)
    return { ok: false, why: `timestamp ${ts} has ${ts.length} digits, not 14` };
  if (flag) {
    return {
      ok: false,
      why: `has the Wayback flag "${flag}"; the plan's form is /web/<14 digits>/<original>`,
    };
  }
  const date = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
  if (!isIsoDate(date)) return { ok: false, why: `timestamp ${ts} is not a real date` };
  const [hh, mm, ss] = [ts.slice(8, 10), ts.slice(10, 12), ts.slice(12, 14)].map(Number);
  if (hh > 23 || mm > 59 || ss > 59) {
    return { ok: false, why: `timestamp ${ts} has an invalid time of day` };
  }
  return { ok: true, timestamp: ts, date, original };
}

// ---------------------------------------------------------------------------------------------
// Amounts

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CURRENCY_MARK = '(?:SAR|USD|US\\$|\\$|ر\\.س\\.?)';
const GAP = '(?:\\s|&nbsp;|&#160;|&#xa0;)*';
const NOT_A_LONGER_NUMBER = '(?!\\d|[.,]\\d)';

/** The display forms of an amount: 2248.58 → "2,248.58", "2248.58"; 596 → also "596" next to a currency. */
export function amountForms(amount) {
  const [int, frac] = amount.toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimals = [...new Set([`${grouped}.${frac}`, `${int}.${frac}`])];
  const plain = String(amount);
  if (plain.includes('.') && !decimals.includes(plain)) decimals.push(plain);
  return { decimals, wholes: frac === '00' ? [...new Set([grouped, int])] : [] };
}

function amountRegexes(amount) {
  const { decimals, wholes } = amountForms(amount);
  const out = decimals.map((f) => ({
    form: f,
    re: new RegExp(`(?<![\\d.,])${escapeRe(f)}${NOT_A_LONGER_NUMBER}`, 'g'),
  }));
  for (const w of wholes) {
    out.push({
      form: `${w} with a currency`,
      re: new RegExp(`${CURRENCY_MARK}${GAP}${escapeRe(w)}${NOT_A_LONGER_NUMBER}`, 'gi'),
    });
    out.push({
      form: `${w} with a currency after it`,
      re: new RegExp(`(?<![\\d.,])${escapeRe(w)}${GAP}(?:SAR|USD|ر\\.س)`, 'gi'),
    });
  }
  return out;
}

/** Text a reader sees: tags removed, so `<b>2,248</b>.<i>58</i>` reads 2,248.58. */
export function visibleText(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;|&#xa0;/gi, '\u00a0');
}

/**
 * Where an amount appears in a saved page, in any display form: with or without a currency code
 * or symbol, a no-break space, thousands separators, or split across tags.
 */
export function findAmount(html, amount, text = visibleText(html)) {
  const hits = [];
  for (const { form, re } of amountRegexes(amount)) {
    for (const [scope, s] of [
      ['html', html],
      ['text', text],
    ]) {
      const count = [...s.matchAll(re)].length;
      if (count) hits.push({ form, scope, count });
    }
  }
  return { found: hits.length > 0, hits };
}

/** The number in a displayed price such as "SAR 2,248.58" or "$484.00", or null. */
export function parseDisplayedPrice(text) {
  if (typeof text !== 'string') return null;
  const m = /(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?/.exec(text.replace(/[\s\u00a0]/g, ''));
  if (!m) return null;
  const n = Number(`${m[1].replaceAll(',', '')}${m[2] ? `.${m[2]}` : ''}`);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------------------------
// Evidence files

/** Parses sha256sum output ("<hash>  <path>" or "<hash> *<path>") into path → lower-case hash. */
export function parseManifest(text) {
  const entries = new Map();
  String(text)
    .split(/\r?\n/)
    .forEach((line, i) => {
      if (line.trim() === '' || line.startsWith('#')) return;
      const m = /^([0-9a-fA-F]{64}) [ *](.+)$/.exec(line);
      if (!m) {
        throw new Rule1InputError(
          `manifest line ${i + 1} is not "<sha256>  <path>": ${line.slice(0, 80)}`,
        );
      }
      const file = m[2].replace(/^\.\//, '').replaceAll('\\', '/');
      const hash = m[1].toLowerCase();
      if (entries.has(file) && entries.get(file) !== hash) {
        throw new Rule1InputError(`manifest lists ${file} twice with different hashes`);
      }
      entries.set(file, hash);
    });
  return entries;
}

const SAFE_REL_RE = /^artifacts\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/;

/** Reads one capture under the evidence root: existence, SHA-256, UTC modification time, HTML text. */
export function inspectCapture(evidenceRoot, rel) {
  if (
    typeof rel !== 'string' ||
    !SAFE_REL_RE.test(rel) ||
    rel.split('/').some((s) => s === '..' || s === '.')
  ) {
    return { rel, exists: false, unsafe: true };
  }
  const abs = path.join(evidenceRoot, ...rel.split('/'));
  let st;
  try {
    st = statSync(abs);
  } catch {
    return { rel, exists: false };
  }
  if (!st.isFile()) return { rel, exists: false };
  const buf = readFileSync(abs);
  const mtimeIso = st.mtime.toISOString();
  return {
    rel,
    exists: true,
    bytes: buf.length,
    sha256: createHash('sha256').update(buf).digest('hex'),
    mtimeIso,
    mtimeUtcDate: mtimeIso.slice(0, 10),
    mtimeMs: st.mtimeMs,
    html: /\.html?$/i.test(rel) ? buf.toString('utf8') : null,
  };
}

// ---------------------------------------------------------------------------------------------
// Inputs

const sha256Of = (buf) => createHash('sha256').update(buf).digest('hex');

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function readJsonFile(abs, label) {
  let buf;
  try {
    buf = readFileSync(abs);
  } catch (error) {
    throw new Rule1InputError(`cannot read ${label}: ${error.code ?? error.message}`);
  }
  try {
    return {
      value: JSON.parse(buf.toString('utf8').replace(/^\uFEFF/, '')),
      sha256: sha256Of(buf),
    };
  } catch (error) {
    throw new Rule1InputError(`${label} is not valid JSON: ${error.message}`);
  }
}

function jsonNames(dir, label) {
  if (!isDir(dir)) throw new Rule1InputError(`${label}/ is missing`);
  const names = readdirSync(dir)
    .filter((n) => n.endsWith('.json'))
    .sort();
  if (names.length === 0) throw new Rule1InputError(`${label}/ has no *.json files`);
  return names;
}

/** Reads data-lead's raw JSON: publishers, parts, price files and benchmark files. */
export function loadData(dataDir) {
  if (!isDir(dataDir)) throw new Rule1InputError(`--data-dir ${dataDir} is not a folder`);
  const files = [];
  const read = (rel) => {
    const r = readJsonFile(path.join(dataDir, ...rel.split('/')), rel);
    files.push({ file: rel, sha256: r.sha256 });
    return r.value;
  };
  const registry = read('publishers.json');
  if (!registry || !Array.isArray(registry.publishers)) {
    throw new Rule1InputError('publishers.json has no "publishers" array');
  }
  const publishers = new Map();
  for (const p of registry.publishers) if (p && typeof p.id === 'string') publishers.set(p.id, p);

  const parts = new Map();
  const duplicateParts = [];
  for (const name of jsonNames(path.join(dataDir, 'parts'), 'parts')) {
    const raw = read(`parts/${name}`);
    const list = Array.isArray(raw)
      ? raw
      : [raw?.items, raw?.records, raw?.data].find(Array.isArray);
    if (!list) throw new Rule1InputError(`parts/${name} has no items array`);
    for (const item of list) {
      if (!item || typeof item.id !== 'string') {
        throw new Rule1InputError(`parts/${name} has an item without a string "id"`);
      }
      const category = item.category ?? raw.category ?? name.replace(/\.json$/, '');
      if (parts.has(item.id)) duplicateParts.push(item.id);
      else parts.set(item.id, { category, file: `parts/${name}` });
    }
  }

  const priceFiles = jsonNames(path.join(dataDir, 'prices'), 'prices').map((name) => {
    const raw = read(`prices/${name}`);
    if (!raw || !Array.isArray(raw.observations) || !Array.isArray(raw.gaps)) {
      throw new Rule1InputError(`prices/${name} needs "observations" and "gaps" arrays`);
    }
    return { file: `prices/${name}`, raw };
  });

  const benchmarks = ['game', 'creator'].map((kind) => {
    const raw = read(`benchmarks/${kind}.json`);
    if (!raw || !Array.isArray(raw.items)) {
      throw new Rule1InputError(`benchmarks/${kind}.json has no "items" array`);
    }
    return { kind, file: `benchmarks/${kind}.json`, items: raw.items };
  });

  return { files, publishers, parts, duplicateParts, priceFiles, benchmarks };
}

/** Reads the runner logs (artifacts/prices/results-*.jsonl) and every capture the price rows name. */
export function loadEvidence(evidenceRoot, captureRels) {
  if (typeof evidenceRoot !== 'string' || !isDir(path.join(evidenceRoot, 'artifacts'))) {
    throw new Rule1InputError(`--evidence-root ${evidenceRoot} has no artifacts/ folder`);
  }
  const dir = path.join(evidenceRoot, 'artifacts', 'prices');
  const logs = [];
  const logProblems = [];
  const logFiles = [];
  const names = isDir(dir)
    ? readdirSync(dir)
        .filter((n) => /^results-.*\.jsonl$/.test(n))
        .sort()
    : [];
  for (const name of names) {
    const rel = `artifacts/prices/${name}`;
    const buf = readFileSync(path.join(dir, name));
    let lines = 0;
    buf
      .toString('utf8')
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (line.trim() === '') return;
        lines += 1;
        const ref = `${rel}:${i + 1}`;
        try {
          const entry = JSON.parse(line);
          if (entry && typeof entry === 'object' && !Array.isArray(entry))
            logs.push({ ref, entry });
          else logProblems.push({ ref, why: 'is not a JSON object' });
        } catch {
          logProblems.push({ ref, why: 'is not valid JSON' });
        }
      });
    logFiles.push({ file: rel, lines, sha256: sha256Of(buf) });
  }
  const captures = new Map();
  for (const rel of captureRels) {
    if (!captures.has(rel)) captures.set(rel, inspectCapture(evidenceRoot, rel));
  }
  return { logs, logProblems, logFiles, captures };
}

function loadManifest(manifestPath) {
  let buf;
  try {
    buf = readFileSync(manifestPath);
  } catch (error) {
    throw new Rule1InputError(
      `cannot read --manifest ${manifestPath}: ${error.code ?? error.message}`,
    );
  }
  const entries = parseManifest(buf.toString('utf8'));
  if (entries.size === 0) throw new Rule1InputError(`--manifest ${manifestPath} has no entries`);
  return { file: manifestPath, sha256: sha256Of(buf), entries };
}

// ---------------------------------------------------------------------------------------------
// Results

const problem = (field, value, why) => ({ field, value, why });
const jsonSafe = (v) => (v === undefined ? null : v);

class Recorder {
  constructor() {
    this.totals = new Map(
      CHECKS.map((c) => [
        c.id,
        { id: c.id, title: c.title, checked: 0, passed: 0, failed: 0, manual: 0 },
      ]),
    );
    this.failures = [];
    this.warnings = [];
    this.manual = [];
    this.suspects = [];
    this.evidence = [];
    this.amounts = [];
    this.nullRows = [];
  }

  /** One row checked by one check: it passes when there are no problems. */
  result(check, row, problems) {
    const t = this.totals.get(check);
    t.checked += 1;
    if (problems.length === 0) {
      t.passed += 1;
      return;
    }
    t.failed += 1;
    for (const p of problems) {
      this.failures.push({ check, row, field: p.field, value: jsonSafe(p.value), why: p.why });
    }
  }

  /** One row checked, neither passed nor failed: a person must look. */
  manualCheck(check, row, p) {
    const t = this.totals.get(check);
    t.checked += 1;
    t.manual += 1;
    this.manual.push({ check, row, field: p.field, value: jsonSafe(p.value), why: p.why });
  }

  warn(check, row, p) {
    this.warnings.push({ check, row, field: p.field, value: jsonSafe(p.value), why: p.why });
  }
}

// ---------------------------------------------------------------------------------------------
// Price checks (one row each). Every function returns a list of problems.

/** `<market>:<partId>--<retailer>--<retrievedAt>`, the capture file's own key. */
export function priceKey(row, fileMarket) {
  return `${row.market ?? fileMarket}:${row.partId}--${row.retailer}--${row.retrievedAt}`;
}

/** R1-P1: a live retailer product page on the retailer's registered domain. */
export function checkPriceUrl(row, publishers) {
  const out = [];
  const pub = publishers.get(row.retailer);
  if (!pub) {
    out.push(problem('retailer', row.retailer, 'not a publisher in publishers.json'));
  } else {
    if (pub.kind !== 'retailer') {
      out.push(problem('retailer', row.retailer, `registered as a ${pub.kind}, not a retailer`));
    }
    if (!Array.isArray(pub.markets) || !pub.markets.includes(row.market)) {
      out.push(
        problem(
          'retailer',
          row.retailer,
          `the retailer's markets ${JSON.stringify(pub.markets ?? [])} do not include ${row.market}`,
        ),
      );
    }
  }
  const u = typeof row.url === 'string' ? parseUrl(row.url) : null;
  if (!u) return [...out, problem('url', row.url, 'not a valid URL')];
  if (u.protocol !== 'https:') out.push(problem('url', row.url, `not https (${u.protocol})`));
  const host = u.hostname.toLowerCase();
  const domains = Array.isArray(pub?.domains)
    ? pub.domains.filter((d) => typeof d === 'string')
    : [];
  if (pub && !domains.some((d) => hostMatches(host, d.toLowerCase()))) {
    out.push(
      problem('url', row.url, `host ${host} is not on ${pub.id}'s domains (${domains.join(', ')})`),
    );
  }
  const denied = deniedHost(host);
  if (denied) out.push(problem('url', row.url, `host ${host} is ${denied}: never a price source`));
  const listing = listingPattern(row.url);
  if (listing) out.push(problem('url', row.url, `${listing}, not a product page`));
  return out;
}

const ARCHIVE_LIKE_KEY = /archive|wayback|snapshot|cache/i;

/** R1-P2: the raw row has no archiveUrl, no sources, and no other archive-like key. */
export function checkPriceRawKeys(row) {
  const out = [];
  for (const key of Object.keys(row)) {
    if (key === 'archiveUrl') {
      out.push(problem(key, row[key], "a price row never has an archiveUrl (Owner's rule 1)"));
    } else if (key === 'sources') {
      out.push(
        problem(key, row[key], 'a price row never has sources; its evidence is the capture'),
      );
    } else if (ARCHIVE_LIKE_KEY.test(key)) {
      out.push(problem(key, row[key], 'an archive-like key on a price row'));
    }
  }
  return out;
}

/** R1-P5: SA in SAR, US in USD, and the row agrees with its file. */
export function checkPriceCurrency(row, file) {
  const out = [];
  const want = MARKET_CURRENCY[row.market];
  if (!want) out.push(problem('market', row.market, 'not a known market (SA or US)'));
  else if (row.currency !== want) {
    out.push(problem('currency', row.currency, `${row.market} prices are in ${want}`));
  }
  if (row.market !== file.market) {
    out.push(problem('market', row.market, `the file's market is ${file.market}`));
  }
  if (row.currency !== file.currency) {
    out.push(problem('currency', row.currency, `the file's currency is ${file.currency}`));
  }
  return out;
}

/** The part behind a price or gap must exist and be sold as such (not a GPU chip). */
function partProblems(partId, parts) {
  const part = typeof partId === 'string' ? parts.get(partId) : undefined;
  if (!part) return [problem('partId', partId, 'not a part id in parts/*.json')];
  if (UNPRICED_CATEGORIES.includes(part.category)) {
    return [problem('partId', partId, `a ${part.category} id, not a purchasable part`)];
  }
  return [];
}

/** R1-P7 for one row; the duplicate-key test needs every row, so the caller adds it. */
export function checkPricePartAndAmount(row, parts) {
  const out = partProblems(row.partId, parts);
  if (!isPositiveAmount(row.amount))
    out.push(problem('amount', row.amount, 'not a positive number'));
  return out;
}

const isPositiveAmount = (a) => typeof a === 'number' && Number.isFinite(a) && a > 0;

/**
 * What may follow a capture's base name: a later attempt on the same day gets --2, --3 and so on,
 * so it never overwrites an earlier one (data-lead's data/tools/capture-name.mjs and price schema).
 */
const CAPTURE_TAIL = /^(?:--(?:[2-9]|[1-9]\d+))?\.(?:html|png)$/;

/** R1-P3: the capture is named from the row, exists, and its SHA-256 matches the row and manifest. */
export function checkCapture(row, capture, manifest) {
  const base = `artifacts/prices/${row.market}/${row.partId}--${row.retailer}--${row.retrievedAt}`;
  const expected = `${base}[--<n>].<html|png>`;
  if (typeof row.capture !== 'string' || row.capture === '') {
    return [problem('capture', row.capture, `no capture; expected ${expected}`)];
  }
  const out = [];
  if (!row.capture.startsWith(base) || !CAPTURE_TAIL.test(row.capture.slice(base.length))) {
    out.push(
      problem(
        'capture',
        row.capture,
        `expected ${expected}, built from the row's market, partId, retailer and retrievedAt`,
      ),
    );
  }
  if (!capture || capture.unsafe) {
    out.push(problem('capture', row.capture, 'not a relative path under artifacts/, so not read'));
    return out;
  }
  if (!capture.exists) {
    out.push(problem('capture', row.capture, 'file not found under --evidence-root'));
    return out;
  }
  if (row.captureSha256 !== capture.sha256) {
    out.push(
      problem('captureSha256', row.captureSha256, `the file's SHA-256 is ${capture.sha256}`),
    );
  }
  if (manifest) {
    const listed = manifest.entries.get(row.capture);
    if (listed === undefined) {
      out.push(problem('capture', row.capture, 'the path is missing from the manifest'));
    } else if (listed !== capture.sha256) {
      out.push(
        problem(
          'captureSha256',
          row.captureSha256,
          `the manifest lists ${listed}; the file's SHA-256 is ${capture.sha256}`,
        ),
      );
    }
  }
  return out;
}

function canonicalHref(html) {
  const tag = /<link\b[^>]*\brel=["']?canonical["']?[^>]*>/i.exec(html);
  const href = tag ? /\bhref=["']([^"']+)["']/i.exec(tag[0]) : null;
  return href ? href[1] : null;
}

/**
 * R1-P3b for an HTML capture: the page shows the url's product id (and its canonical link, when
 * it has one, names it). Returns null when not applicable (no file, or a screenshot).
 */
export function checkProductId(row, capture) {
  if (!capture?.exists || capture.html === null) return null;
  const id = productIdFromUrl(row.url);
  if (!id) {
    return {
      status: 'manual',
      value: row.url,
      why: 'no product id can be derived from the url; compare the capture with the url by eye',
    };
  }
  if (!capture.html.toLowerCase().includes(id.toLowerCase())) {
    return {
      status: 'manual',
      value: id,
      why: `the url's product id ${id} does not appear in the HTML capture`,
    };
  }
  const canonical = canonicalHref(capture.html);
  if (canonical && !canonical.toLowerCase().includes(id.toLowerCase())) {
    return {
      status: 'manual',
      value: id,
      why: `the capture's canonical link ${canonical} does not name ${id}`,
    };
  }
  return { status: 'found', value: id };
}

const ZONED_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

/** The UTC date of an ISO timestamp that carries a zone ("…Z" or "…+03:00"), else null. */
export function utcDateOfTimestamp(ts) {
  if (typeof ts !== 'string' || !ZONED_TIMESTAMP.test(ts)) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * The load time a saved page records about itself, or null. Amazon product pages carry
 * `<input type="hidden" name="pageLoadTimestampUTC" value="2026-09-30T20:37:03.651284903Z">`; it is
 * inside the hashed capture, so it cannot drift the way a file time can.
 */
export function pageTimestamp(html) {
  if (typeof html !== 'string') return null;
  const tag = /<input\b[^>]*\bname=["']pageLoadTimestampUTC["'][^>]*>/i.exec(html);
  const value = tag ? /\bvalue=["']([^"']+)["']/i.exec(tag[0]) : null;
  return value && utcDateOfTimestamp(value[1]) ? value[1] : null;
}

function looseUrl(url) {
  const u = parseUrl(url);
  if (!u) return null;
  return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`;
}

/**
 * The runner-log line for a price row: same partId, market and retailer, and the row's url as the
 * product page (productUrl, product.url or product.finalUrl; exact first, then ignoring the scheme,
 * www., a trailing slash and the query). Among several, it prefers lines that wrote the row's capture,
 * then the product fetch closest to the capture's modification time. Null when nothing matches.
 */
export function matchRunnerLog(row, logs, capture) {
  const same = logs.filter(
    ({ entry: e }) =>
      e.partId === row.partId &&
      e.market === row.market &&
      e.retailer === row.retailer &&
      e.product &&
      typeof e.product === 'object',
  );
  const urlsOf = (e) =>
    [e.productUrl, e.product.url, e.product.finalUrl].filter((u) => typeof u === 'string');
  let matches = same.filter(({ entry }) => urlsOf(entry).includes(row.url));
  let normalisedUrl = false;
  if (matches.length === 0) {
    const want = looseUrl(row.url);
    matches = want
      ? same.filter(({ entry }) => urlsOf(entry).some((u) => looseUrl(u) === want))
      : [];
    normalisedUrl = matches.length > 0;
  }
  if (matches.length === 0) return null;
  const sameCapture = matches.filter(({ entry }) => entry.capture === row.capture);
  const pool = (sameCapture.length ? sameCapture : matches).map((m) => ({
    ...m,
    date: utcDateOfTimestamp(m.entry.product.fetchedAtUtc),
    ms: Date.parse(m.entry.product.fetchedAtUtc),
  }));
  const timed = pool.filter((m) => m.date !== null);
  // The capture was written by one of these fetches: take the closest to its modification time.
  // With no capture file, take the latest fetch (a re-fetch overwrites the capture).
  const target = capture?.exists ? capture.mtimeMs : null;
  const better = (m, best) =>
    target === null ? m.ms > best.ms : Math.abs(m.ms - target) < Math.abs(best.ms - target);
  const pick = timed.length
    ? timed.reduce((best, m) => (better(m, best) ? m : best))
    : pool[pool.length - 1];
  return {
    ref: pick.ref,
    entry: pick.entry,
    fetchedAtUtc: pick.entry.product.fetchedAtUtc ?? null,
    fetchedDate: pick.date,
    matches: matches.length,
    normalisedUrl,
  };
}

/**
 * The batch window a price row or gap must fall in. A seed-format file (WP-D0) has one `batch` for
 * every row. From WP-D1 a file lists `batches`, and each row names its own `batch` id, so a part
 * added later is dated against its own window. Returns { label, windowStart, windowEnd } or { error }.
 */
export function batchWindow(row, file) {
  if (Array.isArray(file.batches)) {
    if (file.batch !== undefined)
      return { error: 'the file has both "batch" and "batches", so the window is ambiguous' };
    const id = row.batch;
    if (typeof id !== 'string' || id === '') return { error: 'the row names no batch' };
    const found = file.batches.filter((b) => b?.id === id);
    if (found.length !== 1)
      return {
        error: `the row names the batch "${id}", which the file lists ${found.length} times`,
      };
    return { label: `batch ${id}'s window`, ...pickWindow(found[0]) };
  }
  return { label: "the file's batch window", ...pickWindow(file.batch ?? {}) };
}

function pickWindow(b) {
  return { windowStart: b.windowStart, windowEnd: b.windowEnd };
}

/** Problems with a date against its batch window (R1-P4 and R1-G3). */
function windowProblems(field, at, row, file) {
  const w = batchWindow(row, file);
  if (w.error) return [problem(field, at, w.error)];
  const { windowStart: ws, windowEnd: we } = w;
  if (!isIsoDate(ws) || !isIsoDate(we) || ws > we)
    return [problem(field, at, `${w.label} ${ws}..${we} is not valid`)];
  if (at < ws || at > we)
    return [problem(field, at, `outside ${w.label.replace("the file's ", 'the ')} ${ws}..${we}`)];
  return [];
}

/**
 * R1-P4: retrievedAt is a valid date, not after today, inside the batch window, and the UTC date of
 * both the capture's modification time and the runner log's product-page fetch.
 */
export function checkRetrievedAt(row, file, today, capture, logMatch) {
  const out = [];
  const at = row.retrievedAt;
  if (!isIsoDate(at)) {
    out.push(problem('retrievedAt', at, 'not a valid YYYY-MM-DD date'));
  } else {
    if (at > today) out.push(problem('retrievedAt', at, `after today (${today})`));
    out.push(...windowProblems('retrievedAt', at, row, file));
  }
  const fileTime = { status: 'none', value: null };
  if (capture?.exists) {
    fileTime.value = capture.mtimeUtcDate;
    fileTime.status = capture.mtimeUtcDate === at ? 'match' : 'mismatch';
    if (fileTime.status === 'mismatch') {
      out.push(
        problem(
          'retrievedAt',
          at,
          `the capture's modification time is ${capture.mtimeIso}, UTC date ${capture.mtimeUtcDate}`,
        ),
      );
    }
  }
  const stamp = capture?.exists ? pageTimestamp(capture.html) : null;
  const pageTime = { status: 'none', value: null, timestamp: stamp };
  if (stamp) {
    pageTime.value = utcDateOfTimestamp(stamp);
    pageTime.status = pageTime.value === at ? 'match' : 'mismatch';
    if (pageTime.status === 'mismatch') {
      out.push(
        problem(
          'retrievedAt',
          at,
          `the capture's own pageLoadTimestampUTC is ${stamp}, UTC date ${pageTime.value}`,
        ),
      );
    }
  }
  const log = { status: 'none', value: null, ref: logMatch?.ref ?? null, matches: 0 };
  if (logMatch) {
    log.matches = logMatch.matches;
    log.fetchedAtUtc = logMatch.fetchedAtUtc;
    log.normalisedUrl = logMatch.normalisedUrl;
  }
  if (logMatch?.fetchedDate) {
    log.value = logMatch.fetchedDate;
    log.status = logMatch.fetchedDate === at ? 'match' : 'mismatch';
    if (log.status === 'mismatch') {
      out.push(
        problem(
          'retrievedAt',
          at,
          `the runner log ${logMatch.ref} fetched the product page at ${logMatch.fetchedAtUtc}, UTC date ${logMatch.fetchedDate}`,
        ),
      );
    }
  }
  return { problems: out, evidence: { retrievedAt: at ?? null, fileTime, pageTime, log } };
}

const sameAmount = (a, b) => typeof b === 'number' && Math.abs(a - b) < 0.005;

/**
 * R1-P6a, an aid for the 10% sample: the amount appears in the HTML capture. A screenshot is a
 * manual check. Also returns the search-snippet suspect (amount = the search result's price but not
 * on the product page) and a warning when the runner read another price on the product page.
 * Returns null when not applicable (no capture file, or no positive amount).
 */
export function checkAmountShown(row, capture, logMatch, text) {
  if (!capture?.exists || !isPositiveAmount(row.amount)) return null;
  if (capture.html === null) {
    return {
      status: 'manual',
      why: 'manual check (screenshot): read the amount, stock state and seller by eye',
      hits: [],
      warnings: [],
    };
  }
  const { found, hits } = findAmount(capture.html, row.amount, text);
  const warnings = [];
  let suspect = null;
  const e = logMatch?.entry;
  const pagePriceText = e?.product?.info?.price;
  const pagePrice = parseDisplayedPrice(pagePriceText);
  if (pagePrice !== null && !sameAmount(row.amount, pagePrice)) {
    warnings.push(
      problem(
        'amount',
        pagePriceText,
        `the runner read ${pagePriceText} on the product page (${logMatch.ref}); the row says ${row.amount}`,
      ),
    );
  }
  const id = productIdFromUrl(row.url);
  const candidate = (Array.isArray(e?.candidates) ? e.candidates : []).find(
    (c) => c && id && (c.asin === id || c.item === id),
  );
  const searchText = e?.pick?.price ?? candidate?.price ?? null;
  const searchPrice = parseDisplayedPrice(searchText);
  if (!found && sameAmount(row.amount, searchPrice)) {
    suspect = {
      amount: row.amount,
      searchPrice,
      searchPriceText: searchText,
      logRef: logMatch.ref,
      why: "the amount equals the search result's price but is not on the product page",
    };
  }
  return {
    status: found ? 'found' : 'manual',
    why: found
      ? null
      : `the amount ${row.amount} does not appear in the HTML capture in any display form`,
    hits,
    warnings,
    suspect,
  };
}

// ---------------------------------------------------------------------------------------------
// Gap checks (one gap record each)

/** The schema's reason codes; another code is only a warning, since R1-G1 asks for presence. */
export const GAP_REASON_CODES = Object.freeze([
  'not-listed',
  'blocked',
  'no-price-shown',
  'unavailable',
]);
const nonEmpty = (s) => typeof s === 'string' && s.trim() !== '';

/** `<market>:gap:<partId>`. */
export function gapKey(gap, fileMarket) {
  return `${gap.market ?? fileMarket}:gap:${gap.partId}`;
}

/** R1-G1: reasonCode and reason are present and not empty. */
export function checkGapReason(gap) {
  const out = [];
  if (!nonEmpty(gap.reasonCode))
    out.push(problem('reasonCode', gap.reasonCode, 'missing or empty'));
  if (!nonEmpty(gap.reason)) out.push(problem('reason', gap.reason, 'missing or empty'));
  return out;
}

/** R1-G2: retailersTried is a non-empty list of registry retailers that sell in the gap's market. */
export function checkGapRetailers(gap, publishers) {
  if (!Array.isArray(gap.retailersTried) || gap.retailersTried.length === 0) {
    return [
      problem('retailersTried', gap.retailersTried, 'must be a non-empty list of retailer ids'),
    ];
  }
  const out = [];
  for (const id of gap.retailersTried) {
    const pub = typeof id === 'string' ? publishers.get(id) : undefined;
    if (!pub) {
      out.push(problem('retailersTried', id, 'not a publisher in publishers.json'));
    } else if (pub.kind !== 'retailer') {
      out.push(problem('retailersTried', id, `registered as a ${pub.kind}, not a retailer`));
    } else if (!Array.isArray(pub.markets) || !pub.markets.includes(gap.market)) {
      out.push(
        problem(
          'retailersTried',
          id,
          `does not sell in ${gap.market} (markets ${JSON.stringify(pub.markets ?? [])})`,
        ),
      );
    }
  }
  return out;
}

/** R1-G3: checkedAt is a valid date, not after today, inside the batch window. */
export function checkGapDate(gap, file, today) {
  const at = gap.checkedAt;
  if (!isIsoDate(at)) return [problem('checkedAt', at, 'not a valid YYYY-MM-DD date')];
  const out = [];
  if (at > today) out.push(problem('checkedAt', at, `after today (${today})`));
  out.push(...windowProblems('checkedAt', at, gap, file));
  return out;
}

// ---------------------------------------------------------------------------------------------
// Benchmark checks (one row each)

export const BENCHMARK_PUBLISHER_KINDS = Object.freeze(['reviewer', 'benchmark-database']);
/** Test conditions of a game row (test plan §7.3). `upscaling.mode` is not needed when native. */
export const GAME_CONDITIONS = Object.freeze([
  'resolution',
  'preset',
  'rayTracing',
  'upscaling.method',
  'upscaling.mode',
  'frameGeneration',
  'testSystem.cpu.name',
  'testSystem.gpu.chipName',
  'testSystem.gpu.card',
  'testSystem.gpuDriver',
  'gameVersion',
]);
/** Creator conditions; also testSystem, which may be null only when aggregate is set. */
export const CREATOR_CONDITIONS = Object.freeze(['app', 'appVersion', 'test', 'device', 'backend']);

/** Value at a dot path: undefined when a key is missing, null when it or a parent is null. */
function valueAt(obj, dotted) {
  let v = obj;
  for (const k of dotted.split('.')) {
    if (v === null) return null;
    if (typeof v !== 'object' || !Object.hasOwn(v, k)) return undefined;
    v = v[k];
  }
  return v;
}

/** True when a note's `field` is this path or a parent of it. */
function noteCovers(row, field) {
  return (Array.isArray(row.notes) ? row.notes : []).some(
    (n) =>
      n && typeof n.field === 'string' && (n.field === field || field.startsWith(`${n.field}.`)),
  );
}

/**
 * One condition: a problem, or null when it passes. A null value is recorded in `nulls` as
 * `withNote` (passes) or `withoutNote` (fails).
 */
function conditionProblem(row, field, value, nulls) {
  if (value === undefined) return problem(field, null, 'missing');
  if (value === null) {
    const kind = noteCovers(row, field) ? 'withNote' : 'withoutNote';
    nulls.push({ field, kind });
    return kind === 'withNote'
      ? null
      : problem(field, null, 'null with no note on this field or a parent');
  }
  if (typeof value === 'string' && value.trim() === '') return problem(field, value, 'empty');
  return null;
}

/**
 * R1-B5 for a game row. Returns the problems and the row's null conditions, each `withNote`,
 * `withoutNote` or `allowedByRule` (upscaling.mode when the method is native).
 */
export function checkGameConditions(row) {
  const problems = [];
  const nulls = [];
  for (const field of GAME_CONDITIONS) {
    const value = valueAt(row, field);
    if (field === 'upscaling.mode' && valueAt(row, 'upscaling.method') === 'native') {
      if (value === null) nulls.push({ field: 'upscaling.mode (native)', kind: 'allowedByRule' });
      continue;
    }
    const p = conditionProblem(row, field, value, nulls);
    if (p) problems.push(p);
    else if (field === 'frameGeneration' && value !== 'off') {
      problems.push(
        problem(field, value, 'must be "off": frame-generation results never enter anchors'),
      );
    }
  }
  return { problems, nulls };
}

/** R1-B5 for a creator row; backend may be null for Cinebench, testSystem when aggregate is set. */
export function checkCreatorConditions(row) {
  const problems = [];
  const nulls = [];
  for (const field of CREATOR_CONDITIONS) {
    const value = valueAt(row, field);
    if (field === 'backend' && value === null && /^cinebench/.test(String(row.app))) {
      nulls.push({ field: 'backend (Cinebench)', kind: 'allowedByRule' });
      continue;
    }
    const p = conditionProblem(row, field, value, nulls);
    if (p) problems.push(p);
  }
  const ts = row.testSystem;
  const aggregateSet = row.aggregate !== null && typeof row.aggregate === 'object';
  if (ts === null || ts === undefined) {
    if (aggregateSet) nulls.push({ field: 'testSystem (aggregate set)', kind: 'allowedByRule' });
    else {
      problems.push(
        problem(
          'testSystem',
          jsonSafe(ts),
          'not set, and no aggregate is set (testSystem may be null only for an aggregate)',
        ),
      );
    }
  } else if (typeof ts !== 'object') {
    problems.push(problem('testSystem', ts, 'not an object'));
  }
  return { problems, nulls };
}

/** R1-B1: every source url is https, on its publisher's domains, never an archive, forum or aggregator. */
export function checkBenchmarkUrls(row, publishers) {
  if (!Array.isArray(row.sources) || row.sources.length === 0) {
    return [problem('sources', jsonSafe(row.sources), 'a benchmark row needs at least one source')];
  }
  const out = [];
  row.sources.forEach((s, i) => {
    const field = `sources[${i}].url`;
    const u = s && typeof s.url === 'string' ? parseUrl(s.url) : null;
    if (!u) {
      out.push(problem(field, s?.url, 'not a valid URL'));
      return;
    }
    if (u.protocol !== 'https:') out.push(problem(field, s.url, `not https (${u.protocol})`));
    const host = u.hostname.toLowerCase();
    const pub = publishers.get(s.publisher);
    const domains = Array.isArray(pub?.domains)
      ? pub.domains.filter((d) => typeof d === 'string')
      : [];
    if (!pub) {
      out.push(problem(field, s.url, `publisher ${s.publisher} is not in publishers.json`));
    } else if (!domains.some((d) => hostMatches(host, d.toLowerCase()))) {
      out.push(
        problem(field, s.url, `host ${host} is not on ${pub.id}'s domains (${domains.join(', ')})`),
      );
    }
    const denied = deniedHost(host);
    if (denied) {
      out.push(problem(field, s.url, `host ${host} is ${denied}; url must be the original page`));
    }
    const forum = forumPath(s.url);
    if (forum) out.push(problem(field, s.url, `${forum}, not the publisher's review`));
  });
  return out;
}

/** R1-B2: every source's publisher is a registry reviewer or benchmark database. */
export function checkBenchmarkPublishers(row, publishers) {
  const out = [];
  row.sources.forEach((s, i) => {
    const field = `sources[${i}].publisher`;
    const pub = publishers.get(s?.publisher);
    if (!pub) out.push(problem(field, s?.publisher, 'not a publisher in publishers.json'));
    else if (!BENCHMARK_PUBLISHER_KINDS.includes(pub.kind)) {
      out.push(
        problem(
          field,
          s.publisher,
          `registered as a ${pub.kind}, not a reviewer or benchmark-database`,
        ),
      );
    }
  });
  return out;
}

/** R1-B3: publishedAt is present, a valid date, and not after any source retrievedAt or today. */
export function checkPublishedAt(row, today) {
  const at = row.publishedAt;
  if (at === undefined || at === null) {
    return [problem('publishedAt', null, 'missing: every benchmark row records the publish date')];
  }
  if (!isIsoDate(at)) return [problem('publishedAt', at, 'not a valid YYYY-MM-DD date')];
  const out = [];
  if (at > today) out.push(problem('publishedAt', at, `after today (${today})`));
  (Array.isArray(row.sources) ? row.sources : []).forEach((s, i) => {
    if (isIsoDate(s?.retrievedAt) && at > s.retrievedAt) {
      out.push(problem('publishedAt', at, `after sources[${i}].retrievedAt ${s.retrievedAt}`));
    }
  });
  return out;
}

/**
 * R1-B4 for every source with an archiveUrl: the plan's Wayback form, the embedded original is the
 * source url, and publishedAt <= snapshot date <= the source's retrievedAt. Null when no source is
 * archived. An original equal to url only after normalising is a warning.
 */
export function checkArchiveUrls(row) {
  const sources = Array.isArray(row.sources) ? row.sources : [];
  const archived = sources
    .map((s, i) => [s, i])
    .filter(([s]) => s && typeof s === 'object' && Object.hasOwn(s, 'archiveUrl'));
  if (archived.length === 0) return null;
  const problems = [];
  const warnings = [];
  for (const [s, i] of archived) {
    const field = `sources[${i}].archiveUrl`;
    const w = parseWayback(s.archiveUrl);
    if (!w.ok) {
      problems.push(problem(field, s.archiveUrl, w.why));
      continue;
    }
    if (w.original !== s.url) {
      if (equalAfterNormalising(w.original, s.url)) {
        warnings.push(
          problem(
            field,
            s.archiveUrl,
            `the embedded original ${w.original} equals url ${s.url} only after normalising the scheme, www. or a trailing slash`,
          ),
        );
      } else {
        problems.push(
          problem(
            field,
            s.archiveUrl,
            `the embedded original ${w.original} is not the url ${s.url}`,
          ),
        );
      }
    }
    if (isIsoDate(row.publishedAt) && w.date < row.publishedAt) {
      problems.push(
        problem(field, s.archiveUrl, `snapshot ${w.date} is before publishedAt ${row.publishedAt}`),
      );
    }
    if (isIsoDate(s.retrievedAt) && w.date > s.retrievedAt) {
      problems.push(
        problem(
          field,
          s.archiveUrl,
          `snapshot ${w.date} is after its retrievedAt ${s.retrievedAt}`,
        ),
      );
    }
  }
  return { problems, warnings };
}

/** R1-B6: no source retrievedAt is after today (or invalid). */
export function checkSourceDates(row, today) {
  const out = [];
  row.sources.forEach((s, i) => {
    const field = `sources[${i}].retrievedAt`;
    if (!isIsoDate(s?.retrievedAt)) {
      out.push(problem(field, s?.retrievedAt, 'not a valid YYYY-MM-DD date'));
    } else if (s.retrievedAt > today) {
      out.push(problem(field, s.retrievedAt, `after today (${today})`));
    }
  });
  return out;
}

// ---------------------------------------------------------------------------------------------
// The audit

function auditPrices(ctx) {
  const { data, rec } = ctx;
  const keyCount = new Map();
  for (const { raw } of data.priceFiles) {
    for (const o of raw.observations) {
      if (o && typeof o === 'object') {
        const k = priceKey(o, raw.market);
        keyCount.set(k, (keyCount.get(k) ?? 0) + 1);
      }
    }
  }
  for (const { file, raw } of data.priceFiles) {
    raw.observations.forEach((o, i) => {
      if (!o || typeof o !== 'object' || Array.isArray(o)) {
        rec.result('R1-P7', `${file}#observations[${i}]`, [
          problem(null, o, 'a price row must be an object'),
        ]);
        return;
      }
      const key = priceKey(o, raw.market);
      rec.result('R1-P1', key, checkPriceUrl(o, data.publishers));
      rec.result('R1-P2', key, checkPriceRawKeys(o));

      const capture = ctx.evidence.captures.get(o.capture);
      rec.result('R1-P3', key, checkCapture(o, capture, ctx.manifest));
      const id = checkProductId(o, capture);
      if (id?.status === 'found') rec.result('R1-P3b', key, []);
      else if (id) rec.manualCheck('R1-P3b', key, problem('url', id.value, id.why));

      const logMatch = matchRunnerLog(o, ctx.evidence.logs, capture);
      const p4 = checkRetrievedAt(o, raw, ctx.today, capture, logMatch);
      rec.result('R1-P4', key, p4.problems);
      rec.evidence.push({ row: key, ...p4.evidence });
      if (p4.evidence.log.status === 'none') {
        rec.warn(
          'R1-P4',
          key,
          problem(
            'retrievedAt',
            o.retrievedAt,
            logMatch
              ? `the matching runner-log line ${logMatch.ref} has no zoned product fetch time`
              : 'no runner-log line has this partId, market, retailer and url',
          ),
        );
      }

      rec.result('R1-P5', key, checkPriceCurrency(o, raw));

      const text = capture?.exists && capture.html !== null ? visibleText(capture.html) : null;
      const shown = checkAmountShown(o, capture, logMatch, text);
      if (shown) {
        if (shown.status === 'found') rec.result('R1-P6a', key, []);
        else rec.manualCheck('R1-P6a', key, problem('amount', o.amount, shown.why));
        for (const w of shown.warnings) rec.warn('R1-P6a', key, w);
        if (shown.suspect) rec.suspects.push({ check: 'R1-P6a', row: key, ...shown.suspect });
        rec.amounts.push({ row: key, amount: o.amount, status: shown.status, hits: shown.hits });
      }

      const p7 = checkPricePartAndAmount(o, data.parts);
      const n = keyCount.get(key);
      if (n > 1) p7.push(problem('(key)', key, `duplicate: ${n} price rows share this key`));
      rec.result('R1-P7', key, p7);
    });
  }
}

function auditGaps(ctx) {
  const { data, rec } = ctx;
  const priced = new Set();
  const gapCount = new Map();
  for (const { raw } of data.priceFiles) {
    for (const o of raw.observations) if (o) priced.add(`${o.market ?? raw.market}|${o.partId}`);
    for (const g of raw.gaps) {
      if (g) gapCount.set(gapKey(g, raw.market), (gapCount.get(gapKey(g, raw.market)) ?? 0) + 1);
    }
  }
  for (const { file, raw } of data.priceFiles) {
    raw.gaps.forEach((g, i) => {
      if (!g || typeof g !== 'object' || Array.isArray(g)) {
        rec.result('R1-G1', `${file}#gaps[${i}]`, [
          problem(null, g, 'a gap record must be an object'),
        ]);
        return;
      }
      const key = gapKey(g, raw.market);
      rec.result('R1-G1', key, checkGapReason(g));
      if (nonEmpty(g.reasonCode) && !GAP_REASON_CODES.includes(g.reasonCode)) {
        rec.warn(
          'R1-G1',
          key,
          problem('reasonCode', g.reasonCode, `not one of ${GAP_REASON_CODES.join(', ')}`),
        );
      }
      rec.result('R1-G2', key, checkGapRetailers(g, data.publishers));
      if (g.market !== raw.market) {
        rec.warn('R1-G2', key, problem('market', g.market, `the file's market is ${raw.market}`));
      }
      rec.result('R1-G3', key, checkGapDate(g, raw, ctx.today));
      const both = priced.has(`${g.market ?? raw.market}|${g.partId}`);
      rec.result(
        'R1-G4',
        key,
        both ? [problem('partId', g.partId, `also has a ${g.market} price row`)] : [],
      );
      if (gapCount.get(key) > 1) {
        rec.warn(
          'R1-G4',
          key,
          problem('partId', g.partId, `${gapCount.get(key)} gap records share this key`),
        );
      }
      rec.result('R1-G5', key, partProblems(g.partId, data.parts));
    });
  }
}

/** R1-C1: per market, every purchasable part has at least one price or a gap record. */
function auditCoverage(ctx) {
  const { data, rec } = ctx;
  const markets = [
    ...new Set(data.priceFiles.map(({ raw }) => raw.market).filter((m) => typeof m === 'string')),
  ].sort();
  const purchasable = [...data.parts]
    .filter(([, p]) => !UNPRICED_CATEGORIES.includes(p.category))
    .map(([id]) => id);
  const coverage = {};
  for (const market of markets) {
    const priced = new Set();
    const gapped = new Set();
    for (const { raw } of data.priceFiles) {
      for (const o of raw.observations)
        if (o && (o.market ?? raw.market) === market) priced.add(o.partId);
      for (const g of raw.gaps) if (g && (g.market ?? raw.market) === market) gapped.add(g.partId);
    }
    const c = { parts: purchasable.length, priced: 0, gapped: 0, both: 0, neither: [] };
    for (const id of purchasable) {
      const p = priced.has(id);
      const g = gapped.has(id);
      c.priced += p ? 1 : 0;
      c.gapped += g ? 1 : 0;
      c.both += p && g ? 1 : 0;
      if (!p && !g) c.neither.push(id);
      rec.result(
        'R1-C1',
        `${market}:coverage:${id}`,
        p || g ? [] : [problem('partId', id, `no ${market} price and no ${market} gap record`)],
      );
    }
    coverage[market] = c;
  }
  return coverage;
}

function auditBenchmarks(ctx) {
  const { data, rec } = ctx;
  const conditionNulls = {};
  for (const { kind, file, items } of data.benchmarks) {
    const nulls = { withNote: {}, withoutNote: {}, allowedByRule: {} };
    conditionNulls[kind] = nulls;
    items.forEach((row, i) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        rec.result('R1-B5', `${file}#items[${i}]`, [problem(null, row, 'a row must be an object')]);
        return;
      }
      const key = typeof row.id === 'string' && row.id !== '' ? row.id : `${file}#items[${i}]`;
      const hasSources = Array.isArray(row.sources) && row.sources.length > 0;
      rec.result('R1-B1', key, checkBenchmarkUrls(row, data.publishers));
      if (hasSources) rec.result('R1-B2', key, checkBenchmarkPublishers(row, data.publishers));
      rec.result('R1-B3', key, checkPublishedAt(row, ctx.today));
      const b4 = checkArchiveUrls(row);
      if (b4) {
        rec.result('R1-B4', key, b4.problems);
        for (const w of b4.warnings) rec.warn('R1-B4', key, w);
      }
      const b5 = kind === 'game' ? checkGameConditions(row) : checkCreatorConditions(row);
      rec.result('R1-B5', key, b5.problems);
      for (const n of b5.nulls) nulls[n.kind][n.field] = (nulls[n.kind][n.field] ?? 0) + 1;
      if (b5.nulls.length) rec.nullRows.push({ kind, row: key, nulls: b5.nulls });
      if (hasSources) rec.result('R1-B6', key, checkSourceDates(row, ctx.today));
    });
  }
  return conditionNulls;
}

/** Runs every check over loaded inputs. Pure: all file reading happened in loadInputs. */
export function auditRule1(inputs) {
  const rec = new Recorder();
  const ctx = { ...inputs, rec };
  for (const p of inputs.evidence.logProblems) {
    rec.warn('R1-P4', p.ref, problem(null, null, `this runner-log line ${p.why}; it was skipped`));
  }
  auditPrices(ctx);
  auditGaps(ctx);
  const coverage = auditCoverage(ctx);
  const conditionNulls = auditBenchmarks(ctx);
  const { data, evidence, manifest } = inputs;
  return {
    tool: 'tests/audit/rule1.mjs',
    version: VERSION,
    today: inputs.today,
    inputs: {
      dataDir: inputs.dataDir ?? null,
      evidenceRoot: inputs.evidenceRoot ?? null,
      manifest: manifest
        ? { file: manifest.file, sha256: manifest.sha256, entries: manifest.entries.size }
        : null,
      dataFiles: data.files,
      runnerLogs: evidence.logFiles,
      captures: evidence.captures.size,
      duplicatePartIds: data.duplicateParts,
    },
    totals: {
      failures: rec.failures.length,
      warnings: rec.warnings.length,
      manual: rec.manual.length,
      suspects: rec.suspects.length,
    },
    checks: [...rec.totals.values()],
    failures: rec.failures,
    warnings: rec.warnings,
    manual: rec.manual,
    suspects: rec.suspects,
    coverage,
    evidence: rec.evidence,
    amounts: rec.amounts,
    conditionNulls,
    conditionNullRows: rec.nullRows,
    exitCode: rec.failures.length ? 1 : 0,
  };
}

/** Reads everything the checks need. Throws Rule1InputError on bad input. */
export function loadInputs({ dataDir, evidenceRoot, manifestPath, today }) {
  if (!isIsoDate(today)) throw new Rule1InputError(`--today ${today} is not a YYYY-MM-DD date`);
  const data = loadData(dataDir);
  const rels = data.priceFiles.flatMap(({ raw }) => raw.observations.map((o) => o?.capture));
  const evidence = loadEvidence(evidenceRoot, rels);
  const manifest = manifestPath ? loadManifest(manifestPath) : null;
  return { data, evidence, manifest, today, dataDir, evidenceRoot };
}

/** Loads the data and evidence and runs every check. Throws Rule1InputError on bad input. */
export function runRule1(options) {
  return auditRule1(loadInputs(options));
}

// ---------------------------------------------------------------------------------------------
// Output

const show = (v) => {
  const s = v === undefined ? 'undefined' : JSON.stringify(v);
  return s.length > 140 ? `${s.slice(0, 137)}...` : s;
};
const line = (e) =>
  `  ${e.check.padEnd(7)} ${e.row}${e.field ? `  ${e.field} = ${show(e.value)}` : ''}  ${e.why}`;
const counts = (o) =>
  Object.entries(o)
    .map(([k, n]) => `${k} ${n}`)
    .join(', ') || 'none';

/** The stdout summary: a totals table per check id, the failures, then the lists. */
export function formatReport(report) {
  const out = [];
  const { inputs } = report;
  out.push(`Owner's rule 1 compliance · ${report.tool} ${report.version} · today ${report.today}`);
  out.push(`data      ${inputs.dataDir} (${inputs.dataFiles.length} files)`);
  const logLines = inputs.runnerLogs.reduce((n, f) => n + f.lines, 0);
  out.push(
    `evidence  ${inputs.evidenceRoot} (${inputs.captures} captures named; ${inputs.runnerLogs.length} runner logs, ${logLines} lines)`,
  );
  out.push(
    inputs.manifest
      ? `manifest  ${inputs.manifest.file} (${inputs.manifest.entries} entries, sha256 ${inputs.manifest.sha256})`
      : 'manifest  none given: R1-P3 does not compare with a manifest',
  );
  out.push('');
  out.push(
    `${'check'.padEnd(7)} ${'rows'.padStart(5)} ${'pass'.padStart(5)} ${'fail'.padStart(5)} ${'manual'.padStart(6)}  what`,
  );
  for (const c of report.checks) {
    out.push(
      `${c.id.padEnd(7)} ${String(c.checked).padStart(5)} ${String(c.passed).padStart(5)} ${String(c.failed).padStart(5)} ${String(c.manual).padStart(6)}  ${c.title}`,
    );
  }
  out.push('');
  out.push(`Failures (${report.failures.length}):`);
  for (const f of report.failures) out.push(line(f));
  out.push('');
  for (const [market, c] of Object.entries(report.coverage)) {
    out.push(
      `Coverage ${market} (R1-C1): ${c.parts} purchasable parts, ${c.priced} priced, ${c.gapped} gapped, ${c.both} both, ${c.neither.length} neither${c.neither.length ? `: ${c.neither.join(', ')}` : ''}`,
    );
  }
  const tally = (pick) =>
    ['match', 'mismatch', 'none']
      .map((s) => `${s} ${report.evidence.filter((e) => pick(e) === s).length}`)
      .join(', ');
  out.push(`R1-P4 evidence, capture file time:   ${tally((e) => e.fileTime.status)}`);
  out.push(`R1-P4 evidence, page's own timestamp: ${tally((e) => e.pageTime.status)}`);
  out.push(`R1-P4 evidence, runner-log fetch:     ${tally((e) => e.log.status)}`);
  for (const [kind, n] of Object.entries(report.conditionNulls)) {
    out.push(
      `R1-B5 ${kind} nulls: with a note: ${counts(n.withNote)} · without a note: ${counts(n.withoutNote)} · allowed by rule: ${counts(n.allowedByRule)}`,
    );
  }
  out.push('');
  out.push(`Manual checks (${report.manual.length}):`);
  for (const m of report.manual) out.push(line(m));
  out.push(`R1-P6a search-snippet suspects (${report.suspects.length}):`);
  for (const s of report.suspects) {
    out.push(
      `  ${s.row}  amount ${s.amount} = search price ${show(s.searchPriceText)} (${s.logRef})`,
    );
  }
  out.push(`Warnings (${report.warnings.length}):`);
  for (const w of report.warnings) out.push(line(w));
  out.push('');
  out.push(
    `Result: ${report.exitCode === 0 ? 'PASS' : 'FAIL'} · ${report.failures.length} failures, ${report.manual.length} manual checks, ${report.warnings.length} warnings · exit code ${report.exitCode}`,
  );
  return `${out.join('\n')}\n`;
}

export function main(argv = process.argv.slice(2)) {
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        'data-dir': { type: 'string' },
        'evidence-root': { type: 'string' },
        manifest: { type: 'string' },
        today: { type: 'string' },
        json: { type: 'string' },
      },
      strict: true,
    });
    if (!values['data-dir']) throw new Rule1InputError('--data-dir is required');
    if (!values['evidence-root']) throw new Rule1InputError('--evidence-root is required');
    const report = runRule1({
      dataDir: path.resolve(values['data-dir']),
      evidenceRoot: path.resolve(values['evidence-root']),
      manifestPath: values.manifest ? path.resolve(values.manifest) : undefined,
      today: values.today ?? new Date().toISOString().slice(0, 10),
    });
    if (values.json) {
      const file = path.resolve(values.json);
      mkdirSync(path.dirname(file), { recursive: true });
      const generatedAt = new Date().toISOString();
      writeFileSync(file, `${JSON.stringify({ generatedAt, ...report }, null, 2)}\n`);
    }
    process.stdout.write(formatReport(report));
    return report.exitCode;
  } catch (error) {
    const known =
      error instanceof Rule1InputError || String(error?.code).startsWith('ERR_PARSE_ARGS');
    process.stderr.write(`rule1: ${known ? error.message : (error?.stack ?? String(error))}\n`);
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
