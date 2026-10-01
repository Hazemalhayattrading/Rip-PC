import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'tailwindcss';
import { beforeAll, describe, expect, it } from 'vitest';
import { delayMs, delaySeconds, durationMs, easing, motionSeconds } from './motion';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const require = createRequire(import.meta.url);
const tokensCss = readFileSync(path.join(here, 'tokens.css'), 'utf8');

// The Tailwind entry the tokens are built for (docs/design/tokens.md, "Wiring"). tokens.css is
// imported without a layer: Tailwind refuses @custom-variant and @utility inside a layer block.
const ENTRY = [
  '@layer theme, base, components, utilities;',
  "@import 'tailwindcss/theme.css' layer(theme);",
  "@import './tokens.css';",
  "@import 'tailwindcss/preflight.css' layer(base);",
  "@import './base.css' layer(base);",
  "@import 'tailwindcss/utilities.css' layer(utilities);",
].join('\n');

async function loadStylesheet(id: string, base: string) {
  const file = id.startsWith('.') ? path.resolve(base, id) : require.resolve(id);
  return { path: file, base: path.dirname(file), content: await readFile(file, 'utf8') };
}

// Utility -> a declaration it must generate (whitespace-normalised CSS).
const EXPECTED: Record<string, string> = {
  'bg-stage': '.bg-stage { background-color: var(--stage); }',
  'bg-surface': '.bg-surface { background-color: var(--surface); }',
  'bg-surface-raised': '.bg-surface-raised { background-color: var(--surface-raised); }',
  'border-line': '.border-line { border-color: var(--line); }',
  'text-ink': '.text-ink { color: var(--ink); }',
  'text-ink-2': '.text-ink-2 { color: var(--ink-2); }',
  'text-ink-3': '.text-ink-3 { color: var(--ink-3); }',
  'text-ok': '.text-ok { color: var(--ok); }',
  'text-warn': '.text-warn { color: var(--warn); }',
  'text-block': '.text-block { color: var(--block); }',
  'bg-action': '.bg-action { background-color: var(--action); }',
  'text-action-ink': '.text-action-ink { color: var(--action-ink); }',
  'outline-focus': '.outline-focus { outline-color: var(--focus); }',
  'bg-scrim': '.bg-scrim { background-color: var(--scrim); }',
  'bg-ink/10': 'color-mix(in oklab, var(--ink) 10%, transparent)',
  'shadow-float': '--tw-shadow: var(--elevation-float);',
  'shadow-overlay': '--tw-shadow: var(--elevation-overlay);',
  'rounded-control': '.rounded-control { border-radius: var(--radius-control); }',
  'rounded-row': '.rounded-row { border-radius: var(--radius-row); }',
  'rounded-panel': '.rounded-panel { border-radius: var(--radius-panel); }',
  'rounded-dock': '.rounded-dock { border-radius: var(--radius-dock); }',
  'rounded-pill': '.rounded-pill { border-radius: var(--radius-pill); }',
  'z-stage': '.z-stage { z-index: var(--z-stage); }',
  'z-stage-ui': '.z-stage-ui { z-index: var(--z-stage-ui); }',
  'z-chrome': '.z-chrome { z-index: var(--z-chrome); }',
  'z-rail': '.z-rail { z-index: var(--z-rail); }',
  'z-dock': '.z-dock { z-index: var(--z-dock); }',
  'z-topbar': '.z-topbar { z-index: var(--z-topbar); }',
  'z-sheet': '.z-sheet { z-index: var(--z-sheet); }',
  'z-toast': '.z-toast { z-index: var(--z-toast); }',
  'duration-ui': 'transition-duration: var(--dur-ui);',
  'duration-fade': 'transition-duration: var(--dur-fade);',
  'duration-exit': 'transition-duration: var(--dur-exit);',
  'duration-value': 'transition-duration: var(--dur-value);',
  'delay-value': '.delay-value { transition-delay: var(--delay-value); }',
  'ease-settle': 'transition-timing-function: var(--ease-settle);',
  'ease-dolly': 'transition-timing-function: var(--ease-dolly);',
  'w-rail': '.w-rail { width: var(--rail-width); }',
  'h-dock': '.h-dock { height: var(--dock); }',
  'h-topbar': '.h-topbar { height: var(--topbar); }',
  'p-gutter': '.p-gutter { padding: var(--gutter); }',
  'px-inset': '.px-inset { padding-inline: var(--inset); }',
  'h-control': '.h-control { height: var(--spacing-control); }',
  'size-control-sm':
    '.size-control-sm { width: var(--spacing-control-sm); height: var(--spacing-control-sm); }',
  'h-chip': '.h-chip { height: var(--spacing-chip); }',
  'font-sans': '.font-sans { font-family: var(--font-sans); }',
  'font-light': 'font-weight: var(--font-weight-light);',
  'font-semibold': 'font-weight: var(--font-weight-semibold);',
  'sm:flex': '@media (width >= 24.375rem) { .sm\\:flex { display: flex; } }',
  'md:grid': '@media (width >= 48rem) { .md\\:grid { display: grid; } }',
  'lg:w-rail': '@media (width >= 68.75rem) { .lg\\:w-rail { width: var(--rail-width); } }',
  'xl:hidden': '@media (width >= 90rem) { .xl\\:hidden { display: none; } }',
  'light:bg-surface': ".light\\:bg-surface:where([data-theme='light'], [data-theme='light'] *)",
  'dark:hidden':
    ".dark\\:hidden:where([data-theme='dark'], [data-theme='dark'] *, :root:not([data-theme]), :root:not([data-theme]) *)",
  'type-display':
    '.type-display { font-size: 1.875rem; line-height: 2.125rem; font-weight: 300; font-stretch: 125%;',
  'type-figure':
    '.type-figure { font-size: 1.5rem; line-height: 1.75rem; font-weight: 300; font-stretch: 125%;',
  'type-unit': '.type-unit { font-size: 0.75rem; line-height: 1rem; font-weight: 400;',
  'type-wordmark':
    '.type-wordmark { font-size: 1.1875rem; line-height: 1.5rem; font-weight: 600; font-stretch: 125%;',
  'type-heading':
    '.type-heading { font-size: 1.0625rem; line-height: 1.375rem; font-weight: 600; font-stretch: 112.5%;',
  'type-label':
    '.type-label { font-size: 0.9375rem; line-height: 1.25rem; font-weight: 600; font-stretch: 112.5%;',
  'type-body': '.type-body { font-size: 0.9375rem; line-height: 1.375rem; font-weight: 400;',
  'type-name': '.type-name { font-size: 0.9375rem; line-height: 1.25rem; font-weight: 500;',
  'type-control': '.type-control { font-size: 0.875rem; line-height: 1.125rem; font-weight: 500;',
  'type-small': '.type-small { font-size: 0.8125rem; line-height: 1.125rem; font-weight: 400;',
  'type-caption': '.type-caption { font-size: 0.75rem; line-height: 1rem; font-weight: 400;',
  // Tailwind utilities build-lead's scaffold already uses keep working.
  'max-w-3xl': '.max-w-3xl { max-width: var(--container-3xl); }',
  'aspect-4/3': '.aspect-4\\/3 { aspect-ratio: 4/3; }',
  'w-full': '.w-full { width: 100%; }',
  'p-4': '.p-4 { padding: calc(var(--spacing) * 4); }',
};

// Tailwind defaults the tokens remove, so off-palette colour, off-scale type and generic shadows,
// radii, easings and looping animations cannot creep in.
const REMOVED = [
  'bg-red-500',
  'bg-purple-600',
  'text-white',
  'bg-black',
  'text-sm',
  'text-base',
  'text-4xl',
  'shadow-lg',
  'rounded-lg',
  'font-bold',
  'ease-in-out',
  'animate-spin',
  'animate-pulse',
];

function normalise(css: string): string {
  return css.replace(/\s+/g, ' ');
}

/** The declarations of the first rule whose selector is exactly `selector`, for example `:root`. */
function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`tokens.css has no "${selector}" block`);
  return css.slice(start, css.indexOf('}', start));
}

function customProperties(declarations: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [, name, value] of declarations.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    if (name !== undefined && value !== undefined) out.set(name, value.trim());
  }
  return out;
}

describe('design tokens compile with the installed Tailwind (WP-DS1)', () => {
  let css = '';

  beforeAll(async () => {
    const compiler = await compile(ENTRY, { base: here, loadStylesheet });
    css = normalise(compiler.build([...Object.keys(EXPECTED), ...REMOVED]));
  });

  it('must be imported with no layer: Tailwind refuses it inside one', async () => {
    // The reason for the wiring rule in docs/design/tokens.md: @custom-variant (and @utility)
    // cannot be nested, and @import ... layer() nests the whole file.
    for (const layer of ['theme', 'base']) {
      const entry = ENTRY.replace(
        "@import './tokens.css';",
        `@import './tokens.css' layer(${layer});`,
      );
      await expect(compile(entry, { base: here, loadStylesheet })).rejects.toThrow(
        '`@custom-variant` cannot be nested.',
      );
    }
  });

  it('is compiled by Tailwind 4.3.3', () => {
    const manifest = readFileSync(require.resolve('tailwindcss/package.json'), 'utf8');
    expect(JSON.parse(manifest)).toMatchObject({ version: '4.3.3' });
  });

  it.each(Object.entries(EXPECTED))('generates %s', (_utility, declaration) => {
    expect(css).toContain(normalise(declaration));
  });

  it.each(REMOVED)('removes the default %s', (utility) => {
    const selector = `.${utility.replace(/[/:]/g, (c) => `\\${c}`)}`;
    expect(css).not.toContain(`${selector} {`);
  });

  it('emits no default palette variables', () => {
    expect(css).not.toMatch(/--color-(red|blue|purple|gray|white|black)/);
  });

  it('emits the static scales for plain CSS and scripts', () => {
    for (const variable of [
      '--radius-panel: 1.25rem;',
      '--breakpoint-lg: 68.75rem;',
      '--ease-settle: cubic-bezier(0.2, 0.8, 0.2, 1);',
      "--font-sans: 'Rig Lab Sans', 'Rig Lab Sans Fallback', system-ui, sans-serif;",
    ]) {
      expect(css).toContain(variable);
    }
  });

  it('declares the self-hosted face with swap and the metric-matched fallback', () => {
    expect(css).toContain(
      "@font-face { font-family: 'Rig Lab Sans'; src: url('./fonts/rig-lab-sans.woff2') format('woff2'); font-weight: 300 600; font-stretch: 100% 125%; font-style: normal; font-display: swap;",
    );
    expect(css).toContain("font-family: 'Rig Lab Sans Fallback'; src: local('Arial')");
  });

  it('restores link underlines and focus rings after Preflight', () => {
    const base = css.slice(css.indexOf('@layer base'));
    expect(base.indexOf('text-decoration-line: underline;')).toBeGreaterThan(
      base.indexOf('text-decoration: inherit;'),
    );
    expect(base).toContain(
      ':focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }',
    );
  });

  it('selects text as --stage on --ink, the pair the contrast check measures', () => {
    // A solid selection holds on every surface; contrast.mjs measures stage on ink.
    const base = css.slice(css.indexOf('@layer base'));
    expect(base).toContain('::selection { background: var(--ink); color: var(--stage); }');
    expect(tokensCss).not.toContain('--selection');
  });
});

describe('tokens stay consistent', () => {
  it('uses the breakpoint tokens in the type roles and layout steps', () => {
    const theme = normalise(tokensCss);
    expect(theme).toContain('--breakpoint-md: 48rem;');
    expect(theme).toContain('--breakpoint-lg: 68.75rem;');
    const steps = [...tokensCss.matchAll(/@media \(width >= ([\d.]+rem)\)/g)].map((m) => m[1]);
    expect(steps.length).toBeGreaterThan(0);
    expect(new Set(steps)).toEqual(new Set(['48rem', '68.75rem']));
  });

  it("gives the fallback face Rig Lab Sans's line box at any size-adjust", () => {
    // Overrides are scaled by size-adjust, so each must be Rig Lab Sans's metric divided by it:
    // ascent 1090 and descent 320 at 1000 units per em, no line gap (hhea, typo and win agree).
    // docs/design/tools/calibrate-fallback.mjs derives all four values from the font files.
    const start = tokensCss.indexOf("font-family: 'Rig Lab Sans Fallback';");
    expect(start).toBeGreaterThan(-1);
    const fallback = tokensCss.slice(start, tokensCss.indexOf('}', start));
    const percent = (name: string) => {
      const value = new RegExp(`${name}: ([\\d.]+)%;`).exec(fallback)?.[1];
      if (value === undefined) throw new Error(`the fallback face has no ${name}`);
      return Number(value);
    };
    const scale = percent('size-adjust') / 100;
    expect(percent('ascent-override') * scale).toBeCloseTo(109, 1);
    expect(percent('descent-override') * scale).toBeCloseTo(32, 1);
    expect(percent('line-gap-override')).toBe(0);
  });

  it('matches motion.ts to the motion custom properties', () => {
    const motion = customProperties(block(tokensCss, ':root'));
    for (const [name, ms] of Object.entries(durationMs)) {
      expect(motion.get(`--dur-${name}`), `--dur-${name}`).toBe(`${String(ms)}ms`);
    }
    expect(motion.get('--delay-value')).toBe(`${String(delayMs.value)}ms`);
    for (const [name, points] of Object.entries(easing)) {
      expect(tokensCss).toContain(`--ease-${name}: cubic-bezier(${points.join(', ')});`);
    }
  });

  it('turns every movement off for reduced motion, except the cut', () => {
    const reduced = customProperties(
      tokensCss.slice(tokensCss.indexOf('@media (prefers-reduced-motion: reduce)')),
    );
    for (const name of Object.keys(durationMs)) {
      if (name === 'cut') {
        expect(reduced.has('--dur-cut')).toBe(false);
      } else {
        expect(reduced.get(`--dur-${name}`), `--dur-${name}`).toBe('0ms');
      }
    }
    expect(reduced.get('--delay-value')).toBe('0ms');
    expect(motionSeconds('value', false)).toBe(0.36);
    expect(motionSeconds('value', true)).toBe(0);
    expect(motionSeconds('cut', true)).toBe(0.2);
    expect(delaySeconds('value', false)).toBe(0.04);
    expect(delaySeconds('value', true)).toBe(0);
  });
});

describe('the self-hosted font', () => {
  const fonts = path.join(here, 'fonts');

  it('is a WOFF2 within the 80 KB type budget', () => {
    const font = readFileSync(path.join(fonts, 'rig-lab-sans.woff2'));
    expect(font.subarray(0, 4).toString('latin1')).toBe('wOF2');
    expect(font.byteLength).toBeLessThanOrEqual(80 * 1024);
  });

  it('ships with its licence and the Reserved Font Name notice', () => {
    const licence = readFileSync(path.join(fonts, 'OFL.txt'), 'utf8');
    expect(licence).toContain('with Reserved Font Name "Mona"');
    expect(licence).toContain('SIL OPEN FONT LICENSE Version 1.1');
  });
});

describe('contrast', () => {
  it('passes WCAG 2.1 AA for every text and UI pair, dark and light', () => {
    // Exits non-zero, which throws here, if any pair falls below 4.5:1 (text) or 3:1 (UI).
    const script = path.join(repoRoot, 'docs/design/tools/contrast.mjs');
    expect(() =>
      execFileSync(process.execPath, [script, '--check'], { stdio: 'pipe' }),
    ).not.toThrow();
  });
});
