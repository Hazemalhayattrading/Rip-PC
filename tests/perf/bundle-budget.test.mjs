/**
 * Unit tests for tests/perf/bundle-budget.mjs (initial-JS gzip budget, BUILD_PROMPT.md §8).
 * Fixtures: tests/perf/fixtures/dist-* are hand-made dist folders shaped like Vite 8 (Rolldown)
 * output. Error cases are generated in temp folders so each test states its own input.
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { analyzeDist, loadBudget, parseHtml, resolveReference } from './bundle-budget.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const CLI = path.join(HERE, 'bundle-budget.mjs');
const budget = loadBudget();
const tiny = loadBudget(path.join(FIXTURES, 'budget-tiny.json'));
const tempDirs = [];

const gzipOf = (dist, rel) => gzipSync(readFileSync(path.join(dist, rel)), { level: 6 }).length;
const byFile = (files) => Object.fromEntries(files.map((f) => [f.file, f]));

function runCli(args, cwd = HERE) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

/** Write a throwaway dist folder: { 'index.html': '...', 'assets/a.js': '...' }. */
function makeDist(files) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'rig-lab-dist-'));
  tempDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

const html = (head) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title>${head}</head><body></body></html>`;

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe('budget file', () => {
  it('loads the real budget: 250,000 B gzip at level 6, strict "<", base /Rip-PC/', () => {
    expect(budget.maxGzipBytes).toBe(250000);
    expect(budget.op).toBe('<');
    expect(budget.gzipLevel).toBe(6);
    expect(budget.bytesPerKilobyte).toBe(1000);
    expect(budget.basePath).toBe('/Rip-PC/');
    expect(budget.source).toMatch(/BUILD_PROMPT\.md §8/);
    expect(budget.forbidden.map((f) => f.signature)).toContain('__THREE__');
  });

  it('rejects a budget without a source', () => {
    const dir = makeDist({
      'b.json': JSON.stringify({
        bundle: {
          basePath: '/Rip-PC/',
          gzip: { level: 6, bytesPerKilobyte: 1000 },
          initialJs: { maxGzipBytes: 1, op: '<' },
        },
      }),
    });
    expect(() => loadBudget(path.join(dir, 'b.json'))).toThrow(/source/);
  });
});

describe('initial graph on a Vite-shaped app (fixtures/dist-app)', () => {
  const dist = path.join(FIXTURES, 'dist-app');
  const report = analyzeDist({ distDir: dist, budget });
  const page = report.pages[0];
  const initial = byFile(page.initialJs.files);

  it('counts the entry, its modulepreload and the full static closure, including a cycle', () => {
    expect(Object.keys(initial).sort()).toEqual([
      'assets/cycle-a-Cy1aA1.js',
      'assets/cycle-b-Cy2bB2.js',
      'assets/index-Cq3xF1.js',
      'assets/react-Dn2kP8.js',
      'assets/route-table-Wz5mN7.js',
      'assets/scheduler-Ab1rT4.js',
    ]);
    expect(initial['assets/index-Cq3xF1.js'].role).toBe('entry');
    expect(initial['assets/react-Dn2kP8.js'].role).toBe('modulepreload');
    expect(initial['assets/route-table-Wz5mN7.js'].role).toBe('static-import');
    expect(initial['assets/cycle-b-Cy2bB2.js'].via).toBe('assets/cycle-a-Cy1aA1.js');
  });

  it('never counts dynamic imports, __vite__mapDeps entries, strings, regexes or comments', () => {
    for (const lazy of [
      'Garage-Hx1qW3',
      'three-Qm4zX9',
      'Results-Tn8vB5',
      'decoy-string-Ds1eR5',
      'decoy-regex-Dr1tY6',
      'decoy-comment-Dc1wQ0',
      'orphan-Zz0kL2',
    ]) {
      expect(initial[`assets/${lazy}.js`]).toBeUndefined();
    }
  });

  it('sums per-file gzip sizes (each file is served and compressed on its own)', () => {
    const expected = Object.keys(initial).reduce((n, rel) => n + gzipOf(dist, rel), 0);
    expect(page.initialJs.totalGzipBytes).toBe(expected);
    for (const [rel, f] of Object.entries(initial)) expect(f.gzipBytes).toBe(gzipOf(dist, rel));
  });

  it('reports lazy chunks separately with their on-demand cost and flags the 3D chunk', () => {
    const lazy = byFile(page.lazyJs);
    expect(Object.keys(lazy).sort()).toEqual([
      'assets/Garage-Hx1qW3.js',
      'assets/Results-Tn8vB5.js',
      'assets/decoy-comment-Dc1wQ0.js',
      'assets/decoy-regex-Dr1tY6.js',
      'assets/decoy-string-Ds1eR5.js',
      'assets/orphan-Zz0kL2.js',
      'assets/three-Qm4zX9.js',
    ]);
    const garage = lazy['assets/Garage-Hx1qW3.js'];
    expect(garage.role).toBe('lazy-root');
    // Garage statically imports three (lazy) and react (already initial): only three is extra.
    expect(garage.onDemandFiles.sort()).toEqual([
      'assets/Garage-Hx1qW3.js',
      'assets/three-Qm4zX9.js',
    ]);
    expect(garage.onDemandGzipBytes).toBe(
      gzipOf(dist, 'assets/Garage-Hx1qW3.js') + gzipOf(dist, 'assets/three-Qm4zX9.js'),
    );
    expect(lazy['assets/three-Qm4zX9.js'].contains).toEqual(['three.js']);
    expect(lazy['assets/orphan-Zz0kL2.js'].role).toBe('orphan');
    expect(report.warnings.some((w) => w.includes('orphan-Zz0kL2.js'))).toBe(true);
  });

  it('reports CSS separately: linked stylesheet is initial, the rest is lazy', () => {
    expect(page.initialCss.files.map((f) => f.file)).toEqual(['assets/index-B7xR2a.css']);
    expect(page.lazyCss.map((f) => f.file)).toEqual(['assets/Garage-Kp9sD4.css']);
    expect(page.initialJs.files.some((f) => f.file.endsWith('.css'))).toBe(false);
  });

  it('passes the real budget and exits 0', () => {
    expect(page.verdict.withinBudget).toBe(true);
    expect(page.verdict.forbiddenFound).toBe(false);
    expect(report.errors).toEqual([]);
    expect(report.exitCode).toBe(0);
    const cli = runCli(['--dist', dist]);
    expect(cli.code).toBe(0);
    expect(cli.out).toContain('Result: PASS');
    expect(cli.out).toContain('assets/Garage-Hx1qW3.js');
  });
});

describe('budget verdicts', () => {
  const dist = path.join(FIXTURES, 'dist-app');

  it('fails with exit 1 when the initial JS is over budget', () => {
    const report = analyzeDist({ distDir: dist, budget: tiny });
    expect(report.pages[0].verdict.withinBudget).toBe(false);
    expect(report.exitCode).toBe(1);
    const cli = runCli(['--dist', dist, '--budget', path.join(FIXTURES, 'budget-tiny.json')]);
    expect(cli.code).toBe(1);
    expect(cli.out).toContain('size check FAIL');
  });

  it('treats a total exactly at the limit as a miss for "<" and a pass for "<="', () => {
    const total = analyzeDist({ distDir: dist, budget }).pages[0].initialJs.totalGzipBytes;
    const strict = analyzeDist({
      distDir: dist,
      budget: { ...budget, maxGzipBytes: total, op: '<' },
    });
    const inclusive = analyzeDist({
      distDir: dist,
      budget: { ...budget, maxGzipBytes: total, op: '<=' },
    });
    expect(strict.exitCode).toBe(1);
    expect(inclusive.exitCode).toBe(0);
  });

  it('fails the real 250,000 B budget with a generated, incompressible 400 KB entry', () => {
    const noise = randomBytes(300000).toString('base64'); // base64 of random bytes: ~400 KB raw, ~300 KB gzip
    const big = makeDist({
      'index.html': html('<script type="module" src="/Rip-PC/assets/big.js"></script>'),
      'assets/big.js': `export const blob=${JSON.stringify(noise)};\n`,
    });
    const report = analyzeDist({ distDir: big, budget });
    expect(report.pages[0].initialJs.totalGzipBytes).toBeGreaterThan(250000);
    expect(report.exitCode).toBe(1);
  });

  it('gzips at the level in budget.json (6), not at 9, on a file large enough for them to differ', () => {
    // Deterministic, JS-like, compressible text (~180 KB): small files compress identically at 6 and 9.
    let seed = 42;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
    const words = [
      'const',
      'let',
      'return',
      'function',
      'props',
      'children',
      'useState',
      'map',
      'filter',
      'price',
      'socket',
      'lengthMm',
    ];
    let body = '';
    while (body.length < 180000)
      body += `${words[next() % words.length]}${next() % 997}=${next() % 65536};`;
    const code = `export const v=()=>{${body}};\n`;
    const dist = makeDist({
      'index.html': html('<script type="module" src="/Rip-PC/assets/app.js"></script>'),
      'assets/app.js': code,
    });
    const level6 = gzipSync(Buffer.from(code), { level: 6 }).length;
    const level9 = gzipSync(Buffer.from(code), { level: 9 }).length;
    expect(level6).not.toBe(level9); // premise of this test
    const report = analyzeDist({ distDir: dist, budget });
    expect(report.pages[0].initialJs.totalGzipBytes).toBe(level6);
  });

  it('warns (without failing) at 95% of the budget', () => {
    const total = analyzeDist({ distDir: dist, budget }).pages[0].initialJs.totalGzipBytes;
    const report = analyzeDist({
      distDir: dist,
      budget: { ...budget, maxGzipBytes: Math.ceil(total / 0.97) },
    });
    expect(report.exitCode).toBe(0);
    expect(report.warnings.some((w) => /of the budget \(warning at 95%\)/.test(w))).toBe(true);
  });

  it('fails with exit 1 when three.js is in the initial graph, even far under budget', () => {
    const report = analyzeDist({ distDir: path.join(FIXTURES, 'dist-three-initial'), budget });
    const page = report.pages[0];
    expect(page.verdict.withinBudget).toBe(true);
    expect(page.forbiddenInInitial).toHaveLength(1);
    expect(page.forbiddenInInitial[0].files).toEqual(['assets/three-Th2cD3.js']);
    expect(report.exitCode).toBe(1);
  });
});

describe('HTML edge cases (fixtures/dist-edge)', () => {
  const report = analyzeDist({ distDir: path.join(FIXTURES, 'dist-edge'), budget });
  const initial = byFile(report.pages[0].initialJs.files);

  it('counts uppercase/unquoted tags, classic scripts, preload as=script and inline scripts', () => {
    expect(Object.keys(initial).sort()).toEqual([
      'assets/entry-Ed1.js',
      'assets/entry-dep-Ed2.js',
      'assets/inline-dep-Id1.js',
      'assets/legacy-Lg1.js',
      'assets/preloaded-Pl1.js',
      'index.html#inline-1',
      'index.html#inline-2',
    ]);
    expect(initial['assets/legacy-Lg1.js'].role).toBe('classic');
    expect(initial['assets/preloaded-Pl1.js'].role).toBe('preload');
    expect(initial['index.html#inline-1'].role).toBe('inline-module');
    expect(initial['assets/inline-dep-Id1.js'].role).toBe('static-import');
  });

  it('skips nomodule scripts with a warning and ignores non-JS script types', () => {
    expect(initial['assets/nomodule-Nm1.js']).toBeUndefined();
    expect(report.warnings.some((w) => w.includes('nomodule'))).toBe(true);
    expect(report.exitCode).toBe(0);
  });

  it('reports a print stylesheet as initial CSS (the browser still downloads it)', () => {
    expect(report.pages[0].initialCss.files.map((f) => f.file)).toEqual(['assets/app-Ap1.css']);
  });
});

describe('cannot measure: exit 2 with a precise reason', () => {
  const cases = [
    {
      name: 'the build was made without base /Rip-PC/',
      dist: path.join(FIXTURES, 'dist-wrong-base'),
      message: /outside base \/Rip-PC\//,
    },
    {
      name: 'the HTML points at a missing chunk',
      files: { 'index.html': html('<script type="module" src="/Rip-PC/assets/gone.js"></script>') },
      message: /missing file assets\/gone\.js/,
    },
    {
      name: 'a chunk statically imports a missing chunk',
      files: {
        'index.html': html('<script type="module" src="/Rip-PC/assets/a.js"></script>'),
        'assets/a.js': 'import"./b.js";',
      },
      message: /points at missing file assets\/b\.js/,
    },
    {
      name: 'a chunk has a bare import',
      files: {
        'index.html': html('<script type="module" src="/Rip-PC/assets/a.js"></script>'),
        'assets/a.js': 'import{createElement as e}from"react";e();',
      },
      message: /bare import "react"/,
    },
    {
      name: 'the HTML loads an external script',
      files: {
        'index.html': html(
          '<script src="https://cdn.example.com/lib.js"></script><script type="module" src="/Rip-PC/assets/a.js"></script>',
        ),
        'assets/a.js': 'export{};',
      },
      message: /external; its size cannot be measured/,
    },
    {
      name: 'an initial chunk does not parse as a module',
      files: {
        'index.html': html('<script type="module" src="/Rip-PC/assets/a.js"></script>'),
        'assets/a.js': 'export const = ;',
      },
      message: /could not parse it as an ES module/,
    },
    {
      name: 'the HTML uses an import map',
      files: {
        'index.html': html(
          '<script type="importmap">{"imports":{}}</script><script type="module" src="/Rip-PC/assets/a.js"></script>',
        ),
        'assets/a.js': 'export{};',
      },
      message: /import map/,
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const dist = c.dist ?? makeDist(c.files);
      const report = analyzeDist({ distDir: dist, budget });
      expect(report.exitCode).toBe(2);
      expect(report.errors.join('\n')).toMatch(c.message);
      expect(runCli(['--dist', dist]).code).toBe(2);
    });
  }

  it('the dist folder does not exist', () => {
    const cli = runCli(['--dist', path.join(os.tmpdir(), 'rig-lab-no-such-dist')]);
    expect(cli.code).toBe(2);
    expect(cli.err).toMatch(/dist directory not found/);
  });

  it('an unknown CLI flag', () => {
    const cli = runCli(['--dist', path.join(FIXTURES, 'dist-app'), '--bogus']);
    expect(cli.code).toBe(2);
    expect(cli.err).toMatch(/Unknown option/);
  });

  it('a lazy chunk that does not parse is only a warning (it is not initial JS)', () => {
    const dist = makeDist({
      'index.html': html('<script type="module" src="/Rip-PC/assets/a.js"></script>'),
      'assets/a.js': 'const w=()=>import(`./worker.js`);export{w};',
      'assets/worker.js': 'with (self) { postMessage(1) }',
    });
    const report = analyzeDist({ distDir: dist, budget });
    expect(report.exitCode).toBe(0);
    expect(report.warnings.some((w) => w.includes('assets/worker.js'))).toBe(true);
  });
});

describe('JSON output', () => {
  it('--json writes the same report that --format json prints', () => {
    const dist = path.join(FIXTURES, 'dist-app');
    const out = path.join(makeDist({}), 'report.json');
    const cli = runCli(['--dist', dist, '--format', 'json', '--json', out]);
    expect(cli.code).toBe(0);
    const printed = JSON.parse(cli.out);
    const written = JSON.parse(readFileSync(out, 'utf8'));
    expect({ ...written, generatedAt: null }).toEqual({ ...printed, generatedAt: null });
    expect(printed.pages[0].initialJs.totalGzipBytes).toBeGreaterThan(0);
    expect(printed.result).toBe('PASS');
  });

  it('skips dot-paths such as dist/.vite/manifest.json, so the manifest cannot hide an orphan', () => {
    const dist = makeDist({
      'index.html': html('<script type="module" src="/Rip-PC/assets/a.js"></script>'),
      'assets/a.js': 'export{};',
      'assets/dead.js': 'export const dead=1;',
      '.vite/manifest.json': JSON.stringify({
        'src/main.tsx': { file: 'assets/a.js' },
        'src/dead.ts': { file: 'assets/dead.js' },
      }),
    });
    const report = analyzeDist({ distDir: dist, budget });
    expect(report.pages[0].lazyJs.find((l) => l.file === 'assets/dead.js')?.role).toBe('orphan');
    expect(report.pages[0].lazyJs.some((l) => l.file.startsWith('.vite/'))).toBe(false);
  });

  it('--all-html measures every HTML page (for per-route copies on GitHub Pages)', () => {
    const page = html('<script type="module" src="/Rip-PC/assets/a.js"></script>');
    const dist = makeDist({
      'index.html': page,
      'build/cpu/index.html': page,
      '404.html': page,
      'assets/a.js': 'export{};',
    });
    const report = analyzeDist({ distDir: dist, budget, allHtml: true });
    expect(report.pages.map((p) => p.html).sort()).toEqual([
      '404.html',
      'build/cpu/index.html',
      'index.html',
    ]);
    expect(report.exitCode).toBe(0);
  });
});

describe('parseHtml and resolveReference', () => {
  it('ignores tags inside HTML comments and reads every attribute quoting style', () => {
    const doc = parseHtml(`<!-- <script type="module" src="/x.js"></script> -->
      <script type=module src=/a.js></script><script type='module' src='/b.js'></script>
      <link rel="Modulepreload" href="/c.js"><link rel="preload stylesheet" as="style" href="/d.css">`);
    expect(doc.moduleScripts.map((s) => s.src)).toEqual(['/a.js', '/b.js']);
    expect(doc.modulePreloads.map((l) => l.href)).toEqual(['/c.js']);
    expect(doc.stylesheets.map((l) => l.href)).toEqual(['/d.css']);
  });

  it('maps URLs under the base path to dist files and flags everything else', () => {
    expect(resolveReference('/Rip-PC/assets/a.js', '/Rip-PC/index.html', '/Rip-PC/')).toEqual({
      rel: 'assets/a.js',
    });
    expect(resolveReference('./b.js', '/Rip-PC/assets/a.js', '/Rip-PC/')).toEqual({
      rel: 'assets/b.js',
    });
    expect(resolveReference('../x.js', '/Rip-PC/assets/a.js', '/Rip-PC/')).toEqual({ rel: 'x.js' });
    expect(resolveReference('/Rip-PC/build/cpu/', '/Rip-PC/index.html', '/Rip-PC/')).toEqual({
      rel: 'build/cpu/index.html',
    });
    expect(resolveReference('/assets/a.js', '/Rip-PC/index.html', '/Rip-PC/')).toEqual({
      outsideBase: '/assets/a.js',
    });
    expect(resolveReference('/Rip-PC/../etc/passwd', '/Rip-PC/index.html', '/Rip-PC/')).toEqual({
      outsideBase: '/etc/passwd',
    });
    expect(
      'external' in
        resolveReference('https://cdn.example.com/a.js', '/Rip-PC/index.html', '/Rip-PC/'),
    ).toBe(true);
    expect(
      'external' in resolveReference('//cdn.example.com/a.js', '/Rip-PC/index.html', '/Rip-PC/'),
    ).toBe(true);
    expect(
      'external' in resolveReference('data:text/javascript,1', '/Rip-PC/index.html', '/Rip-PC/'),
    ).toBe(true);
  });
});
