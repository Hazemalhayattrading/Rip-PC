// Builds and checks the Engine lab mock (WP-DS2, docs/design/lab-spec.md):
//
// 1. Builds docs/design/mocks/lab/ with Vite and @tailwindcss/vite, through the app's own CSS wiring,
//    so every utility the spec names must exist in Tailwind 4 with Rig Lab's tokens.
// 2. Serves the build and shoots it at 390, 768 and 1440, dark and light (full page), plus a
//    forced-colours shot and a 4x close-up of the status chips and the confidence mark.
// 3. Records, per shot: console errors, horizontal page overflow, the fonts that loaded, axe-core
//    violations (QA's tags plus wcag22aa), and the longest reason line in characters.
//
//   node docs/design/tools/lab-mock.mjs
//
// Output: artifacts/screenshots/phase-1/WP-DS2/lab-mock/ (git-ignored): PNGs and report.json.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import tailwindcss from '@tailwindcss/vite';
import { chromium } from 'playwright';
import { build } from 'vite';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const MOCK = join(REPO, 'docs', 'design', 'mocks', 'lab');
const DIST = join(REPO, 'artifacts', 'tmp', 'lab-mock', 'dist');
const OUT = join(REPO, 'artifacts', 'screenshots', 'phase-1', 'WP-DS2', 'lab-mock');
rmSync(DIST, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const BASE = '/lab-mock/';
await build({
  configFile: false,
  root: MOCK,
  base: BASE,
  logLevel: 'warn',
  plugins: [tailwindcss()],
  build: { outDir: DIST, emptyOutDir: true, assetsInlineLimit: 0 },
});
const files = [];
const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : files.push(join(d, e.name))));
walk(DIST);
const cssFile = files.find((f) => f.endsWith('.css'));
const css = readFileSync(cssFile, 'utf8');

// Every class the mock uses must have compiled: a missing utility means the spec names one that
// does not exist. Arbitrary values are matched by their escaped form.
const html = readFileSync(join(MOCK, 'index.html'), 'utf8');
const classes = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean));
const escape = (c) => c.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
const ignored = new Set(['group']); // a marker class with no CSS of its own
const missing = [...classes].filter((c) => !ignored.has(c) && !css.includes('.' + escape(c)));

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!url.startsWith(BASE)) return res.writeHead(404).end();
  const file = join(DIST, url.slice(BASE.length) || 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
}).listen(0);
const origin = `http://127.0.0.1:${server.address().port}`;

const SHOTS = [
  { name: '1440-dark', w: 1440, h: 900, theme: 'dark' },
  { name: '1440-light', w: 1440, h: 900, theme: 'light' },
  { name: '768-dark', w: 768, h: 1024, theme: 'dark' },
  { name: '768-light', w: 768, h: 1024, theme: 'light' },
  { name: '390-dark', w: 390, h: 844, theme: 'dark', mobile: true },
  { name: '390-light', w: 390, h: 844, theme: 'light', mobile: true },
];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const browser = await chromium.launch();
const report = { built: relative(REPO, cssFile), cssBytes: css.length, classesUsed: classes.size, missingClasses: missing, shots: {} };

async function open(s, extra = {}) {
  const context = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.dpr ?? 2, isMobile: !!s.mobile, hasTouch: !!s.mobile, ...extra });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(`${origin}${BASE}index.html?theme=${s.theme}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return { context, page, errors };
}

for (const s of SHOTS) {
  const { context, page, errors } = await open(s);
  const facts = await page.evaluate(() => {
    // Characters per rendered line of each reason: group the characters by their line box.
    const lines = [];
    for (const p of document.querySelectorAll('[data-measure="reason"]')) {
      const text = p.textContent;
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      const tops = new Map();
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (let i = 0; i < node.length; i++) {
          const r = document.createRange();
          r.setStart(node, i);
          r.setEnd(node, i + 1);
          const rect = r.getClientRects()[0];
          if (!rect) continue;
          const top = Math.round(rect.top);
          tops.set(top, (tops.get(top) ?? 0) + 1);
        }
      }
      lines.push({ text: text.slice(0, 48) + '…', lines: tops.size, longestLine: Math.max(...tops.values()) });
    }
    const fonts = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.stretch}`);
    // The round theme toggle: drawn at 36 px; on touch screens its hit area reaches 44 px
    // (QA-P1-003, backlog item 4). Probe 3 px outside each edge of the drawn circle's box.
    const toggle = document.querySelector('[data-theme-toggle]');
    const r = toggle.getBoundingClientRect();
    const probes = [[r.left - 3, r.top + r.height / 2], [r.right + 3, r.top + r.height / 2], [r.left + r.width / 2, r.top - 3], [r.left + r.width / 2, r.bottom + 3]];
    const hits = probes.filter(([x, y]) => toggle.contains(document.elementFromPoint(x, y))).length;
    return {
      toggle: { drawnPx: Math.round(r.width), coarsePointer: matchMedia('(pointer: coarse)').matches, edgesHitAt3pxOutside: hits },
      horizontalOverflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      fontsLoaded: [...new Set(fonts)],
      reasons: lines,
      theme: document.documentElement.dataset.theme,
    };
  });
  const axe = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  await page.screenshot({ path: join(OUT, `${s.name}.png`), fullPage: true });
  // Close crops for review at a readable scale: the first results list, and the readouts.
  await page.locator('main ol').first().screenshot({ path: join(OUT, `${s.name}-results.png`) });
  await page.locator('#estimate-h ~ div').first().screenshot({ path: join(OUT, `${s.name}-readouts.png`) });
  report.shots[s.name] = {
    ...facts,
    errors,
    axe: { violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')) })), incomplete: axe.incomplete.map((v) => v.id), passes: axe.passes.length },
  };
  console.log(`${s.name}: overflow=${facts.horizontalOverflowPx}px fonts=${facts.fontsLoaded.length} errors=${errors.length} axe=${axe.violations.length} longest reason line=${Math.max(...facts.reasons.map((r) => r.longestLine))} chars`);
  await context.close();
}

// Forced colours (Windows High Contrast), dark, 1440: the chips, the mark and the panel edges must survive.
{
  const { context, page } = await open({ w: 1440, h: 900, theme: 'dark' }, { forcedColors: 'active' });
  await page.screenshot({ path: join(OUT, '1440-forced-colors.png'), fullPage: true });
  await context.close();
}

// A 4x close-up of the six status chips and the three confidence marks, in both themes.
for (const theme of ['dark', 'light']) {
  const { context, page } = await open({ w: 760, h: 320, theme, dpr: 4 });
  await page.evaluate(() => {
    const chip = (cls, icon, word) => `<span class="inline-flex items-center gap-1.5 type-small whitespace-nowrap ${cls}"><svg class="size-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#${icon}" /></svg>${word}</span>`;
    const mark = (n) => `<span class="inline-flex items-center gap-1.5 type-small text-ink-2"><svg class="h-1 w-10" viewBox="0 0 40 4" aria-hidden="true">${[0, 14, 28].map((x, i) => (i < n ? `<rect x="${x}" y="0" width="12" height="4" rx="2" fill="currentColor"/>` : `<rect x="${x + 0.5}" y="0.5" width="11" height="3" rx="1.5" fill="none" stroke="currentColor" stroke-width="1"/>`)).join('')}</svg>${['', 'Low', 'Medium', 'High'][n]} confidence</span>`;
    const main = document.querySelector('main');
    main.innerHTML = `<div id="sheet" class="rounded-panel border border-line bg-surface p-5" style="display:inline-grid;gap:16px">
      <div style="display:flex;flex-wrap:wrap;gap:24px">${chip('text-ok', 'i-ok', 'Passes')}${chip('text-warn', 'i-warn', 'Warning')}${chip('text-warn', 'i-unverified', "Can't verify")}${chip('text-block', 'i-block', 'Incompatible')}${chip('text-ink-3', 'i-none', 'Not checked')}${chip('text-ink-3', 'i-na', "Doesn't apply")}</div>
      <div style="display:flex;flex-wrap:wrap;gap:24px">${mark(3)}${mark(2)}${mark(1)}</div></div>`;
    document.querySelector('header').remove();
  });
  await page.locator('#sheet').screenshot({ path: join(OUT, `chips-4x-${theme}.png`) });
  await context.close();
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(`classes used: ${classes.size}, missing from the build: ${missing.length ? missing.join(' ') : 'none'}`);
await browser.close();
server.close();
