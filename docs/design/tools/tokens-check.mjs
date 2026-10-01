// End-to-end check of src/styles/tokens.css in the real pipeline (WP-DS1):
//
// 1. Builds a specimen page with Vite and @tailwindcss/vite, wired the way docs/design/tokens.md tells
//    build-lead to wire the app, and checks that the font's url() is rewritten to a hashed asset.
// 2. Serves the build, renders it in Chromium (dark and light, 1440 and 390) and saves screenshots.
// 3. Measures that both variable axes work, calibrates the fallback face's size-adjust on Rig Lab's own
//    text (every visible string of the Studio mock, shaped by Chromium), and measures how far text moves
//    when the web font replaces the fallback, compared with plain Arial.
//
//   node docs/design/tools/tokens-check.mjs
//
// Output: artifacts/screenshots/phase-0/WP-DS1/tokens/ (git-ignored): screenshots, report.json and
// compiled.css (the specimen's generated CSS).
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { chromium } from 'playwright';
import { build } from 'vite';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TMP = join(REPO, 'artifacts', 'tmp', 'tokens-check');
const DIST = join(TMP, 'dist');
const OUT = join(REPO, 'artifacts', 'screenshots', 'phase-0', 'WP-DS1', 'tokens');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

// The app's entry, as build-lead will write it (src/app/app.css), with source detection limited to the specimen.
writeFileSync(
  join(TMP, 'app.css'),
  `@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import '../../../src/styles/tokens.css';
@import 'tailwindcss/preflight.css' layer(base);
@import '../../../src/styles/base.css' layer(base);
@import 'tailwindcss/utilities.css' layer(utilities) source(none);
@source './index.html';
`,
);

const icon = {
  ok: '<svg class="size-4 shrink-0" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="9" r="7"/><path d="M5.8 9.2l2.2 2.2 4.3-4.6"/></svg>',
  warn: '<svg class="size-4 shrink-0" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2.5l7 12.3H2z"/><path d="M9 7.2v3.4M9 12.9v.1"/></svg>',
  block: '<svg class="size-4 shrink-0" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="9" r="7"/><path d="M4.1 13.9l9.8-9.8"/></svg>',
};
const roles = [
  ['type-display', 'Processor'],
  ['type-figure', '96–108 <span class="type-unit text-ink-3">fps</span>'],
  ['type-wordmark', 'Rig Lab'],
  ['type-heading', 'Processors'],
  ['type-label', 'Ryzen 7 9800X3D'],
  ['type-body', 'The camera is on the socket. Pick a chip and it seats in place.'],
  ['type-name', 'AMD Ryzen 7 9800X3D <span class="text-ink-2">SAR 1,899</span>'],
  ['type-control', 'Fastest in my games'],
  ['type-small', 'May need a BIOS update before first boot. Your board can update without a CPU installed.'],
  ['type-caption', 'Prices as of 30 Sep 2026. Illustrative values, not data.'],
];
const swatches = ['stage', 'stage-floor', 'surface', 'surface-raised', 'line', 'ink', 'ink-2', 'ink-3', 'ok', 'warn', 'block', 'action', 'focus', 'scene-light'];

writeFileSync(
  join(TMP, 'index.html'),
  `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rig Lab tokens specimen</title>
<link rel="preload" href="/src/styles/fonts/rig-lab-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="./app.css">
</head>
<body class="bg-stage">
<main class="mx-auto grid max-w-[90rem] gap-6 p-gutter md:p-inset lg:grid-cols-[minmax(0,1fr)_theme(--spacing-rail)]">
  <section class="grid content-start gap-4" aria-labelledby="roles">
    <p class="type-wordmark">Rig Lab <span class="type-caption text-ink-3">Token specimen, WP-DS1, direction C (Studio)</span></p>
    <h1 id="roles" class="type-display">Type roles</h1>
    <dl class="grid gap-3">
      ${roles.map(([cls, text]) => `<div class="grid gap-1 border-t border-line pt-3 md:grid-cols-[9rem_minmax(0,1fr)] md:items-baseline"><dt class="type-caption text-ink-3">${cls}</dt><dd class="${cls}" data-role="${cls}">${text}</dd></div>`).join('\n      ')}
    </dl>
    <p class="type-body text-ink-2">Every number is set in tabular figures: <span class="type-name">SAR 9,412</span>, <span class="type-name">SAR 1,111</span>. Links in text stay underlined: <a href="#sources">Sources</a>.</p>
    <p class="type-body overflow-hidden"><span class="whitespace-nowrap" data-measure="line">AMD Ryzen 7 9800X3D, 8 cores, 5.2 GHz, 120 W. Draws up to 230 W under all-core load, so your 120 mm air cooler will run loud in long renders. Fits your build.</span></p>
    <p class="type-body" aria-hidden="true" style="overflow: hidden; height: 0"><span class="whitespace-nowrap" data-measure="corpus"></span></p>
    <p class="type-body w-70 text-ink-2" data-measure="narrow">AMD Ryzen 7 9800X3D, 8 cores, 5.2 GHz, 120 W. Draws up to 230 W under all-core load, so your 120 mm air cooler will run loud in long renders. Fits your build.</p>
  </section>
  <aside class="grid content-start gap-3 rounded-panel border border-line bg-surface p-4 shadow-float" aria-labelledby="rail">
    <h2 id="rail" class="type-heading">Processors <span class="type-caption text-ink-3">Illustrative values, not data</span></h2>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="h-chip rounded-pill border border-line px-3 type-control text-ink-2">Fits my build</button>
      <button type="button" aria-pressed="true" class="h-chip rounded-pill border border-ink-3 bg-surface-raised px-3 type-control text-ink">Fastest in my games</button>
    </div>
    <div class="grid gap-1 rounded-row bg-surface-raised p-3">
      <div class="flex justify-between gap-3"><span class="type-name">AMD Ryzen 7 9800X3D</span><span class="type-name">SAR 1,899</span></div>
      <div class="type-small text-ink-3">8 cores, 5.2 GHz, 120 W</div>
      <div class="flex items-center gap-1.5 type-small text-warn">${icon.warn}Fits, with a warning</div>
      <div class="type-small text-ink-2">May need a BIOS update before first boot. Your board can update without a CPU installed. <span class="whitespace-nowrap text-ink-3">Rule bios-min-version</span></div>
    </div>
    <div class="grid gap-1 rounded-row p-3">
      <div class="flex justify-between gap-3"><span class="type-name">AMD Ryzen 7 7800X3D</span><span class="type-name">SAR 1,549</span></div>
      <div class="flex items-center gap-1.5 type-small text-ok">${icon.ok}Fits your build</div>
    </div>
    <div class="grid gap-1 rounded-row p-3">
      <div class="flex justify-between gap-3"><span class="type-name text-ink-2">Intel Core Ultra 7 265K</span><span class="type-name text-ink-3">SAR 1,199</span></div>
      <div class="flex items-center gap-1.5 type-small text-block">${icon.block}Incompatible</div>
      <div class="type-small text-ink-2">Needs an LGA1851 board. Your board is AM5. <span class="whitespace-nowrap text-ink-3">Rule socket-match</span></div>
    </div>
    <div class="flex items-center justify-between gap-3 border-t border-line pt-3">
      <span class="type-figure">9,412 <span class="type-unit text-ink-3">SAR</span></span>
      <button type="button" id="next" class="h-control rounded-pill bg-action px-5 type-name text-action-ink">Next: Motherboard</button>
    </div>
    <ul class="grid grid-cols-7 gap-1" role="list" aria-label="Colour roles">
      ${swatches.map((s) => `<li class="grid gap-1"><span class="block h-8 rounded-control border border-line bg-${s}"></span><span class="type-caption text-ink-3">${s}</span></li>`).join('')}
    </ul>
  </aside>
</main>
</body>
</html>
`,
);

// 1. Build with the real Vite + Tailwind plugin.
await build({
  configFile: false,
  root: REPO,
  base: '/',
  logLevel: 'warn',
  plugins: [tailwindcss()],
  build: { outDir: DIST, emptyOutDir: true, assetsInlineLimit: 0, rolldownOptions: { input: join(TMP, 'index.html') } },
});
const files = [];
const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : files.push(join(d, e.name))));
walk(DIST);
const html = files.find((f) => f.endsWith('index.html'));
const cssFile = files.find((f) => f.endsWith('.css'));
const fontFile = files.find((f) => f.endsWith('.woff2'));
const css = readFileSync(cssFile, 'utf8');
writeFileSync(join(OUT, 'compiled.css'), css);
const fontUrl = '/' + relative(DIST, fontFile).split('\\').join('/');
const builtHtml = readFileSync(html, 'utf8');
const report = {
  vite: {
    css: relative(REPO, cssFile),
    cssBytes: css.length,
    font: relative(REPO, fontFile),
    fontBytes: readFileSync(fontFile).length,
    fontIdenticalToSource: readFileSync(fontFile).equals(readFileSync(join(REPO, 'src/styles/fonts/rig-lab-sans.woff2'))),
    cssReferencesHashedFont: css.includes(`url(${fontUrl})`),
    preloadRewrittenToSameAsset: builtHtml.includes(`href="${fontUrl}"`),
    defaultPaletteLeft: /--color-(red|blue|purple|gray)-/.test(css),
  },
};

// 2. Serve the build and render it.
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = url === '/' ? html : join(DIST, url);
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
}).listen(0);
const origin = `http://127.0.0.1:${server.address().port}`;
const page = '/' + relative(DIST, html).split('\\').join('/');
const browser = await chromium.launch();
const errors = [];
// Rig Lab's own text: everything visible in the chosen direction's mock.
const corpus = await (async () => {
  const tab = await browser.newPage();
  await tab.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await tab.goto('file://' + join(REPO, 'docs/design/mocks/studio/index.html'));
  const text = await tab.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
  await tab.close();
  return text;
})();

async function open(width, theme, { blockFont = false, plainArial = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 2 });
  const tab = await context.newPage();
  tab.on('pageerror', (e) => errors.push(e.message));
  tab.on('console', (m) => m.type() === 'error' && !blockFont && errors.push(m.text()));
  if (blockFont) await tab.route('**/*.woff2', (r) => r.abort());
  await tab.goto(origin + page, { waitUntil: 'networkidle' });
  await tab.evaluate(async ([t, arial, text]) => {
    document.querySelector('[data-measure="corpus"]').textContent = text;
    document.documentElement.dataset.theme = t;
    if (arial) document.documentElement.style.setProperty('--font-sans', 'Arial, "Liberation Sans", sans-serif');
    await document.fonts.ready;
  }, [theme, plainArial, corpus]);
  return { context, tab };
}

const measure = (tab) =>
  tab.evaluate(() => {
    const box = (el) => { const r = el.getBoundingClientRect(); return { w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
    const text = (sel) => { const el = document.querySelector(sel); const r = document.createRange(); r.selectNodeContents(el); return +r.getBoundingClientRect().width.toFixed(2); };
    // Where the first baseline sits below the top of the role's box: an empty inline-block's bottom
    // edge is on the baseline. Equal values mean the ascent and descent overrides hold the text still.
    const baseline = (el) => {
      const probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      el.prepend(probe);
      const y = probe.getBoundingClientRect().bottom - el.getBoundingClientRect().top;
      probe.remove();
      return +y.toFixed(2);
    };
    return {
      line: box(document.querySelector('[data-measure="line"]')).w,
      corpus: box(document.querySelector('[data-measure="corpus"]')).w,
      narrow: box(document.querySelector('[data-measure="narrow"]')).h,
      roles: Object.fromEntries([...document.querySelectorAll('[data-role]')].map((el) => [el.dataset.role, box(el)])),
      baselines: Object.fromEntries([...document.querySelectorAll('[data-role]')].map((el) => [el.dataset.role, baseline(el)])),
      displayWidth: text('[data-role="type-display"]'),
      fontsLoaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.stretch}`),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });

for (const [width, theme] of [390, 768, 1440].flatMap((w) => [[w, 'dark'], [w, 'light']])) {
  const { context, tab } = await open(width, theme);
  await tab.keyboard.press('Tab'); // focus the first button, to show the focus ring
  await tab.screenshot({ path: join(OUT, `specimen-${width}-${theme}.png`), fullPage: true });
  report[`render-${width}-${theme}`] = await measure(tab);
  await context.close();
}

// 3. Axes and the swap. Same text, same width, three font situations.
{
  const { context, tab } = await open(1440, 'dark');
  report.axes = await tab.evaluate(() => {
    const el = document.querySelector('[data-role="type-display"]');
    const w = () => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
    const out = {};
    for (const [k, css] of Object.entries({ 'wdth 125 wght 300': ['125%', '300'], 'wdth 100 wght 300': ['100%', '300'], 'wdth 125 wght 600': ['125%', '600'] })) {
      el.style.fontStretch = css[0]; el.style.fontWeight = css[1]; out[k] = +w().toFixed(2);
    }
    return out;
  });
  await context.close();
}
const webFont = report['render-1440-dark'];
const fallback = await (async () => { const { context, tab } = await open(1440, 'dark', { blockFont: true }); const m = await measure(tab); await context.close(); return m; })();
const arial = await (async () => { const { context, tab } = await open(1440, 'dark', { blockFont: true, plainArial: true }); const m = await measure(tab); await context.close(); return m; })();
const pct = (a, b) => +(((a - b) / b) * 100).toFixed(2);
// size-adjust makes the fallback as wide as the web font; the overrides keep the web font's line box.
// 109 and 32: Rig Lab Sans's ascent and descent in % of the em (hhea, typo and win agree; MVAR does
// not vary them). docs/design/tools/calibrate-fallback.mjs gets the same values from the font files.
const ratio = webFont.corpus / arial.corpus;
const declared = (name) => Number(readFileSync(join(REPO, 'src/styles/tokens.css'), 'utf8').match(new RegExp(`${name}: ([\\d.]+)%`))[1]);
// Headless Linux Chromium lays out with whole-pixel advances, so a few per cent of size-adjust change
// nothing there. Windows (DirectWrite) and macOS use fractional advances, and the browser can check.
const fractionalAdvances = [webFont.corpus, fallback.corpus, arial.corpus].some((w) => !Number.isInteger(w));
report.calibration = {
  corpus: `${corpus.length} characters of the Studio mock, set in type-body (width 100, weight 400)`,
  browser: `Chromium ${browser.version()} on ${process.platform}`,
  fractionalAdvances,
  webFontWidth: webFont.corpus,
  fallbackWidth: fallback.corpus,
  plainArialWidth: arial.corpus,
  recommended: { sizeAdjust: +(ratio * 100).toFixed(2), ascentOverride: +(109 / ratio).toFixed(2), descentOverride: +(32 / ratio).toFixed(2), lineGapOverride: 0 },
  declared: { sizeAdjust: declared('size-adjust'), ascentOverride: declared('ascent-override'), descentOverride: declared('descent-override') },
  fallbackVsWebFontPct: pct(fallback.corpus, webFont.corpus),
  plainArialVsWebFontPct: pct(arial.corpus, webFont.corpus),
};
report.calibration.ok = fractionalAdvances
  ? Math.abs(report.calibration.fallbackVsWebFontPct) <= 0.5
  : 'not measurable here (whole-pixel advances); use calibrate-fallback.mjs';
report.baselines = {
  note: 'First baseline below the top of each role box, in px at 1440. The fallback should match the web font.',
  ...Object.fromEntries(Object.keys(webFont.baselines).map((k) => [k, { webFont: webFont.baselines[k], fallback: fallback.baselines[k], plainArial: arial.baselines[k] }])),
};
report.swap = {
  note: 'type-body at 1440 px: one unwrapped line (width) and the same text in a 280 px column (height). Positive = wider or taller than with the web font.',
  fallbackFacesLoaded: fallback.fontsLoaded,
  webFont: { lineWidth: webFont.line, columnHeight: webFont.narrow },
  sizeAdjustedFallback: { lineWidth: fallback.line, widthDiffPct: pct(fallback.line, webFont.line), columnHeight: fallback.narrow, heightDiffPx: +(fallback.narrow - webFont.narrow).toFixed(2) },
  plainArial: { lineWidth: arial.line, widthDiffPct: pct(arial.line, webFont.line), columnHeight: arial.narrow, heightDiffPx: +(arial.narrow - webFont.narrow).toFixed(2) },
  rolesTallerWithFallback: Object.keys(webFont.roles).filter((k) => fallback.roles[k].h !== webFont.roles[k].h),
  rolesTallerWithPlainArial: Object.keys(webFont.roles).filter((k) => arial.roles[k].h !== webFont.roles[k].h),
};
report.errors = errors;
await browser.close();
server.close();
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, (k, v) => (k === 'roles' ? undefined : v), 1));
