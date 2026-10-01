/**
 * Unit tests for tests/audit/rule1.mjs: QA's Owner's-rule-1 compliance check of every price and
 * benchmark row (test plan §7.5). Fixtures are small invented JSON files and fake captures written to
 * a temp folder; no third-party page content is stored here.
 * The golden SHA-256 was computed outside Node with coreutils:
 *   printf '%s' 'rig-lab rule1 golden capture' | sha256sum
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import {
  Rule1InputError,
  deniedHost,
  equalAfterNormalising,
  findAmount,
  forumPath,
  inspectCapture,
  isIsoDate,
  listingPattern,
  parseDisplayedPrice,
  parseManifest,
  parseWayback,
  productIdFromUrl,
  runRule1,
} from './rule1.mjs';

const temp = [];
afterAll(() => temp.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tempDir = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'rig-lab-rule1-'));
  temp.push(dir);
  return dir;
};

// ---------------------------------------------------------------------------------------------
// Fixture: one priced part (cpu-a) and one gapped part (cpu-b) per market, a GPU chip that is not
// purchasable, one game row and two creator rows. Every value is invented for the test.

const TODAY = '2026-10-01';
/** Fixture-side hashing with node:crypto, independent of the tool (golden-checked above). */
const fixtureSha = (content) => createHash('sha256').update(content).digest('hex');
const US_CAPTURE = 'artifacts/prices/US/cpu-a--shop-us--2026-09-30.html';
const SA_CAPTURE = 'artifacts/prices/SA/cpu-a--shop-sa--2026-09-30.html';
const US_URL = 'https://www.shop-us.example/dp/B0TESTUS01';
const SA_URL = 'https://www.shop-sa.example/-/en/dp/B0TESTSA01';
const US_KEY = 'US:cpu-a--shop-us--2026-09-30';
const SA_KEY = 'SA:cpu-a--shop-sa--2026-09-30';
const GAME_ID = 'rev-a-game-x-1440p-chip-a';
const BLENDER_ID = 'db-a-5-2-0-optix-chip-a';
const CINEBENCH_ID = 'rev-a-cinebench-2024-multi-core-cpu-a';

const US_HTML = [
  '<!doctype html><html><head><title>Test CPU A</title>',
  '<link rel="canonical" href="https://www.shop-us.example/test-cpu-a/dp/B0TESTUS01">',
  '</head><body><h1>Test CPU A</h1>',
  '<div class="price">$<span class="w">1,234</span><span class="d">.</span><span class="f">56</span></div>',
  '<input type="hidden" name="item" value="B0TESTUS01"></body></html>',
].join('\n');
const SA_HTML =
  '<!doctype html><html><head><title>Test CPU A</title></head><body><h1>Test CPU A</h1>' +
  '<p data-item="B0TESTSA01">SAR&nbsp;4,630.00</p></body></html>';
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

const usRow = () => ({
  partId: 'cpu-a',
  market: 'US',
  currency: 'USD',
  amount: 1234.56,
  retailer: 'shop-us',
  url: US_URL,
  inStock: true,
  isMarketplace: false,
  seller: 'Shop US',
  retrievedAt: '2026-09-30',
  capture: US_CAPTURE,
  captureSha256: 'auto',
});
const saRow = () => ({
  partId: 'cpu-a',
  market: 'SA',
  currency: 'SAR',
  amount: 4630,
  retailer: 'shop-sa',
  url: SA_URL,
  inStock: true,
  isMarketplace: true,
  seller: 'A Seller',
  retrievedAt: '2026-09-30',
  capture: SA_CAPTURE,
  captureSha256: 'auto',
  notes: [{ field: 'seller', text: 'A marketplace seller.' }],
});
const gap = (partId, market, retailersTried) => ({
  partId,
  market,
  reasonCode: 'not-listed',
  reason: 'No listing for this exact part in the search results.',
  retailersTried,
  checkedAt: '2026-09-30',
});
const priceFile = (market, currency, observations, gaps) => ({
  schemaVersion: 1,
  market,
  currency,
  batch: { id: 'batch-1', windowStart: '2026-09-30', windowEnd: '2026-10-01' },
  priceBasis: 'Invented for the test.',
  observations,
  gaps,
});
const logLine = (row, { price, fetchedAtUtc, searchFetchedAtUtc }) => ({
  partId: row.partId,
  market: row.market,
  retailer: row.retailer,
  query: 'Test CPU A',
  searchUrl: `${new URL(row.url).origin}/s?k=Test+CPU+A`,
  searchFetchedAtUtc,
  candidates: [{ asin: productIdFromUrl(row.url), title: 'Test CPU A', price, sponsored: false }],
  pick: { asin: productIdFromUrl(row.url), title: 'Test CPU A', price, sponsored: false },
  productUrl: row.url,
  product: {
    url: row.url,
    kind: 'shop',
    status: 200,
    fetchedAtUtc,
    finalUrl: `${row.url}?th=1`,
    title: 'Test CPU A',
    info: { price, soldBy: row.seller },
  },
  capture: row.capture,
  outcome: 'captured',
});
const usLog = () =>
  logLine(usRow(), {
    price: '$1,234.56',
    fetchedAtUtc: '2026-09-30T20:15:20.367Z',
    searchFetchedAtUtc: '2026-09-30T20:15:06.732Z',
  });
const saLog = () =>
  logLine(saRow(), {
    price: 'SAR\u00a04,630.00',
    fetchedAtUtc: '2026-09-30T20:14:55.395Z',
    searchFetchedAtUtc: '2026-09-30T20:14:41.941Z',
  });

const gameRow = () => ({
  id: GAME_ID,
  gameId: 'game-x',
  limiter: 'gpu',
  testSystem: {
    cpu: { name: 'Test CPU A', catalogueId: 'cpu-a' },
    gpu: { chipName: 'Chip A', chipId: 'chip-a', card: 'Chip A Reference Card', cardId: null },
    ram: '2 x 16 GB DDR5-6000',
    motherboard: null,
    os: null,
    gpuDriver: '100.10',
  },
  gameVersion: '1.0.2',
  scene: null,
  resolution: '2560x1440',
  preset: 'Ultra',
  rayTracing: 'off',
  upscaling: { method: 'native', mode: null, version: null },
  frameGeneration: 'off',
  avgFps: 120.5,
  onePercentLowFps: 90.1,
  publishedAt: '2026-05-06',
  sources: [
    {
      url: 'https://www.rev-a.example/review/chip-a/4',
      publisher: 'rev-a',
      retrievedAt: '2026-09-30',
      docType: 'review',
    },
    {
      url: 'https://img.rev-a.example/review/chip-a/chart.png',
      publisher: 'rev-a',
      retrievedAt: '2026-09-30',
      docType: 'review',
      archiveUrl:
        'https://web.archive.org/web/20260507101500/https://img.rev-a.example/review/chip-a/chart.png',
    },
  ],
  notes: [{ field: 'scene', text: 'The review does not name its test scene.' }],
});
const blenderRow = () => ({
  id: BLENDER_ID,
  app: 'blender',
  appVersion: '5.2.0',
  test: 'benchmark score (all scenes summed)',
  device: 'gpu',
  backend: 'OptiX',
  subject: { type: 'gpu', chipId: 'chip-a' },
  score: 1234.5,
  unit: 'samples-per-minute',
  aggregate: { statistic: 'median', sampleSize: 12 },
  testSystem: null,
  publishedAt: '2026-09-30',
  sources: [
    {
      url: 'https://opendata.db-a.example/benchmarks/query/?compute_type=OPTIX',
      publisher: 'db-a',
      retrievedAt: '2026-09-30',
      docType: 'benchmark-database',
    },
  ],
});
const cinebenchRow = () => ({
  id: CINEBENCH_ID,
  app: 'cinebench-2024',
  appVersion: '2024',
  test: 'multi-core',
  device: 'cpu',
  backend: null,
  subject: { type: 'cpu', cpuId: 'cpu-a' },
  score: 2448,
  unit: 'points',
  aggregate: null,
  testSystem: { cpu: 'Test CPU A', gpu: null, ram: '2 x 16 GB DDR5-6000', os: null },
  publishedAt: '2024-11-06',
  sources: [
    {
      url: 'https://www.rev-a.example/review/cpu-a/9.html',
      publisher: 'rev-a',
      retrievedAt: '2026-09-30',
      docType: 'review',
      archiveUrl:
        'https://web.archive.org/web/20241111154913/https://www.rev-a.example/review/cpu-a/9.html',
    },
  ],
});

function baseModel() {
  return {
    publishers: [
      {
        id: 'shop-us',
        name: 'Shop US',
        kind: 'retailer',
        domains: ['shop-us.example'],
        markets: ['US'],
      },
      {
        id: 'shop-sa',
        name: 'Shop SA',
        kind: 'retailer',
        domains: ['shop-sa.example'],
        markets: ['SA'],
      },
      { id: 'maker', name: 'Maker', kind: 'manufacturer', domains: ['maker.example'] },
      { id: 'rev-a', name: 'Review A', kind: 'reviewer', domains: ['rev-a.example'] },
      { id: 'db-a', name: 'Bench DB', kind: 'benchmark-database', domains: ['db-a.example'] },
    ],
    parts: {
      'cpu.json': { schemaVersion: 1, category: 'cpu', items: [{ id: 'cpu-a' }, { id: 'cpu-b' }] },
      'gpu-chip.json': { schemaVersion: 1, category: 'gpu-chip', items: [{ id: 'chip-a' }] },
    },
    prices: {
      'us.json': priceFile('US', 'USD', [usRow()], [gap('cpu-b', 'US', ['shop-us'])]),
      'sa.json': priceFile('SA', 'SAR', [saRow()], [gap('cpu-b', 'SA', ['shop-sa'])]),
    },
    captures: {
      [US_CAPTURE]: { content: US_HTML, mtime: '2026-09-30T20:15:20.000Z' },
      [SA_CAPTURE]: { content: SA_HTML, mtime: '2026-09-30T20:14:55.000Z' },
    },
    logs: { 'results-US.jsonl': [usLog()], 'results-SA.jsonl': [saLog()] },
    /** Manifest overrides: path → hash, or null to leave the path out. */
    manifest: {},
    game: { schemaVersion: 1, items: [gameRow()] },
    creator: { schemaVersion: 1, items: [blenderRow(), cinebenchRow()] },
  };
}

const us = (m) => m.prices['us.json'];
const sa = (m) => m.prices['sa.json'];
const game = (m) => m.game.items[0];
const blender = (m) => m.creator.items[0];
const cinebench = (m) => m.creator.items[1];

/** Writes the (mutated) model to a temp folder and returns paths plus a runner. */
function build(mutate = () => {}) {
  const m = baseModel();
  mutate(m);
  const root = tempDir();
  const dataDir = path.join(root, 'data');
  const evidenceRoot = path.join(root, 'evidence');
  const put = (file, value) => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
  };
  put(path.join(dataDir, 'publishers.json'), { schemaVersion: 1, publishers: m.publishers });
  for (const [name, v] of Object.entries(m.parts)) put(path.join(dataDir, 'parts', name), v);
  for (const [name, v] of Object.entries(m.prices)) {
    for (const o of typeof v === 'string' ? [] : v.observations) {
      if (o.captureSha256 === 'auto') {
        const c = m.captures[o.capture];
        o.captureSha256 = c ? fixtureSha(c.content) : '0'.repeat(64);
      }
    }
    put(path.join(dataDir, 'prices', name), v);
  }
  if (m.game !== undefined) put(path.join(dataDir, 'benchmarks', 'game.json'), m.game);
  if (m.creator !== undefined) put(path.join(dataDir, 'benchmarks', 'creator.json'), m.creator);
  mkdirSync(path.join(evidenceRoot, 'artifacts', 'prices'), { recursive: true });
  for (const [rel, c] of Object.entries(m.captures)) {
    const abs = path.join(evidenceRoot, ...rel.split('/'));
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, c.content);
    const t = new Date(c.mtime);
    utimesSync(abs, t, t);
  }
  for (const [name, lines] of Object.entries(m.logs)) {
    const text = lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n');
    writeFileSync(path.join(evidenceRoot, 'artifacts', 'prices', name), `${text}\n`);
  }
  const manifest = new Map(Object.entries(m.captures).map(([r, c]) => [r, fixtureSha(c.content)]));
  for (const [rel, h] of Object.entries(m.manifest)) {
    if (h === null) manifest.delete(rel);
    else manifest.set(rel, h);
  }
  const manifestPath = path.join(root, 'manifest.sha256');
  writeFileSync(manifestPath, [...manifest].map(([rel, h]) => `${h}  ${rel}\n`).join(''));
  const opts = { dataDir, evidenceRoot, manifestPath, today: TODAY };
  return { ...opts, root, run: (over = {}) => runRule1({ ...opts, ...over }) };
}

const check = (report, id) => report.checks.find((c) => c.id === id);
const failuresOf = (report, id) => report.failures.filter((f) => f.check === id);
/** Runs a mutated fixture and returns the failures of one check. */
const failing = (id, mutate, over) => failuresOf(build(mutate).run(over), id);

describe('helpers', () => {
  it('accepts only real calendar dates written YYYY-MM-DD', () => {
    expect(isIsoDate('2026-09-30')).toBe(true);
    expect(isIsoDate('2024-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-09-31')).toBe(false);
    expect(isIsoDate('2026-9-30')).toBe(false);
    expect(isIsoDate('2026-09-30T00:00:00Z')).toBe(false);
    expect(isIsoDate(20260930)).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });

  it('denies archives, caches, search engines, trackers, aggregators and forums, with subdomains and any TLD', () => {
    const denied = [
      'web.archive.org',
      'archive.org',
      'archive.today',
      'archive.ph',
      'archive.is',
      'archive.li',
      'webcache.googleusercontent.com',
      'cachedview.nl',
      'www.google.com',
      'www.google.com.sa',
      'google.de',
      'www.bing.com',
      'duckduckgo.com',
      'camelcamelcamel.com',
      'keepa.com',
      'pricespy.co.uk',
      'www.pricerunner.com',
      'idealo.de',
      'pcpartpicker.com',
      'sa.pricena.com',
      'yaoota.com',
      'www.reddit.com',
      'forums.example.com',
      'community.example.com',
    ];
    for (const host of denied) expect(deniedHost(host), host).toEqual(expect.any(String));
    const allowed = [
      'www.amazon.com',
      'www.amazon.sa',
      'www.newegg.com',
      'www.computerbase.de',
      'opendata.blender.org',
      'tpucdn.com',
      'googlestore.example',
    ];
    for (const host of allowed) expect(deniedHost(host), host).toBeNull();
  });

  it('flags search and listing pages but not product pages', () => {
    const listings = [
      'https://www.amazon.sa/-/en/s?k=AMD+Ryzen+7+9850X3D+processor',
      'https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias',
      'https://www.shop.example/search?term=ssd',
      'https://www.shop.example/catalog?k=ssd',
      'https://www.shop.example/items?q=ssd',
      'https://www.newegg.com/p/pl?d=AMD+Ryzen+7+5700X3D',
      'https://www.shop.example/sch/i.html?_nkw=ssd',
      'https://www.shop.example/browse/cpus',
      'https://www.shop.example/category/cpus',
      'https://www.shop.example/',
    ];
    for (const url of listings) expect(listingPattern(url), url).toEqual(expect.any(String));
    const products = [
      'https://www.amazon.sa/-/en/dp/B0G8JMLXNQ',
      'https://www.amazon.com/dp/B0DKFMSMYK',
      'https://www.newegg.com/p/2RC-02TR-00047',
      'https://www.newegg.com/intel-core-ultra-5-245k-desktop-cpu-processor/p/N82E16819118508',
    ];
    for (const url of products) expect(listingPattern(url), url).toBeNull();
  });

  it('keeps a product page whose url carries search tracking parameters', () => {
    const url = 'https://www.amazon.com/AMD-Ryzen-7/dp/B0DKFMSMYK/ref=sr_1_1?keywords=ryzen&qid=17';
    expect(listingPattern(url)).toBeNull();
  });

  it('flags forum and community paths on benchmark sources', () => {
    expect(forumPath('https://www.rev-a.example/forums/threads/review.123/')).toEqual(
      expect.any(String),
    );
    expect(forumPath('https://www.rev-a.example/community/post/9')).toEqual(expect.any(String));
    expect(forumPath('https://www.rev-a.example/review/chip-a/4.html')).toBeNull();
  });

  it('derives the product id from the url: ASIN, Newegg item, else the last meaningful segment', () => {
    expect(productIdFromUrl('https://www.amazon.sa/-/en/dp/B0G8JMLXNQ')).toBe('B0G8JMLXNQ');
    expect(productIdFromUrl('https://www.amazon.com/AMD-Ryzen-7/dp/B0DKFMSMYK?th=1')).toBe(
      'B0DKFMSMYK',
    );
    expect(productIdFromUrl('https://www.amazon.com/gp/product/B0DKFMSMYK')).toBe('B0DKFMSMYK');
    expect(productIdFromUrl('https://www.newegg.com/p/2RC-02TR-00047')).toBe('2RC-02TR-00047');
    expect(productIdFromUrl('https://www.newegg.com/intel-core-ultra/p/N82E16819118508')).toBe(
      'N82E16819118508',
    );
    expect(productIdFromUrl('https://www.shop.example/en/cpus/ryzen-7-9800x3d.html')).toBe(
      'ryzen-7-9800x3d',
    );
    expect(productIdFromUrl('https://www.shop.example/')).toBeNull();
    expect(productIdFromUrl('not a url')).toBeNull();
  });

  it('derives no product id from a search or listing url, or from a segment too short to be one', () => {
    expect(productIdFromUrl('https://www.amazon.com/s?k=AMD+Ryzen+7+9850X3D')).toBeNull();
    expect(productIdFromUrl('https://www.shop.example/search?q=ryzen')).toBeNull();
    expect(productIdFromUrl('https://www.newegg.com/p/pl?d=AMD+Ryzen')).toBeNull();
    expect(productIdFromUrl('https://www.shop.example/item/ab')).toBeNull();
  });

  it('finds an amount in the display forms pages use, including split by tags', () => {
    expect(findAmount('<b>SAR\u00a02,248.58</b>', 2248.58).found).toBe(true);
    expect(findAmount('<b>SAR&nbsp;2,248.58</b>', 2248.58).found).toBe(true);
    expect(findAmount('"priceAmount":2248.58,', 2248.58).found).toBe(true);
    expect(findAmount('<i>2,248</i><i>.</i><i>58</i>', 2248.58).found).toBe(true);
    expect(findAmount('<b>$1,398.90</b>', 1398.9).found).toBe(true);
    expect(findAmount('{"p":1398.9}', 1398.9).found).toBe(true);
    expect(findAmount('<b>SAR 596.00</b>', 596).found).toBe(true);
    expect(findAmount('<b>SAR 596</b>', 596).found).toBe(true);
    expect(findAmount('<b>$<strong>330</strong><sup>.00</sup></b>', 330).found).toBe(true);
  });

  it('does not find an amount inside a larger number, in a different price or as a bare integer', () => {
    expect(findAmount('<b>SAR 12,248.58</b>', 2248.58).found).toBe(false);
    expect(findAmount('<b>SAR 2,248.59</b>', 2248.58).found).toBe(false);
    expect(findAmount('<b>SAR 2,248.580</b>', 2248.58).found).toBe(false);
    expect(findAmount('<b>SAR 596.50</b>', 596).found).toBe(false);
    expect(findAmount('<b>Model 596 rev 2</b>', 596).found).toBe(false);
  });

  it('parses a displayed price such as a search-result snippet', () => {
    expect(parseDisplayedPrice('SAR\u00a02,248.58')).toBe(2248.58);
    expect(parseDisplayedPrice('$484.00')).toBe(484);
    expect(parseDisplayedPrice('SAR13,932.99')).toBe(13932.99);
    expect(parseDisplayedPrice('')).toBeNull();
    expect(parseDisplayedPrice('None')).toBeNull();
    expect(parseDisplayedPrice(null)).toBeNull();
  });

  it('reads a sha256sum manifest in text or binary mode, with CRLF line ends', () => {
    const a = 'a'.repeat(64);
    const b = 'B'.repeat(64);
    const m = parseManifest(
      `${a}  artifacts/prices/SA/x.html\r\n${b} *./artifacts/prices/US/y.png\n\n`,
    );
    expect(m.get('artifacts/prices/SA/x.html')).toBe(a);
    expect(m.get('artifacts/prices/US/y.png')).toBe('b'.repeat(64));
    expect(m.size).toBe(2);
  });

  it('rejects a malformed manifest line and a path listed twice with different hashes', () => {
    expect(() => parseManifest('not a manifest line\n')).toThrow(Rule1InputError);
    expect(() => parseManifest(`${'a'.repeat(64)}  p.html\n${'b'.repeat(64)}  p.html\n`)).toThrow(
      /twice/,
    );
  });

  it('parses only the plan form of a Wayback link: https, 14 digits, no flag, a real date', () => {
    expect(
      parseWayback(
        'https://web.archive.org/web/20260128230622/https://www.techpowerup.com/review/x/18.html',
      ),
    ).toEqual({
      ok: true,
      timestamp: '20260128230622',
      date: '2026-01-28',
      original: 'https://www.techpowerup.com/review/x/18.html',
    });
    const bad = [
      ['https://web.archive.org/web/2026012823/https://x.example/a', /14/],
      ['https://web.archive.org/web/20260128230622im_/https://x.example/a.png', /flag/],
      ['http://web.archive.org/web/20260128230622/https://x.example/a', /form/],
      ['https://archive.ph/20260128230622/https://x.example/a', /form/],
      ['https://web.archive.org/web/20261301000000/https://x.example/a', /date/],
      ['https://web.archive.org/web/20260128250000/https://x.example/a', /time/],
    ];
    for (const [url, why] of bad) {
      const r = parseWayback(url);
      expect(r.ok, url).toBe(false);
      expect(r.why, url).toMatch(why);
    }
  });

  it('compares URLs ignoring only the scheme, a leading www. and a trailing slash', () => {
    expect(
      equalAfterNormalising(
        'http://techpowerup.com/review/x/',
        'https://www.techpowerup.com/review/x',
      ),
    ).toBe(true);
    expect(
      equalAfterNormalising(
        'https://www.techpowerup.com/review/x?page=2',
        'https://www.techpowerup.com/review/x',
      ),
    ).toBe(false);
    expect(
      equalAfterNormalising(
        'https://www.techpowerup.com/review/y',
        'https://www.techpowerup.com/review/x',
      ),
    ).toBe(false);
  });

  it('hashes a capture exactly as coreutils sha256sum does and reports its UTC modification time', () => {
    const dir = tempDir();
    const rel = 'artifacts/prices/US/golden.html';
    const abs = path.join(dir, 'artifacts', 'prices', 'US');
    mkdirSync(abs, { recursive: true });
    writeFileSync(path.join(abs, 'golden.html'), 'rig-lab rule1 golden capture');
    // 23:59:59 UTC is already the next day in Riyadh (UTC+3): the date must be the UTC one.
    const mtime = new Date('2026-09-30T23:59:59.000Z');
    utimesSync(path.join(abs, 'golden.html'), mtime, mtime);
    const info = inspectCapture(dir, rel);
    expect(info.exists).toBe(true);
    expect(info.sha256).toBe('a008e471ae90e5e4ef313a05789f03f2063f4888aaff41ec4dd71a7c1b86556c');
    expect(info.mtimeUtcDate).toBe('2026-09-30');
    expect(info.html).toBe('rig-lab rule1 golden capture');
    expect(inspectCapture(dir, 'artifacts/prices/US/missing.html').exists).toBe(false);
    expect(inspectCapture(dir, '../outside.html').exists).toBe(false);
  });
});

describe('prices: R1-P1, R1-P2, R1-P5, R1-P7', () => {
  it('passes both price rows of the clean fixture', () => {
    const r = build().run();
    for (const id of ['R1-P1', 'R1-P2', 'R1-P5', 'R1-P7']) {
      expect(check(r, id), id).toMatchObject({ checked: 2, passed: 2, failed: 0 });
    }
  });

  it('R1-P1 fails a plain-http url', () => {
    const f = failing(
      'R1-P1',
      (m) => (us(m).observations[0].url = US_URL.replace('https', 'http')),
    );
    expect(f).toEqual([expect.objectContaining({ row: US_KEY, field: 'url' })]);
    expect(f[0].why).toMatch(/https/);
  });

  it("R1-P1 fails a url on a host that is not one of the retailer's domains", () => {
    const f = failing('R1-P1', (m) => {
      us(m).observations[0].url = 'https://www.other-shop.example/dp/B0TESTUS01';
    });
    expect(f).toEqual([expect.objectContaining({ row: US_KEY, field: 'url' })]);
    expect(f[0].why).toMatch(/shop-us\.example/);
  });

  it('R1-P1 fails a retailer registered as another kind, or not selling in the market', () => {
    const kind = failing('R1-P1', (m) => (m.publishers[0].kind = 'reviewer'));
    expect(kind).toEqual([expect.objectContaining({ row: US_KEY, field: 'retailer' })]);
    expect(kind[0].why).toMatch(/reviewer/);
    const market = failing('R1-P1', (m) => (m.publishers[0].markets = ['SA']));
    expect(market).toEqual([expect.objectContaining({ row: US_KEY, field: 'retailer' })]);
    expect(market[0].why).toMatch(/US/);
    const unknown = failing('R1-P1', (m) => (us(m).observations[0].retailer = 'nobody'));
    expect(unknown.map((x) => x.field)).toContain('retailer');
  });

  it('R1-P1 fails archive, cache, tracker and search-engine hosts even if the retailer lists them', () => {
    for (const host of [
      'web.archive.org',
      'webcache.googleusercontent.com',
      'camelcamelcamel.com',
      'www.google.com',
    ]) {
      const f = failing('R1-P1', (m) => {
        m.publishers[0].domains.push(host.replace(/^www\./, ''));
        us(m).observations[0].url = `https://${host}/item/B0TESTUS01`;
      });
      expect(f, host).toEqual([expect.objectContaining({ row: US_KEY, field: 'url' })]);
      expect(f[0].why, host).toMatch(/archive|cache|tracker|search engine/);
    }
  });

  it('R1-P1 fails a search or listing page', () => {
    for (const url of [
      'https://www.shop-us.example/s?k=Test+CPU+A',
      'https://www.shop-us.example/p/pl?d=Test+CPU+A',
    ]) {
      const f = failing('R1-P1', (m) => (us(m).observations[0].url = url));
      expect(f, url).toEqual([expect.objectContaining({ row: US_KEY, field: 'url' })]);
      expect(f[0].why, url).toMatch(/search|listing/);
    }
  });

  it('R1-P2 fails a price row that carries an archiveUrl, sources or another archive-like key', () => {
    const archive = failing('R1-P2', (m) => {
      us(m).observations[0].archiveUrl = `https://web.archive.org/web/20260930000000/${US_URL}`;
    });
    expect(archive).toEqual([expect.objectContaining({ row: US_KEY, field: 'archiveUrl' })]);
    const sources = failing('R1-P2', (m) => (us(m).observations[0].sources = []));
    expect(sources).toEqual([expect.objectContaining({ row: US_KEY, field: 'sources' })]);
    const other = failing('R1-P2', (m) => (us(m).observations[0].waybackCopy = 'x'));
    expect(other).toEqual([expect.objectContaining({ row: US_KEY, field: 'waybackCopy' })]);
  });

  it('R1-P5 fails a currency that is not the market currency', () => {
    const f = failing('R1-P5', (m) => (us(m).observations[0].currency = 'SAR'));
    expect(f.map((x) => x.field)).toContain('currency');
    expect(f.find((x) => x.field === 'currency').why).toMatch(/USD/);
  });

  it("R1-P5 fails a row whose market differs from its file's market", () => {
    const f = failing('R1-P5', (m) => (us(m).observations[0].market = 'SA'));
    const row = 'SA:cpu-a--shop-us--2026-09-30';
    expect(f).toContainEqual(expect.objectContaining({ row, field: 'market' }));
  });

  it('R1-P7 fails a partId that is not a part, and a GPU chip, which is not sold', () => {
    const unknown = failing('R1-P7', (m) => (us(m).observations[0].partId = 'cpu-z'));
    expect(unknown).toEqual([
      expect.objectContaining({ row: 'US:cpu-z--shop-us--2026-09-30', field: 'partId' }),
    ]);
    const chip = failing('R1-P7', (m) => (us(m).observations[0].partId = 'chip-a'));
    expect(chip).toEqual([expect.objectContaining({ field: 'partId' })]);
    expect(chip[0].why).toMatch(/gpu-chip/);
  });

  it('R1-P7 fails every row of a duplicated key within a market', () => {
    const f = failing('R1-P7', (m) => us(m).observations.push(usRow()));
    expect(f).toHaveLength(2);
    expect(f.every((x) => x.row === US_KEY && /duplicate/.test(x.why))).toBe(true);
  });

  it('R1-P7 fails an amount that is not a positive number', () => {
    for (const amount of [0, -5, '1234.56', null]) {
      const f = failing('R1-P7', (m) => (us(m).observations[0].amount = amount));
      expect(f, String(amount)).toEqual([
        expect.objectContaining({ row: US_KEY, field: 'amount' }),
      ]);
    }
  });
});

const usLogOf = (m) => m.logs['results-US.jsonl'][0];
const evidenceOf = (report, row) => report.evidence.find((e) => e.row === row);

describe('evidence: R1-P3, R1-P3b, R1-P4, R1-P6a', () => {
  it('passes the clean fixture against its captures, the manifest, file times and the runner log', () => {
    const r = build().run();
    expect(check(r, 'R1-P3')).toMatchObject({ checked: 2, passed: 2, failed: 0 });
    expect(check(r, 'R1-P3b')).toMatchObject({ checked: 2, passed: 2, failed: 0, manual: 0 });
    expect(check(r, 'R1-P4')).toMatchObject({ checked: 2, passed: 2, failed: 0 });
    expect(check(r, 'R1-P6a')).toMatchObject({ checked: 2, passed: 2, failed: 0, manual: 0 });
    expect(evidenceOf(r, US_KEY)).toMatchObject({
      retrievedAt: '2026-09-30',
      fileTime: { status: 'match', value: '2026-09-30' },
      log: { status: 'match', value: '2026-09-30', ref: 'artifacts/prices/results-US.jsonl:1' },
    });
    expect(evidenceOf(r, SA_KEY)).toMatchObject({
      fileTime: { status: 'match' },
      log: { status: 'match', ref: 'artifacts/prices/results-SA.jsonl:1' },
    });
  });

  it('R1-P3 fails a capture that is not named from the row', () => {
    const wrong = 'artifacts/prices/US/cpu-a--shop-x--2026-09-30.html';
    const f = failing('R1-P3', (m) => {
      us(m).observations[0].capture = wrong;
      m.captures[wrong] = m.captures[US_CAPTURE];
    });
    expect(f).toEqual([expect.objectContaining({ row: US_KEY, field: 'capture', value: wrong })]);
    expect(f[0].why).toContain('artifacts/prices/US/cpu-a--shop-us--2026-09-30[--<n>].<html|png>');
  });

  it("R1-P3 passes a later attempt's capture, named with --2 (data/tools/capture-name.mjs)", () => {
    const later = 'artifacts/prices/US/cpu-a--shop-us--2026-09-30--2.html';
    const r = build((m) => {
      us(m).observations[0].capture = later;
      m.captures[later] = m.captures[US_CAPTURE];
    }).run();
    expect(check(r, 'R1-P3')).toMatchObject({ failed: 0 });
  });

  it('R1-P3 fails an attempt suffix the naming rule never makes (--1, --02)', () => {
    for (const suffix of ['--1', '--02']) {
      const wrong = `artifacts/prices/US/cpu-a--shop-us--2026-09-30${suffix}.html`;
      const f = failing('R1-P3', (m) => {
        us(m).observations[0].capture = wrong;
        m.captures[wrong] = m.captures[US_CAPTURE];
      });
      expect(f).toEqual([expect.objectContaining({ row: US_KEY, field: 'capture', value: wrong })]);
    }
  });

  it('R1-P3 fails a capture that is missing under the evidence root', () => {
    const f = failing('R1-P3', (m) => delete m.captures[US_CAPTURE]);
    expect(f).toContainEqual(expect.objectContaining({ row: US_KEY, field: 'capture' }));
    expect(f.find((x) => x.field === 'capture').why).toMatch(/not found/);
  });

  it("R1-P3 fails a captureSha256 that is not the file's SHA-256", () => {
    const f = failing('R1-P3', (m) => (us(m).observations[0].captureSha256 = 'f'.repeat(64)));
    expect(f).toEqual([expect.objectContaining({ row: US_KEY, field: 'captureSha256' })]);
  });

  it('R1-P3 fails a capture the manifest leaves out or lists with another hash', () => {
    const missing = failing('R1-P3', (m) => (m.manifest[US_CAPTURE] = null));
    expect(missing).toEqual([expect.objectContaining({ row: US_KEY, field: 'capture' })]);
    expect(missing[0].why).toMatch(/manifest/);
    const other = failing('R1-P3', (m) => (m.manifest[US_CAPTURE] = 'e'.repeat(64)));
    expect(other).toEqual([expect.objectContaining({ row: US_KEY, field: 'captureSha256' })]);
    expect(other[0].why).toMatch(/manifest/);
  });

  it('R1-P3 does not consult a manifest when none is given', () => {
    const r = build((m) => (m.manifest[US_CAPTURE] = null)).run({ manifestPath: undefined });
    expect(check(r, 'R1-P3')).toMatchObject({ checked: 2, passed: 2, failed: 0 });
  });

  it('R1-P3 never reads a capture path that leaves the evidence root', () => {
    const f = failing('R1-P3', (m) => (us(m).observations[0].capture = '../../outside.html'));
    expect(f.map((x) => x.field)).toContain('capture');
  });

  it('R1-P3b lists an HTML capture without the product id as a manual check, not a failure', () => {
    const r = build((m) => {
      m.captures[US_CAPTURE].content = US_HTML.replaceAll('B0TESTUS01', 'B0OTHER001');
    }).run();
    expect(check(r, 'R1-P3b')).toMatchObject({ checked: 2, passed: 1, failed: 0, manual: 1 });
    expect(r.manual).toContainEqual(
      expect.objectContaining({ check: 'R1-P3b', row: US_KEY, value: 'B0TESTUS01' }),
    );
  });

  it('R1-P3b lists a search-page url as a manual check, never as "found"', () => {
    const r = build(
      (m) => (us(m).observations[0].url = 'https://www.shop-us.example/s?k=Test'),
    ).run();
    expect(check(r, 'R1-P3b')).toMatchObject({ checked: 2, passed: 1, manual: 1 });
    expect(r.manual).toContainEqual(expect.objectContaining({ check: 'R1-P3b', row: US_KEY }));
  });

  it('R1-P3b lists a capture whose canonical link names another product as a manual check', () => {
    const r = build((m) => {
      m.captures[US_CAPTURE].content = US_HTML.replace(
        'test-cpu-a/dp/B0TESTUS01',
        'other/dp/B0OTHER001',
      );
    }).run();
    const entry = r.manual.find((x) => x.check === 'R1-P3b');
    expect(entry).toMatchObject({ row: US_KEY });
    expect(entry.why).toMatch(/canonical/);
    expect(failuresOf(r, 'R1-P3b')).toEqual([]);
  });

  it('R1-P4 fails a retrievedAt outside the batch window', () => {
    const f = failing('R1-P4', (m) => (us(m).batch.windowStart = '2026-10-01'));
    expect(f).toEqual([expect.objectContaining({ row: US_KEY, field: 'retrievedAt' })]);
    expect(f[0].why).toMatch(/window/);
  });

  it('R1-P4 fails a retrievedAt after --today, and one that is not a real date', () => {
    const future = failing('R1-P4', () => {}, { today: '2026-09-29' });
    expect(future).toContainEqual(expect.objectContaining({ row: US_KEY, field: 'retrievedAt' }));
    expect(future.find((x) => x.row === US_KEY).why).toMatch(/after today/);
    const invalid = failing('R1-P4', (m) => (us(m).observations[0].retrievedAt = '2026-09-31'));
    expect(invalid).toContainEqual(
      expect.objectContaining({ row: 'US:cpu-a--shop-us--2026-09-31', field: 'retrievedAt' }),
    );
  });

  it('R1-P4 reads the capture time as a UTC date (23:59:59Z is still that day)', () => {
    const r = build((m) => {
      m.captures[US_CAPTURE].mtime = '2026-09-30T23:59:59.000Z';
      usLogOf(m).product.fetchedAtUtc = '2026-09-30T23:59:58.000Z';
    }).run();
    expect(failuresOf(r, 'R1-P4')).toEqual([]);
    expect(evidenceOf(r, US_KEY).fileTime).toEqual({ status: 'match', value: '2026-09-30' });
  });

  it('R1-P4 fails when the capture file was written on another UTC day', () => {
    const r = build((m) => (m.captures[US_CAPTURE].mtime = '2026-10-01T00:00:05.000Z')).run();
    const f = failuresOf(r, 'R1-P4');
    expect(f).toEqual([expect.objectContaining({ row: US_KEY, field: 'retrievedAt' })]);
    expect(f[0].why).toMatch(/modification time/);
    expect(evidenceOf(r, US_KEY).fileTime).toEqual({ status: 'mismatch', value: '2026-10-01' });
  });

  it('R1-P4 fails when the matching log line fetched the product page on another day', () => {
    const r = build((m) => (usLogOf(m).product.fetchedAtUtc = '2026-10-01T00:00:01.000Z')).run();
    const f = failuresOf(r, 'R1-P4');
    expect(f).toEqual([expect.objectContaining({ row: US_KEY, field: 'retrievedAt' })]);
    expect(f[0].why).toMatch(/runner log/);
    expect(evidenceOf(r, US_KEY).log).toMatchObject({ status: 'mismatch', value: '2026-10-01' });
  });

  it('R1-P4 compares the load time a saved page records about itself (pageLoadTimestampUTC)', () => {
    const stamped = (iso) =>
      US_HTML.replace(
        '</body>',
        `<input type="hidden" name="pageLoadTimestampUTC" value="${iso}"></body>`,
      );
    const ok = build((m) => {
      m.captures[US_CAPTURE].content = stamped('2026-09-30T20:15:10.651284903Z');
    }).run();
    expect(failuresOf(ok, 'R1-P4')).toEqual([]);
    expect(evidenceOf(ok, US_KEY).pageTime).toEqual({
      status: 'match',
      value: '2026-09-30',
      timestamp: '2026-09-30T20:15:10.651284903Z',
    });
    expect(evidenceOf(ok, SA_KEY).pageTime).toEqual({
      status: 'none',
      value: null,
      timestamp: null,
    });
    const late = build((m) => {
      m.captures[US_CAPTURE].content = stamped('2026-10-01T00:00:01.000000000Z');
    }).run();
    const f = failuresOf(late, 'R1-P4');
    expect(f).toEqual([expect.objectContaining({ row: US_KEY, field: 'retrievedAt' })]);
    expect(f[0].why).toMatch(/pageLoadTimestampUTC/);
    expect(evidenceOf(late, US_KEY).pageTime).toMatchObject({
      status: 'mismatch',
      value: '2026-10-01',
    });
  });

  it('R1-P4 uses the product-page fetch time, never the search time', () => {
    const r = build((m) => (usLogOf(m).searchFetchedAtUtc = '2026-09-29T23:59:00.000Z')).run();
    expect(failuresOf(r, 'R1-P4')).toEqual([]);
    expect(evidenceOf(r, US_KEY).log).toMatchObject({ status: 'match', value: '2026-09-30' });
  });

  it('R1-P4 matches the log line with the row url among several attempts for the part', () => {
    const r = build((m) => {
      const other = usLog();
      other.productUrl = 'https://www.shop-us.example/dp/B0OTHER001';
      other.product.url = other.productUrl;
      other.product.finalUrl = other.productUrl;
      other.product.fetchedAtUtc = '2026-09-29T10:00:00.000Z';
      m.logs['results-US.jsonl'].unshift(other);
    }).run();
    expect(failuresOf(r, 'R1-P4')).toEqual([]);
    expect(evidenceOf(r, US_KEY).log).toMatchObject({
      status: 'match',
      ref: 'artifacts/prices/results-US.jsonl:2',
    });
  });

  it('R1-P4 uses the fetch closest to the capture time when the same url was fetched twice', () => {
    const r = build((m) => {
      const refetch = usLog();
      refetch.product.fetchedAtUtc = '2026-10-01T08:00:00.000Z';
      m.logs['results-US.jsonl'].push(refetch);
    }).run();
    expect(evidenceOf(r, US_KEY).log).toMatchObject({
      status: 'match',
      matches: 2,
      ref: 'artifacts/prices/results-US.jsonl:1',
    });
  });

  it('R1-P4 uses the latest fetch of the url when the capture file is missing', () => {
    const r = build((m) => {
      delete m.captures[US_CAPTURE];
      const older = usLog();
      older.product.fetchedAtUtc = '2026-09-29T10:00:00.000Z';
      m.logs['results-US.jsonl'].unshift(older);
    }).run();
    expect(evidenceOf(r, US_KEY).log).toMatchObject({
      status: 'match',
      value: '2026-09-30',
      ref: 'artifacts/prices/results-US.jsonl:2',
    });
  });

  it('R1-P4 matches a log url that differs only in www., a trailing slash or the query', () => {
    const r = build((m) => {
      const line = usLogOf(m);
      line.productUrl = 'https://shop-us.example/dp/B0TESTUS01/';
      line.product.url = line.productUrl;
      line.product.finalUrl = `${line.productUrl}?th=1`;
    }).run();
    expect(evidenceOf(r, US_KEY).log).toMatchObject({ status: 'match', normalisedUrl: true });
  });

  it('R1-P4 records a row with no matching log line as "none" and a warning, not a failure', () => {
    const r = build((m) => (m.logs = {})).run();
    expect(failuresOf(r, 'R1-P4')).toEqual([]);
    expect(evidenceOf(r, US_KEY).log).toMatchObject({ status: 'none' });
    expect(r.warnings).toContainEqual(expect.objectContaining({ check: 'R1-P4', row: US_KEY }));
  });

  it('R1-P6a lists an amount the page does not show as a manual check, not a failure', () => {
    const r = build((m) => (us(m).observations[0].amount = 1234.57)).run();
    expect(check(r, 'R1-P6a')).toMatchObject({ checked: 2, passed: 1, failed: 0, manual: 1 });
    expect(r.manual).toContainEqual(
      expect.objectContaining({ check: 'R1-P6a', row: US_KEY, value: 1234.57 }),
    );
    expect(r.suspects).toEqual([]);
  });

  it('R1-P6a lists a row priced like the search snippet, but not on the product page, as a suspect', () => {
    const r = build((m) => {
      m.captures[US_CAPTURE].content = US_HTML.replace('1,234', '1,199').replace('>56<', '>00<');
      usLogOf(m).product.info.price = '$1,199.00';
    }).run();
    expect(r.suspects).toEqual([
      expect.objectContaining({
        check: 'R1-P6a',
        row: US_KEY,
        amount: 1234.56,
        searchPrice: 1234.56,
      }),
    ]);
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ check: 'R1-P6a', row: US_KEY, value: '$1,199.00' }),
    );
    expect(failuresOf(r, 'R1-P6a')).toEqual([]);
  });

  it('R1-P6a lists a screenshot capture as a manual check; R1-P3b skips it', () => {
    const png = 'artifacts/prices/US/cpu-a--shop-us--2026-09-30.png';
    const r = build((m) => {
      us(m).observations[0].capture = png;
      m.captures[png] = { content: PNG_BYTES, mtime: '2026-09-30T20:15:21.000Z' };
      delete m.captures[US_CAPTURE];
      usLogOf(m).capture = png;
    }).run();
    expect(failuresOf(r, 'R1-P3')).toEqual([]);
    expect(check(r, 'R1-P3b')).toMatchObject({ checked: 1, passed: 1 });
    const entry = r.manual.find((x) => x.check === 'R1-P6a' && x.row === US_KEY);
    expect(entry.why).toMatch(/screenshot/);
  });
});

const usGap = (m) => us(m).gaps[0];
const US_GAP = 'US:gap:cpu-b';

describe('gap records and coverage: R1-G1 to R1-G5, R1-C1', () => {
  it('passes both gap records of the clean fixture and covers every purchasable part', () => {
    const r = build().run();
    for (const id of ['R1-G1', 'R1-G2', 'R1-G3', 'R1-G4', 'R1-G5']) {
      expect(check(r, id), id).toMatchObject({ checked: 2, passed: 2, failed: 0 });
    }
    // cpu-a and cpu-b in two markets; the GPU chip is not sold, so it is not counted.
    expect(check(r, 'R1-C1')).toMatchObject({ checked: 4, passed: 4, failed: 0 });
    expect(r.coverage.US).toEqual({ parts: 2, priced: 1, gapped: 1, both: 0, neither: [] });
    expect(r.coverage.SA).toEqual({ parts: 2, priced: 1, gapped: 1, both: 0, neither: [] });
  });

  it('R1-G1 fails a gap with an empty reason or no reasonCode', () => {
    for (const reason of ['', '   ']) {
      const f = failing('R1-G1', (m) => (usGap(m).reason = reason));
      expect(f).toEqual([expect.objectContaining({ row: US_GAP, field: 'reason' })]);
    }
    const code = failing('R1-G1', (m) => delete usGap(m).reasonCode);
    expect(code).toEqual([expect.objectContaining({ row: US_GAP, field: 'reasonCode' })]);
  });

  it('R1-G1 only warns about a reasonCode outside the known list', () => {
    const r = build((m) => (usGap(m).reasonCode = 'gone')).run();
    expect(failuresOf(r, 'R1-G1')).toEqual([]);
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ check: 'R1-G1', row: US_GAP, field: 'reasonCode', value: 'gone' }),
    );
  });

  it('R1-G2 fails an empty list, and any id that is not a retailer selling in the market', () => {
    const empty = failing('R1-G2', (m) => (usGap(m).retailersTried = []));
    expect(empty).toEqual([expect.objectContaining({ row: US_GAP, field: 'retailersTried' })]);
    for (const [id, why] of [
      ['shop-sa', /US/],
      ['maker', /manufacturer/],
      ['nobody', /publishers\.json/],
    ]) {
      const f = failing('R1-G2', (m) => usGap(m).retailersTried.push(id));
      expect(f, id).toEqual([expect.objectContaining({ row: US_GAP, value: id })]);
      expect(f[0].why, id).toMatch(why);
    }
    const notList = failing('R1-G2', (m) => (usGap(m).retailersTried = 'shop-us'));
    expect(notList).toEqual([expect.objectContaining({ field: 'retailersTried' })]);
  });

  it('R1-G3 fails a checkedAt after today, outside the batch window, or not a real date', () => {
    const future = failing('R1-G3', (m) => (usGap(m).checkedAt = '2026-10-02'));
    expect(future.map((x) => x.why).join(' ')).toMatch(/after today/);
    const outside = failing('R1-G3', (m) => (usGap(m).checkedAt = '2026-09-29'));
    expect(outside).toEqual([expect.objectContaining({ row: US_GAP, field: 'checkedAt' })]);
    expect(outside[0].why).toMatch(/window/);
    const invalid = failing('R1-G3', (m) => (usGap(m).checkedAt = 'yesterday'));
    expect(invalid).toEqual([expect.objectContaining({ row: US_GAP, field: 'checkedAt' })]);
  });

  it('R1-G4 fails a part that has both a price and a gap in one market', () => {
    const f = failing('R1-G4', (m) => us(m).gaps.push(gap('cpu-a', 'US', ['shop-us'])));
    expect(f).toEqual([expect.objectContaining({ row: 'US:gap:cpu-a', field: 'partId' })]);
  });

  it('R1-G5 fails a gap for a part that does not exist or is not sold', () => {
    const unknown = failing('R1-G5', (m) => (usGap(m).partId = 'cpu-z'));
    expect(unknown).toEqual([expect.objectContaining({ row: 'US:gap:cpu-z', field: 'partId' })]);
    const chip = failing('R1-G5', (m) => (usGap(m).partId = 'chip-a'));
    expect(chip[0].why).toMatch(/gpu-chip/);
  });

  it('R1-C1 fails a purchasable part with neither a price nor a gap in a market, and lists it', () => {
    const r = build((m) => (us(m).gaps = [])).run();
    expect(failuresOf(r, 'R1-C1')).toEqual([
      expect.objectContaining({ row: 'US:coverage:cpu-b', field: 'partId', value: 'cpu-b' }),
    ]);
    expect(r.coverage.US).toEqual({ parts: 2, priced: 1, gapped: 0, both: 0, neither: ['cpu-b'] });
  });

  it("warns about a gap whose market is not its file's market", () => {
    const r = build((m) => sa(m).gaps.push(gap('cpu-z', 'US', ['shop-us']))).run();
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ row: 'US:gap:cpu-z', field: 'market', value: 'US' }),
    );
  });
});

const ARCHIVED_CHART = 'https://img.rev-a.example/review/chip-a/chart.png';
const snapshot = (ts, original = ARCHIVED_CHART) => `https://web.archive.org/web/${ts}/${original}`;

describe('benchmarks: R1-B1 to R1-B6', () => {
  it('passes the clean game and creator rows, and counts nulls the rules allow', () => {
    const r = build().run();
    for (const id of ['R1-B1', 'R1-B2', 'R1-B3', 'R1-B5', 'R1-B6']) {
      expect(check(r, id), id).toMatchObject({ checked: 3, passed: 3, failed: 0 });
    }
    // Only rows with an archived source are in scope for R1-B4.
    expect(check(r, 'R1-B4')).toMatchObject({ checked: 2, passed: 2, failed: 0 });
    expect(r.conditionNulls).toEqual({
      game: { withNote: {}, withoutNote: {}, allowedByRule: { 'upscaling.mode (native)': 1 } },
      creator: {
        withNote: {},
        withoutNote: {},
        allowedByRule: { 'backend (Cinebench)': 1, 'testSystem (aggregate set)': 1 },
      },
    });
  });

  it("R1-B1 fails an archive link as url, plain http, a host off the publisher's domains, and forums", () => {
    for (const [url, why] of [
      [snapshot('20260507101500', 'https://www.rev-a.example/review/chip-a/4'), /archive/],
      ['http://www.rev-a.example/review/chip-a/4', /https/],
      ['https://www.other-site.example/review/chip-a/4', /rev-a\.example/],
      ['https://www.reddit.com/r/hardware/comments/abc/chip_a_review/', /forum/],
      ['https://www.rev-a.example/forums/threads/chip-a-review.123/', /forum/],
    ]) {
      const f = failing('R1-B1', (m) => (game(m).sources[0].url = url));
      expect(f.length, url).toBeGreaterThan(0);
      expect(
        f.every((x) => x.row === GAME_ID && x.field === 'sources[0].url'),
        url,
      ).toBe(true);
      expect(f.map((x) => x.why).join(' '), url).toMatch(why);
    }
  });

  it('R1-B1 fails a row without sources', () => {
    const f = failing('R1-B1', (m) => (blender(m).sources = []));
    expect(f).toEqual([expect.objectContaining({ row: BLENDER_ID, field: 'sources' })]);
  });

  it('R1-B2 fails a source whose publisher is not a reviewer or benchmark database, and names it', () => {
    const maker = failing('R1-B2', (m) => {
      game(m).sources[0] = { ...game(m).sources[0], url: 'https://www.maker.example/chip-a' };
      game(m).sources[0].publisher = 'maker';
    });
    expect(maker).toEqual([
      expect.objectContaining({ row: GAME_ID, field: 'sources[0].publisher', value: 'maker' }),
    ]);
    expect(maker[0].why).toMatch(/manufacturer/);
    const unknown = failing('R1-B2', (m) => (game(m).sources[0].publisher = 'nobody'));
    expect(unknown[0].why).toMatch(/publishers\.json/);
  });

  it('R1-B3 fails a missing publishedAt, one after a source retrievedAt or today, and a non-date', () => {
    const missing = failing('R1-B3', (m) => delete game(m).publishedAt);
    expect(missing).toEqual([expect.objectContaining({ row: GAME_ID, field: 'publishedAt' })]);
    const afterRetrieval = failing('R1-B3', (m) => (game(m).publishedAt = '2026-10-01'));
    expect(afterRetrieval.map((x) => x.why).join(' ')).toMatch(/retrievedAt/);
    const future = failing('R1-B3', (m) => (game(m).publishedAt = '2026-10-02'));
    expect(future.map((x) => x.why).join(' ')).toMatch(/after today/);
    const invalid = failing('R1-B3', (m) => (game(m).publishedAt = '2026-13-01'));
    expect(invalid).toEqual([expect.objectContaining({ row: GAME_ID, field: 'publishedAt' })]);
  });

  it('R1-B4 fails a Wayback link that is not the plan form, or embeds another url', () => {
    for (const [archiveUrl, why] of [
      [snapshot('2026050710'), /14/],
      [snapshot('20260507101500im_'), /flag/],
      [snapshot('20260507101500', 'https://img.rev-a.example/review/chip-a/other.png'), /original/],
      ['', /form/],
    ]) {
      const f = failing('R1-B4', (m) => (game(m).sources[1].archiveUrl = archiveUrl));
      expect(f, archiveUrl).toEqual([
        expect.objectContaining({ row: GAME_ID, field: 'sources[1].archiveUrl' }),
      ]);
      expect(f[0].why, archiveUrl).toMatch(why);
    }
  });

  it('R1-B4 fails a snapshot before publishedAt or after the source retrievedAt', () => {
    const early = failing(
      'R1-B4',
      (m) => (game(m).sources[1].archiveUrl = snapshot('20260505101500')),
    );
    expect(early).toEqual([expect.objectContaining({ field: 'sources[1].archiveUrl' })]);
    expect(early[0].why).toMatch(/publishedAt/);
    const late = failing(
      'R1-B4',
      (m) => (game(m).sources[1].archiveUrl = snapshot('20261001000000')),
    );
    expect(late).toEqual([expect.objectContaining({ field: 'sources[1].archiveUrl' })]);
    expect(late[0].why).toMatch(/retrievedAt/);
  });

  it('R1-B4 only warns when the embedded url equals url after normalising scheme, www. and slash', () => {
    const r = build((m) => {
      game(m).sources[1].archiveUrl = snapshot(
        '20260507101500',
        'http://www.img.rev-a.example/review/chip-a/chart.png/',
      );
    }).run();
    expect(failuresOf(r, 'R1-B4')).toEqual([]);
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ check: 'R1-B4', row: GAME_ID, field: 'sources[1].archiveUrl' }),
    );
  });

  it('R1-B5 fails frame generation and conditions that are missing, empty or null with no note', () => {
    for (const [mutate, field, why] of [
      [(m) => (game(m).frameGeneration = 'on'), 'frameGeneration', /off/],
      [(m) => (game(m).gameVersion = null), 'gameVersion', /note/],
      [
        (m) => (game(m).upscaling = { method: 'DLSS', mode: null, version: null }),
        'upscaling.mode',
        /note/,
      ],
      [(m) => delete game(m).resolution, 'resolution', /missing/],
      [(m) => (game(m).preset = ''), 'preset', /empty/],
      [(m) => (game(m).testSystem.gpu.card = null), 'testSystem.gpu.card', /note/],
      [(m) => (blender(m).aggregate = null), 'testSystem', /aggregate/],
      [(m) => (blender(m).backend = null), 'backend', /note/],
      [(m) => delete cinebench(m).appVersion, 'appVersion', /missing/],
    ]) {
      const f = failing('R1-B5', mutate);
      expect(f, field).toEqual([expect.objectContaining({ field })]);
      expect(f[0].why, field).toMatch(why);
    }
  });

  it('R1-B5 passes a null condition explained by a note on that field or a parent, and counts it', () => {
    const r = build((m) => {
      game(m).gameVersion = null;
      game(m).testSystem.gpuDriver = null;
      game(m).notes.push({ field: 'gameVersion', text: 'Not stated.' });
      game(m).notes.push({ field: 'testSystem', text: 'The bench lists no GPU driver.' });
    }).run();
    expect(failuresOf(r, 'R1-B5')).toEqual([]);
    expect(r.conditionNulls.game.withNote).toEqual({ gameVersion: 1, 'testSystem.gpuDriver': 1 });
  });

  it('R1-B5 counts a null condition without a note separately from one with a note', () => {
    const r = build((m) => (game(m).gameVersion = null)).run();
    expect(r.conditionNulls.game.withoutNote).toEqual({ gameVersion: 1 });
    expect(r.conditionNulls.game.withNote).toEqual({});
  });

  it('R1-B6 fails a source retrievedAt after today or not a real date', () => {
    const future = failing('R1-B6', (m) => (blender(m).sources[0].retrievedAt = '2026-10-02'));
    expect(future).toEqual([
      expect.objectContaining({ row: BLENDER_ID, field: 'sources[0].retrievedAt' }),
    ]);
    const invalid = failing('R1-B6', (m) => (blender(m).sources[0].retrievedAt = 'soon'));
    expect(invalid).toEqual([expect.objectContaining({ field: 'sources[0].retrievedAt' })]);
  });
});

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'rule1.mjs');
const ALL_IDS = [
  'R1-P1',
  'R1-P2',
  'R1-P3',
  'R1-P3b',
  'R1-P4',
  'R1-P5',
  'R1-P6a',
  'R1-P7',
  'R1-G1',
  'R1-G2',
  'R1-G3',
  'R1-G4',
  'R1-G5',
  'R1-C1',
  'R1-B1',
  'R1-B2',
  'R1-B3',
  'R1-B4',
  'R1-B5',
  'R1-B6',
];
const cli = (fx, extra = [], { today = TODAY } = {}) =>
  spawnSync(
    process.execPath,
    [
      CLI,
      '--data-dir',
      fx.dataDir,
      '--evidence-root',
      fx.evidenceRoot,
      '--manifest',
      fx.manifestPath,
      ...(today ? ['--today', today] : []),
      ...extra,
    ],
    { encoding: 'utf8' },
  );

describe('CLI', () => {
  it('exits 0 on the clean fixture, prints a totals table, and writes every check id to --json', () => {
    const fx = build();
    const out = path.join(fx.root, 'out', 'rule1.json');
    const run = cli(fx, ['--json', out]);
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    for (const id of ALL_IDS) expect(run.stdout).toMatch(new RegExp(`^${id}\\s+\\d+`, 'm'));
    const report = JSON.parse(readFileSync(out, 'utf8'));
    expect(report.checks.map((c) => c.id)).toEqual(ALL_IDS);
    expect(report.checks.find((c) => c.id === 'R1-P1')).toMatchObject({
      checked: 2,
      passed: 2,
      failed: 0,
    });
    expect(report).toMatchObject({ today: TODAY, exitCode: 0, failures: [] });
    expect(report.inputs.manifest).toMatchObject({ entries: 2 });
  });

  it('exits 1 when any check fails, and prints the failing row', () => {
    const run = cli(build((m) => (usGap(m).reason = '')));
    expect(run.status).toBe(1);
    expect(run.stdout).toMatch(/R1-G1\s+US:gap:cpu-b/);
  });

  it('keeps exit 0 when there are only warnings and manual checks', () => {
    const png = 'artifacts/prices/US/cpu-a--shop-us--2026-09-30.png';
    const fx = build((m) => {
      us(m).observations[0].capture = png;
      m.captures[png] = { content: PNG_BYTES, mtime: '2026-09-30T20:15:21.000Z' };
      delete m.captures[US_CAPTURE];
      usGap(m).reasonCode = 'gone';
    });
    const out = path.join(fx.root, 'rule1.json');
    const run = cli(fx, ['--json', out]);
    expect(run.status).toBe(0);
    const report = JSON.parse(readFileSync(out, 'utf8'));
    expect(report.manual.length).toBeGreaterThan(0);
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  it("defaults --today to today's UTC date", () => {
    const fx = build();
    const out = path.join(fx.root, 'rule1.json');
    const before = new Date().toISOString().slice(0, 10);
    const run = cli(fx, ['--json', out], { today: null });
    const after = new Date().toISOString().slice(0, 10);
    expect(run.status).toBe(0);
    expect([before, after]).toContain(JSON.parse(readFileSync(out, 'utf8')).today);
  });

  it('exits 2 on bad input', () => {
    const fx = build();
    const cases = [
      [[CLI], /--data-dir/],
      [[CLI, '--data-dir', fx.dataDir], /--evidence-root/],
      [[CLI, '--data-dir', fx.dataDir, '--evidence-root', fx.evidenceRoot, '--bogus'], /bogus/],
      [
        [
          CLI,
          '--data-dir',
          fx.dataDir,
          '--evidence-root',
          fx.evidenceRoot,
          '--today',
          '2026-13-01',
        ],
        /--today/,
      ],
      [
        [CLI, '--data-dir', fx.evidenceRoot, '--evidence-root', fx.evidenceRoot],
        /publishers\.json/,
      ],
      [[CLI, '--data-dir', fx.dataDir, '--evidence-root', fx.dataDir], /artifacts/],
    ];
    for (const [args, why] of cases) {
      const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
      expect(run.status, args.join(' ')).toBe(2);
      expect(run.stderr, args.join(' ')).toMatch(why);
    }
    const badJson = build((m) => (m.prices['us.json'] = '{ "market": "US", '));
    expect(cli(badJson).stderr).toMatch(/us\.json is not valid JSON/);
    expect(cli(badJson).status).toBe(2);
    const badManifest = build();
    writeFileSync(badManifest.manifestPath, 'this is not sha256sum output\n');
    expect(cli(badManifest).status).toBe(2);
    expect(cli(badManifest).stderr).toMatch(/manifest/);
  });
});
