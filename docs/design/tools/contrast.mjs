// WCAG 2.1 contrast check for the three WP-DS0 mocks, measured on the tokens each mock actually uses.
// Reads the :root[data-theme="dark"] and :root[data-theme="light"] custom properties from
// docs/design/mocks/<slug>/index.html, then checks every declared foreground/background pair.
//
//   node docs/design/tools/contrast.mjs            -> markdown tables on stdout
//   node docs/design/tools/contrast.mjs --check    -> exit 1 if any pair fails its threshold
//
// Thresholds (WCAG 2.1): text 4.5:1 (1.4.3), large text 3:1 (1.4.3), non-text UI and graphics 3:1 (1.4.11).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mocks = join(here, '..', 'mocks');

function tokens(html, theme) {
  const re = theme === 'dark' ? /:root, :root\[data-theme="dark"\] \{([\s\S]*?)\n\}/ : /:root\[data-theme="light"\] \{([\s\S]*?)\n\}/;
  const m = html.match(re);
  if (!m) throw new Error('no ' + theme + ' token block');
  const out = {};
  for (const t of m[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[t[1]] = t[2].trim();
  return out;
}
function rgba(v) {
  v = v.trim();
  let m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
  m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(',').map((x) => parseFloat(x)); return [p[0], p[1], p[2], p[3] ?? 1]; }
  throw new Error('unsupported colour ' + v);
}
const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// kind: text (4.5), large (3), ui (3). bg may be "token" or "token+overlay" (overlay composited on token).
const PAIRS = {
  bench: [
    ['ink', 'panel', 'text', 'primary text'], ['ink-2', 'panel', 'text', 'secondary text'], ['ink-3', 'panel', 'text', 'labels, units, meta'],
    ['ink', 'panel-raised', 'text', 'text on selected row'], ['ink-2', 'panel-raised', 'text', 'secondary on selected row'], ['ink-3', 'panel-raised', 'text', 'meta on selected row'],
    ['ink-3', 'panel-sunk', 'text', 'placeholder in inputs'],
    ['ok', 'panel', 'text', 'Compatible label'], ['warn', 'panel', 'text', 'Warning label'], ['block', 'panel', 'text', 'Incompatible label'],
    ['ok', 'panel-raised', 'text', 'Compatible on selected row'],
    ['btn-ink', 'btn-bg', 'text', 'primary button'], ['bench', 'ink', 'text', 'pressed segment (SAR/USD)'],
    ['trace', 'panel', 'ui', 'measurement trace, range edges'], ['ink-3', 'panel', 'ui', 'checkbox border'], ['focus', 'panel', 'ui', 'focus ring'],
    ['ink', 'panel', 'ui', 'selected-row bar'],
  ],
  folio: [
    ['ink', 'paper', 'text', 'primary text'], ['ink-2', 'paper', 'text', 'brief, verdicts'], ['ink-3', 'paper', 'text', 'labels, notes, units'],
    ['ink', 'raise', 'text', 'text on selected row'], ['ink-2', 'raise', 'text', 'verdict on selected row'], ['ink-3', 'raise', 'text', 'meta on selected row'],
    ['ink-2', 'plate', 'text', 'text on the plate backdrop'], ['ink-3', 'plate', 'text', 'label on the plate backdrop'],
    ['cite', 'paper', 'text', 'footnote markers, note numbers'],
    ['ok', 'paper', 'text', 'Fits label'], ['warn', 'paper', 'text', 'Warning label'], ['block', 'paper', 'text', 'Incompatible label'], ['ok', 'raise', 'text', 'Fits on selected row'],
    ['btn-ink', 'btn-bg', 'text', 'primary button'],
    ['ink-3', 'paper', 'ui', 'checkbox border'], ['focus', 'paper', 'ui', 'focus ring'], ['ink', 'paper', 'ui', 'FPS range bracket'],
  ],
  studio: [
    ['ink', 'panel', 'text', 'primary text'], ['ink-2', 'panel', 'text', 'secondary text'], ['ink-3', 'panel', 'text', 'meta, units'],
    ['ink', 'panel-2', 'text', 'text on selected row'], ['ink-2', 'panel-2', 'text', 'secondary on selected row'], ['ink-3', 'panel-2', 'text', 'meta on selected row'],
    ['ink', 'wall', 'text', 'heading on the stage'], ['ink-2', 'wall', 'text', 'hint on the stage'], ['ink-3', 'wall', 'text', 'step label on the stage'],
    ['ink-2', 'wall+key', 'text', 'hint where the key light is brightest'], ['ink-3', 'wall+key', 'text', 'label where the key light is brightest'],
    ['ok', 'panel', 'text', 'Fits label'], ['warn', 'panel', 'text', 'Warning label'], ['block', 'panel', 'text', 'Incompatible label'], ['ok', 'panel-2', 'text', 'Fits on selected row'],
    ['cta-ink', 'cta', 'text', 'primary button, pressed pill'],
    ['ink-3', 'panel', 'ui', 'checkbox border'], ['focus', 'panel', 'ui', 'focus ring'], ['focus', 'wall', 'ui', 'focus ring on the stage'], ['ink', 'panel-2', 'ui', 'selected-row bar'],
  ],
};
const MIN = { text: 4.5, large: 3, ui: 3 };

const check = process.argv.includes('--check');
let failures = 0;
const lines = [];
for (const [slug, pairs] of Object.entries(PAIRS)) {
  const html = readFileSync(join(mocks, slug, 'index.html'), 'utf8');
  const t = { dark: tokens(html, 'dark'), light: tokens(html, 'light') };
  lines.push(`\n#### ${slug}: contrast (WCAG 2.1)\n`);
  lines.push('| Foreground | Background | Use | Kind | Dark | Light |');
  lines.push('|---|---|---|---|---|---|');
  for (const [fg, bgSpec, kind, use] of pairs) {
    const cells = [];
    for (const theme of ['dark', 'light']) {
      const T = t[theme];
      const [bgName, overlay] = bgSpec.split('+');
      if (!(fg in T) || !(bgName in T)) throw new Error(`${slug}/${theme}: missing token ${fg} or ${bgName}`);
      let bg = rgba(T[bgName]);
      if (overlay) bg = over(rgba(T[overlay]), bg);
      const f = over(rgba(T[fg]), bg);
      const r = ratio(f, bg);
      const ok = r >= MIN[kind];
      if (!ok) failures++;
      cells.push(`${r.toFixed(2)}:1 ${ok ? 'pass' : '**FAIL**'}`);
    }
    lines.push(`| \`--${fg}\` | \`--${bgSpec.replace('+', ' + --')}\` | ${use} | ${kind} (${MIN[kind]}:1) | ${cells[0]} | ${cells[1]} |`);
  }
}
console.log(lines.join('\n'));
console.log(`\n${failures === 0 ? 'All pairs pass.' : failures + ' pair(s) fail.'}`);
if (check && failures) process.exit(1);
