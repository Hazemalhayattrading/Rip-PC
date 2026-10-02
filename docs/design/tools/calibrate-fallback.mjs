// Fallback-face calibration for Rig Lab Sans (WP-DS1), from the font files alone. No browser lays the
// text out and nothing is rounded to pixels, so the result is the same on every platform.
//
// 1. Rig Lab's own text: every visible string of the chosen direction's mock (Studio), read with
//    Chromium the way tokens-check.mjs reads it.
// 2. Shapes it with HarfBuzz, the shaper Chromium uses, in the shipped woff2 and in Arial, with the
//    features the browser applies: HarfBuzz's defaults (kern, liga, calt and the rest) plus tnum,
//    because every type role sets tabular figures.
// 3. size-adjust = Rig Lab Sans width / Arial width, at the body role (width 100, weight 400): the
//    text that wraps, and so the text whose width decides layout shift. The ascent, descent and
//    line-gap overrides give the scaled fallback Rig Lab Sans's own line metrics. Overrides are
//    scaled by size-adjust (CSS Fonts 5, size-adjust), so each is divided by it.
//
// harfbuzzjs and wawoff2 are not project dependencies. Install them outside the repo:
//   npm install --prefix <dir> harfbuzzjs@1.6.2 wawoff2@2.0.1
//   node docs/design/tools/calibrate-fallback.mjs --modules <dir>/node_modules [--arial <file>] [--json <out>]
// --arial defaults to Arial on Windows and macOS, or Liberation Sans (Arial's widths) on Linux.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const modules = arg('modules');
if (!modules) throw new Error('Pass --modules <dir>/node_modules (see the header of this file).');
const load = async (name) => import(pathToFileURL(createRequire(join(modules, 'x.js')).resolve(name)).href);
const hb = await load('harfbuzzjs');
const wawoff2 = (await load('wawoff2')).default;

const WOFF2 = join(REPO, 'src/styles/fonts/rig-lab-sans.woff2');
const TOKENS = join(REPO, 'src/styles/tokens.css');
const pick = (list) => list.find((f) => existsSync(f));
const ARIAL = arg('arial') ?? pick(['C:/Windows/Fonts/arial.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', '/usr/share/fonts/liberation-sans/LiberationSans-Regular.ttf']);
const ARIAL_BOLD = pick([ARIAL.replace(/arial\.ttf$/i, 'arialbd.ttf'), ARIAL.replace(/Arial\.ttf$/, 'Arial Bold.ttf'), ARIAL.replace('Regular', 'Bold')].filter((f) => f !== ARIAL));

// Rig Lab's own text, line by line, as Chromium renders the mock.
const browser = await chromium.launch();
const tab = await browser.newPage();
await tab.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await tab.goto(pathToFileURL(join(REPO, 'docs/design/mocks/studio/index.html')).href);
const innerText = await tab.evaluate(() => document.body.innerText);
await browser.close();
const lines = innerText.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
const corpus = innerText.replace(/\s+/g, ' ').trim();

// sfnt tables: line metrics straight from the files.
function sfnt(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = {};
  for (let i = 0, n = v.getUint16(4); i < n; i++) {
    const r = 12 + i * 16;
    tables[String.fromCharCode(...bytes.subarray(r, r + 4))] = v.getUint32(r + 8);
  }
  const { head, hhea, 'OS/2': os2 } = tables;
  return {
    tables: Object.keys(tables),
    upem: v.getUint16(head + 18),
    hhea: { ascender: v.getInt16(hhea + 4), descender: v.getInt16(hhea + 6), lineGap: v.getInt16(hhea + 8) },
    typo: { ascender: v.getInt16(os2 + 68), descender: v.getInt16(os2 + 70), lineGap: v.getInt16(os2 + 72) },
    win: { ascent: v.getUint16(os2 + 74), descent: v.getUint16(os2 + 76) },
    useTypoMetrics: Boolean(v.getUint16(os2 + 62) & (1 << 7)),
  };
}

function shaper(bytes) {
  const face = new hb.Face(new hb.Blob(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
  const font = new hb.Font(face);
  return (text, variations = []) => {
    font.setVariations(variations.map(([tag, value]) => new hb.Variation(tag, value)));
    const buffer = new hb.Buffer();
    buffer.addText(text);
    buffer.guessSegmentProperties();
    hb.shape(font, buffer, [new hb.Feature('tnum', 1)]);
    const glyphs = buffer.getGlyphInfos();
    const width = buffer.getGlyphPositions().reduce((sum, p) => sum + p.xAdvance, 0) / face.upem;
    return { width, missing: glyphs.filter((g) => g.codepoint === 0).length };
  };
}

const rigLabBytes = await wawoff2.decompress(readFileSync(WOFF2));
const rigLab = shaper(rigLabBytes);
const arial = shaper(readFileSync(ARIAL));
const arialBold = ARIAL_BOLD ? shaper(readFileSync(ARIAL_BOLD)) : undefined;
const metrics = sfnt(rigLabBytes);

// Type roles as tokens.css sets them: [role, wdth, wght].
const ROLES = [
  ['body, small, caption, unit (the calibration target)', 100, 400],
  ['name, control', 100, 500],
  ['heading, label', 112.5, 600],
  ['display, figure', 125, 300],
  ['wordmark', 125, 600],
];
const body = rigLab(corpus, [['wdth', 100], ['wght', 400]]);
const plainArial = arial(corpus);
const ratio = body.width / plainArial.width;
const sizeAdjust = Math.round(ratio * 10000) / 100;
const scale = sizeAdjust / 100;
const declared = (name) => Number(readFileSync(TOKENS, 'utf8').match(new RegExp(`${name}: ([\\d.]+)%`))[1]);
const before = declared('size-adjust');
const pct = (fallback, web) => Math.round(((fallback - web) / web) * 10000) / 100;
const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

// Per string: how far one ratio is from each line of the mock that is long enough to wrap, at the
// body role. Short strings (a unit, an arrow) only move what follows them on the same line.
const LONG = 20;
const perLine = lines
  .filter((l) => l.length >= LONG)
  .map((l) => ({ text: l, errorPct: pct(arial(l).width * scale, rigLab(l, [['wdth', 100], ['wght', 400]]).width) }));
const absPerLine = perLine.map((l) => Math.abs(l.errorPct));

const { upem } = metrics;
const line = metrics.useTypoMetrics ? metrics.typo : { ascender: metrics.hhea.ascender, descender: metrics.hhea.descender, lineGap: metrics.hhea.lineGap };
const report = {
  inputs: {
    corpus: `${corpus.length} characters, ${lines.length} lines: every visible string of docs/design/mocks/studio/index.html`,
    webFont: 'src/styles/fonts/rig-lab-sans.woff2 (decompressed with wawoff2)',
    fallback: ARIAL,
    shaper: 'harfbuzzjs 1.6.2: HarfBuzz default features plus tnum',
    missingGlyphs: { rigLabSans: body.missing, arial: plainArial.missing },
  },
  widthsInEm: { rigLabSansBody: +body.width.toFixed(3), arial: +plainArial.width.toFixed(3) },
  lineMetrics: { ...metrics, tables: undefined, mvar: metrics.tables.includes('MVAR') },
  result: {
    sizeAdjust: `${sizeAdjust}%`,
    ascentOverride: `${(Math.round((line.ascender / upem / scale) * 10000) / 100).toFixed(2)}%`,
    descentOverride: `${(Math.round((-line.descender / upem / scale) * 10000) / 100).toFixed(2)}%`,
    lineGapOverride: `${(Math.round((line.lineGap / upem / scale) * 10000) / 100).toFixed(2)}%`,
  },
  bodyWidthError: {
    note: 'The fallback (Arial at size-adjust) against Rig Lab Sans, the whole corpus at the body role. Positive = the fallback is wider.',
    plainArial: `${pct(plainArial.width, body.width)}%`,
    declaredBefore: `${pct(plainArial.width * (before / 100), body.width)}% (size-adjust ${before}%)`,
    calibrated: `${pct(plainArial.width * scale, body.width)}% (size-adjust ${sizeAdjust}%)`,
  },
  perLineAtCalibratedBody: {
    lines: `${perLine.length} of ${lines.length} lines have ${LONG} or more characters`,
    medianAbsPct: quantile(absPerLine, 0.5),
    p90AbsPct: quantile(absPerLine, 0.9),
    maxAbsPct: Math.max(...absPerLine),
    worst: [...perLine].sort((a, b) => Math.abs(b.errorPct) - Math.abs(a.errorPct)).slice(0, 3),
  },
  otherRolesWithTheSameFallback: Object.fromEntries(
    ROLES.slice(1).map(([role, wdth, wght]) => {
      const web = rigLab(corpus, [['wdth', wdth], ['wght', wght]]).width;
      const row = { arialRegular: `${pct(plainArial.width * scale, web)}%` };
      if (arialBold && wght >= 600) row.arialBoldUnscaled = `${pct(arialBold(corpus).width, web)}%`;
      return [`${role} (wdth ${wdth}, wght ${wght})`, row];
    }),
  ),
};
const out = arg('json');
if (out) writeFileSync(out, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
