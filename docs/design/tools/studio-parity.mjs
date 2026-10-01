// Before and after for WP-DS1, and proof that the shipped tokens reproduce the picked look.
//
// Renders the Studio mock three ways, at 390, 768 and 1440, dark and light:
//   before  the mock as Hazem picked it (commit 3fe5978), with its own inline tokens and Mona Sans;
//   mock    the mock today (with the BIOS warnings), with its own inline tokens and Mona Sans;
//   after   the mock today, with its inline tokens replaced by src/styles/tokens.css and its font
//           by the self-hosted Rig Lab Sans.
// Then it compares "mock" with "after" pixel by pixel: the only change between them is the tokens
// and the font file, so any difference is something the tokens do not reproduce.
//
//   node docs/design/tools/studio-parity.mjs
//
// Mona Sans comes from artifacts/cache/fonts/ (the SHA-256 in src/styles/fonts/FONTLOG.txt), not
// from Google Fonts, so the run is offline and repeatable. Output, git-ignored:
// artifacts/screenshots/phase-0/WP-DS1/parity/{before,after,mock,diff}/ and parity.json.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { compile } from 'tailwindcss';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'artifacts', 'screenshots', 'phase-0', 'WP-DS1', 'parity');
const TMP = join(REPO, 'artifacts', 'tmp', 'parity');
const PICKED = '3fe5978'; // director: record Hazem's design pick, C Studio
for (const d of ['before', 'mock', 'after', 'diff']) mkdirSync(join(OUT, d), { recursive: true });
mkdirSync(TMP, { recursive: true });

// The full Mona Sans the mock loads from Google Fonts, from the pinned cache.
const MONA = readFileSync(join(REPO, 'artifacts/cache/fonts/MonaSans[wdth,wght].ttf'));
const MONA_SHA = 'fd6e79634b5ae804a45aac7e2e3c2a325b41291fba59034f4732b0135b8475b3';
if (createHash('sha256').update(MONA).digest('hex') !== MONA_SHA) throw new Error('cached Mona Sans does not match FONTLOG.txt');

// The shipped tokens, compiled by the installed Tailwind with nothing else: no Preflight, no
// utilities, so the mock's own component CSS is untouched. The woff2 is inlined.
const require = createRequire(import.meta.url);
const styles = join(REPO, 'src/styles');
const loadStylesheet = async (id, base) => {
  const file = id.startsWith('.') ? join(base, id) : require.resolve(id);
  return { path: file, base: dirname(file), content: await readFile(file, 'utf8') };
};
const compiler = await compile("@layer theme;\n@import 'tailwindcss/theme.css' layer(theme);\n@import './tokens.css';", { base: styles, loadStylesheet });
const woff2 = readFileSync(join(styles, 'fonts/rig-lab-sans.woff2')).toString('base64');
const tokensCss = compiler.build([]).replace("url('./fonts/rig-lab-sans.woff2')", `url(data:font/woff2;base64,${woff2})`);
if (!tokensCss.includes('data:font/woff2')) throw new Error('the font url in tokens.css changed; update this tool');

// The mock's names for the tokens. Names the two share (--ink, --ok, --focus, ...) need no alias.
const ALIAS = {
  wall: 'stage', floor: 'stage-floor', 'floor-2': 'stage-floor-deep', key: 'stage-key',
  panel: 'surface', 'panel-2': 'surface-raised', edge: 'line', cta: 'action', 'cta-ink': 'action-ink',
  rgb: 'scene-light', shadow: 'elevation-float',
};
const SHARED = ['ink', 'ink-2', 'ink-3', 'ok', 'warn', 'block', 'focus'];

/** The mock today, with its token blocks replaced by the shipped tokens. */
function onShippedTokens(html) {
  const art = { dark: [], light: [] }; // the placeholder drawing's own colours (--c-*) are art, not tokens
  let out = html.replace(/(:root, :root\[data-theme="dark"\]|:root\[data-theme="light"\]) \{([^}]*)\}\n/g, (_, selector, body) => {
    const theme = selector.includes('light') ? 'light' : 'dark';
    for (const [, name, value] of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
      if (name in ALIAS || SHARED.includes(name)) continue;
      art[theme].push(`--${name}: ${value.trim()};`);
    }
    return '';
  });
  const aliases = Object.entries(ALIAS).map(([mock, token]) => `--${mock}: var(--${token});`).join(' ');
  const injected = `<style>${tokensCss}</style>\n<style>\n:root { ${aliases} ${art.dark.join(' ')} }\n:root[data-theme="light"] { ${art.light.join(' ')} }\n</style>\n`;
  out = out.replace(/<link rel="preconnect"[^>]*>\n/g, '').replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\n/, injected);
  out = out.replace('font-family: "Mona Sans", system-ui, sans-serif;', 'font-family: var(--font-sans);');
  if (out.includes('Mona Sans') || !out.includes(injected)) throw new Error('the mock changed shape; update this tool');
  return out;
}

const mockNow = readFileSync(join(REPO, 'docs/design/mocks/studio/index.html'), 'utf8');
const pages = {
  before: execFileSync('git', ['show', `${PICKED}:docs/design/mocks/studio/index.html`], { cwd: REPO, encoding: 'utf8' }),
  mock: mockNow,
  after: onShippedTokens(mockNow),
};
for (const [name, html] of Object.entries(pages)) writeFileSync(join(TMP, `${name}.html`), html);

const SHOTS = [390, 768, 1440].flatMap((w) => ['dark', 'light'].map((theme) => ({
  name: `${w}-${theme}`, w, theme, h: { 390: 844, 768: 1024, 1440: 900 }[w], dpr: w === 390 ? 3 : 2, mobile: w === 390,
})));
const browser = await chromium.launch();
const report = { picked: PICKED, shots: {} };
for (const s of SHOTS) {
  const row = {};
  for (const variant of Object.keys(pages)) {
    const context = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.dpr, isMobile: s.mobile, hasTouch: s.mobile, reducedMotion: 'reduce' });
    const tab = await context.newPage();
    const errors = [];
    tab.on('pageerror', (e) => errors.push(e.message));
    tab.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    // Google Fonts, answered offline with the pinned Mona Sans; nothing else leaves the machine.
    await tab.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: "@font-face { font-family: 'Mona Sans'; font-weight: 300 600; font-stretch: 100% 125%; font-display: swap; src: url(https://fonts.gstatic.com/pinned/MonaSans.ttf) format('truetype'); }" }));
    await tab.route('https://fonts.gstatic.com/**', (r) => r.fulfill({ contentType: 'font/ttf', headers: { 'access-control-allow-origin': '*' }, body: MONA }));
    await tab.goto(`${pathToFileURL(join(TMP, `${variant}.html`)).href}?theme=${s.theme}`, { waitUntil: 'networkidle' });
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForTimeout(700);
    const fonts = await tab.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))]);
    const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    // The box of every element that holds text of its own, in document order.
    const boxes = await tab.evaluate(() => [...document.body.querySelectorAll('*')]
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && el.getClientRects().length)
      .map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    await tab.screenshot({ path: join(OUT, variant, `${s.name}.png`) });
    row[variant] = { fontsLoaded: fonts, horizontalOverflowPx: overflow, errors, boxes };
    await context.close();
  }

  // Pixel comparison, mock against after. A pixel differs if any channel moves by more than 8 of 255.
  const raw = async (variant) => sharp(join(OUT, variant, `${s.name}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [a, b] = [await raw('mock'), await raw('after')];
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw new Error(`${s.name}: sizes differ`);
  const diff = Buffer.alloc(a.data.length);
  let differing = 0;
  let maxDelta = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const delta = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    maxDelta = Math.max(maxDelta, delta);
    const grey = Math.round((a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3 / 3);
    if (delta > 8) { differing++; diff.set([255, 0, 64, 255], i); } else diff.set([grey, grey, grey, 255], i);
  }
  await sharp(diff, { raw: { width: a.info.width, height: a.info.height, channels: 4 } }).png().toFile(join(OUT, 'diff', `${s.name}.png`));
  const pixels = a.data.length / 4;
  // Layout: does any text box move or change height (a re-wrap), and by how much do widths drift?
  const [ba, bb] = [row.mock.boxes, row.after.boxes];
  if (ba.length !== bb.length) throw new Error(`${s.name}: ${ba.length} text boxes against ${bb.length}`);
  const moved = ba.filter((box, i) => Math.abs(box[1] - bb[i][1]) > 0.5 || Math.abs(box[3] - bb[i][3]) > 0.5).length;
  const maxWidthDrift = Math.max(...ba.map((box, i) => Math.abs(box[2] - bb[i][2])));
  const maxXDrift = Math.max(...ba.map((box, i) => Math.abs(box[0] - bb[i][0])));
  row.mockVsAfter = {
    pixels, differing, differingPct: +((differing / pixels) * 100).toFixed(3), maxChannelDelta: maxDelta,
    textBoxes: ba.length, textBoxesMovedOrRewrapped: moved, maxTextWidthDriftPx: +maxWidthDrift.toFixed(2), maxTextXDriftPx: +maxXDrift.toFixed(2),
  };
  for (const variant of Object.keys(pages)) delete row[variant].boxes;
  report.shots[s.name] = row;
  const m = row.mockVsAfter;
  console.log(`${s.name}: ${m.differingPct}% of pixels differ; text boxes moved or re-wrapped ${m.textBoxesMovedOrRewrapped} of ${m.textBoxes}; max width drift ${m.maxTextWidthDriftPx} px, max x drift ${m.maxTextXDriftPx} px; errors ${Object.values(row).flatMap((v) => v.errors ?? []).length}`);
}
await browser.close();
writeFileSync(join(OUT, 'parity.json'), JSON.stringify(report, null, 1));
