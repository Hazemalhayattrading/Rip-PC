#!/usr/bin/env node
/**
 * Rig Lab initial-JS budget checker.
 * BUILD_PROMPT.md §8: "Initial JS < 250 KB gzip before the 3D chunk". Numbers and method live in
 * tests/perf/budget.json (bundle.*). Owner: qa-lead. Zero dependencies, Node >= 22.
 *
 * What counts as initial JS (docs/qa/test-plan.md §6.2):
 *   1. Roots: every JS resource the entry HTML makes the browser fetch at load:
 *      <script type="module" src>, classic <script src> (not nomodule), inline <script> bodies,
 *      <link rel="modulepreload">, <link rel="preload" as="script">.
 *   2. Their static-import closure (import … from, import "…", export … from), read with V8's own
 *      module parser, so strings, comments, regexes and dynamic import() never count.
 *   3. Each file is gzipped on its own (zlib level from budget.json) and the sizes are summed.
 * Every other emitted JS file is lazy. It is reported with its on-demand cost (itself plus its
 * static imports that are not already initial) and never counted. CSS is reported separately.
 *
 * Usage: node tests/perf/bundle-budget.mjs [--dist dist] [--html index.html]... [--all-html]
 *          [--budget tests/perf/budget.json] [--base /Rip-PC/] [--json out.json] [--format table|json]
 * Exit codes: 0 within budget · 1 budget miss (over budget, or a forbidden module is initial)
 *             2 cannot measure (bad input, missing file, unresolvable or external reference, parse error)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import { staticImportsOf } from './lib/static-imports.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_BUDGET_PATH = path.join(HERE, 'budget.json');
const URL_ORIGIN = 'https://pages.invalid';
const JS_EXT = new Set(['.js', '.mjs', '.cjs']);
const TEXT_EXT = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.json', '.webmanifest', '.svg', '.txt']);
// HTML "JavaScript MIME type essence match" list, plus the empty type and "module".
const CLASSIC_JS_TYPES = new Set([
  '', 'application/ecmascript', 'application/javascript', 'application/x-ecmascript',
  'application/x-javascript', 'text/ecmascript', 'text/javascript', 'text/javascript1.0',
  'text/javascript1.1', 'text/javascript1.2', 'text/javascript1.3', 'text/javascript1.4',
  'text/javascript1.5', 'text/jscript', 'text/livescript', 'text/x-ecmascript', 'text/x-javascript',
]);

export class MeasureError extends Error {}

// ---------------------------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------------------------

/** Load and validate the bundle section of budget.json. */
export function loadBudget(budgetPath = DEFAULT_BUDGET_PATH) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(budgetPath, 'utf8'));
  } catch (error) {
    throw new MeasureError(`cannot read budget file ${budgetPath}: ${error.message}`);
  }
  const b = raw?.bundle;
  const problems = [];
  if (!b) problems.push('missing "bundle" section');
  else {
    if (!Number.isInteger(b.initialJs?.maxGzipBytes) || b.initialJs.maxGzipBytes <= 0) {
      problems.push('bundle.initialJs.maxGzipBytes must be a positive integer');
    }
    if (!['<', '<='].includes(b.initialJs?.op)) problems.push('bundle.initialJs.op must be "<" or "<="');
    if (typeof b.initialJs?.source !== 'string' || !b.initialJs.source) {
      problems.push('bundle.initialJs.source must name where the number comes from');
    }
    if (!Number.isInteger(b.gzip?.level) || b.gzip.level < 1 || b.gzip.level > 9) {
      problems.push('bundle.gzip.level must be an integer 1..9');
    }
    if (![1000, 1024].includes(b.gzip?.bytesPerKilobyte)) problems.push('bundle.gzip.bytesPerKilobyte must be 1000 or 1024');
    if (typeof b.basePath !== 'string' || !b.basePath.startsWith('/') || !b.basePath.endsWith('/')) {
      problems.push('bundle.basePath must start and end with "/"');
    }
    for (const f of b.forbiddenInInitialGraph ?? []) {
      if (!f.name || !f.signature || !f.source) problems.push('each forbiddenInInitialGraph entry needs name, signature and source');
    }
  }
  if (problems.length) throw new MeasureError(`invalid budget file ${budgetPath}: ${problems.join('; ')}`);
  return {
    path: budgetPath,
    distDir: b.distDir ?? 'dist',
    entryHtml: Array.isArray(b.entryHtml) && b.entryHtml.length ? b.entryHtml : ['index.html'],
    basePath: b.basePath,
    gzipLevel: b.gzip.level,
    bytesPerKilobyte: b.gzip.bytesPerKilobyte,
    maxGzipBytes: b.initialJs.maxGzipBytes,
    op: b.initialJs.op,
    source: b.initialJs.source,
    warnAtFraction: typeof b.initialJs.warnAtFraction === 'number' ? b.initialJs.warnAtFraction : null,
    forbidden: (b.forbiddenInInitialGraph ?? []).map((f) => ({ name: f.name, signature: f.signature, source: f.source })),
  };
}

// ---------------------------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------------------------

const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const TAG_ATTRS = String.raw`((?:[^>"']|"[^"]*"|'[^']*')*)`;
const SCRIPT_RE = new RegExp(String.raw`<script\b${TAG_ATTRS}>([\s\S]*?)<\/script\s*>`, 'gi');
const LINK_RE = new RegExp(String.raw`<link\b${TAG_ATTRS}>`, 'gi');
const BASE_RE = new RegExp(String.raw`<base\b${TAG_ATTRS}>`, 'i');

function parseAttributes(source) {
  /** @type {Record<string, string>} */
  const attrs = {};
  for (const m of source.matchAll(ATTR_RE)) {
    const name = m[1].toLowerCase();
    if (!(name in attrs)) attrs[name] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

/**
 * Extract every script- and stylesheet-bearing element from an HTML document.
 * HTML comments are removed first, so commented-out tags never count.
 */
export function parseHtml(html) {
  const text = html.replace(/<!--[\s\S]*?-->/g, '');
  const result = {
    baseHref: null,
    moduleScripts: [], // { src }
    classicScripts: [], // { src }
    inlineScripts: [], // { index, code, isModule }
    nomoduleScripts: [], // { src }
    modulePreloads: [], // { href }
    scriptPreloads: [], // { href }
    stylesheets: [], // { href }
    importMaps: 0,
    ignoredScripts: [], // { type }
  };
  const base = text.match(BASE_RE);
  if (base) result.baseHref = parseAttributes(base[1]).href ?? null;
  let inlineIndex = 0;
  for (const m of text.matchAll(SCRIPT_RE)) {
    const attrs = parseAttributes(m[1]);
    const type = (attrs.type ?? '').trim().toLowerCase();
    const isModule = type === 'module';
    if (type === 'importmap') {
      result.importMaps += 1;
      continue;
    }
    if (!isModule && !CLASSIC_JS_TYPES.has(type)) {
      result.ignoredScripts.push({ type });
      continue;
    }
    if ('src' in attrs) {
      if (!isModule && 'nomodule' in attrs) result.nomoduleScripts.push({ src: attrs.src });
      else if (isModule) result.moduleScripts.push({ src: attrs.src });
      else result.classicScripts.push({ src: attrs.src });
    } else if (m[2].trim() !== '') {
      if (!isModule && 'nomodule' in attrs) continue; // never runs in a module-capable browser
      inlineIndex += 1;
      result.inlineScripts.push({ index: inlineIndex, code: m[2], isModule });
    }
  }
  for (const m of text.matchAll(LINK_RE)) {
    const attrs = parseAttributes(m[1]);
    const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!attrs.href) continue;
    if (rel.includes('modulepreload')) result.modulePreloads.push({ href: attrs.href });
    else if (rel.includes('preload') && (attrs.as ?? '').toLowerCase() === 'script') result.scriptPreloads.push({ href: attrs.href });
    else if (rel.includes('stylesheet')) result.stylesheets.push({ href: attrs.href });
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// URL <-> dist file mapping
// ---------------------------------------------------------------------------------------------

const toPosix = (p) => p.split(path.sep).join('/');

/**
 * Resolve a reference (as written in HTML or in an import specifier) against the URL of the file
 * that contains it, and map it to a file inside dist.
 * @returns {{ rel: string } | { external: string } | { outsideBase: string }}
 */
export function resolveReference(ref, fromUrlPath, basePath) {
  if (/^data:/i.test(ref.trim())) return { external: ref };
  let url;
  try {
    url = new URL(ref, URL_ORIGIN + fromUrlPath);
  } catch {
    return { external: ref };
  }
  if (url.origin !== URL_ORIGIN) return { external: url.href };
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = url.pathname;
  }
  if (!pathname.startsWith(basePath)) return { outsideBase: pathname };
  let rel = pathname.slice(basePath.length);
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  return { rel: path.posix.normalize(rel) };
}

const urlPathOf = (rel, basePath) => basePath + rel;

function isBareSpecifier(spec) {
  return !/^(\.{0,2}\/|[a-z][a-z0-9+.-]*:)/i.test(spec);
}

// ---------------------------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------------------------

function walk(dir, root = dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, root, out);
    else out.push(toPosix(path.relative(root, abs)));
  }
  return out;
}

function makeSizer(distDir, level) {
  const cache = new Map();
  return {
    of(rel) {
      if (!cache.has(rel)) {
        const buf = readFileSync(path.join(distDir, rel));
        cache.set(rel, { bytes: buf.length, gzipBytes: gzipSync(buf, { level }).length });
      }
      return cache.get(rel);
    },
    ofCode(code) {
      const buf = Buffer.from(code, 'utf8');
      return { bytes: buf.length, gzipBytes: gzipSync(buf, { level }).length };
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------------------------

/**
 * Measure a built dist directory against the budget.
 * @param {{ distDir: string, htmlFiles?: string[], allHtml?: boolean, budget: ReturnType<typeof loadBudget>, basePath?: string }} options
 */
export function analyzeDist({ distDir, htmlFiles, allHtml = false, budget, basePath }) {
  const base = basePath ?? budget.basePath;
  const errors = [];
  const warnings = [];
  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    throw new MeasureError(`dist directory not found: ${distDir} (run the production build first)`);
  }
  const allFiles = walk(distDir).sort();
  const fileSet = new Set(allFiles);
  const jsFiles = allFiles.filter((f) => JS_EXT.has(path.posix.extname(f)));
  const cssFiles = allFiles.filter((f) => path.posix.extname(f) === '.css');
  const htmlList = allHtml ? allFiles.filter((f) => f.endsWith('.html')) : (htmlFiles ?? budget.entryHtml);
  if (htmlList.length === 0) throw new MeasureError(`no HTML files to measure in ${distDir}`);
  const sizer = makeSizer(distDir, budget.gzipLevel);

  // Parse every emitted JS file once as a module (V8). Failures matter only for initial files.
  const parsed = staticImportsOf(jsFiles.map((rel) => ({ key: rel, file: path.join(distDir, rel) })));
  const textCache = new Map();
  const textOf = (rel) => {
    if (!textCache.has(rel)) textCache.set(rel, readFileSync(path.join(distDir, rel), 'utf8'));
    return textCache.get(rel);
  };

  /** Resolve the static imports of a parsed module to dist files. */
  function importsOf(rel, specifiers, fromUrl, problems) {
    const out = [];
    for (const spec of specifiers) {
      if (isBareSpecifier(spec)) {
        problems.push(`${rel}: bare import "${spec}" cannot load in a browser without an import map`);
        continue;
      }
      const r = resolveReference(spec, fromUrl, base);
      if ('external' in r) problems.push(`${rel}: static import of external module ${r.external} cannot be measured`);
      else if ('outsideBase' in r) problems.push(`${rel}: static import ${spec} resolves to ${r.outsideBase}, outside base ${base}`);
      else if (!fileSet.has(r.rel)) problems.push(`${rel}: static import ${spec} points at missing file ${r.rel}`);
      else out.push(r.rel);
    }
    return out;
  }

  /** Static closure of a set of module files. Returns Map rel -> { via } for every reached file. */
  function closure(startRels, problems, alreadyKnown = new Set()) {
    const reached = new Map();
    const queue = startRels.map((rel) => ({ rel, via: null }));
    while (queue.length) {
      const { rel, via } = queue.shift();
      if (reached.has(rel) || alreadyKnown.has(rel)) continue;
      reached.set(rel, { via });
      const result = parsed[rel];
      if (!result) continue; // not JS (should not happen for module roots)
      if ('error' in result) {
        problems.push(`${rel}: V8 could not parse it as an ES module (${result.error})`);
        continue;
      }
      for (const dep of importsOf(rel, result.specifiers, urlPathOf(rel, base), problems)) {
        if (!reached.has(dep)) queue.push({ rel: dep, via: rel });
      }
    }
    return reached;
  }

  const pages = [];
  for (const htmlRel of htmlList) {
    const htmlPath = path.join(distDir, htmlRel);
    if (!existsSync(htmlPath)) {
      errors.push(`${htmlRel}: entry HTML not found in ${distDir}`);
      continue;
    }
    const html = readFileSync(htmlPath, 'utf8');
    const doc = parseHtml(html);
    let docUrl = urlPathOf(htmlRel, base);
    if (doc.baseHref) {
      const b = resolveReference(doc.baseHref, docUrl, base);
      if ('rel' in b) docUrl = urlPathOf(b.rel, base);
      else errors.push(`${htmlRel}: <base href="${doc.baseHref}"> is outside the site; cannot resolve assets`);
    }
    if (doc.importMaps > 0) {
      errors.push(`${htmlRel}: contains an import map; the checker does not model import-map resolution`);
    }
    const pageErrors = [];
    /** @type {Map<string, { role: string, via: string }>} */
    const initial = new Map();
    const inline = [];
    const moduleRoots = [];

    const addRoot = (ref, role, isModule) => {
      const r = resolveReference(ref, docUrl, base);
      if ('external' in r) pageErrors.push(`${htmlRel}: ${role} ${r.external} is external; its size cannot be measured, so the budget cannot be verified`);
      else if ('outsideBase' in r) pageErrors.push(`${htmlRel}: ${role} "${ref}" resolves to ${r.outsideBase}, outside base ${base} (is Vite's base set to ${base}?)`);
      else if (!fileSet.has(r.rel)) pageErrors.push(`${htmlRel}: ${role} "${ref}" points at missing file ${r.rel}`);
      else {
        if (!initial.has(r.rel)) initial.set(r.rel, { role, via: htmlRel });
        if (isModule) moduleRoots.push(r.rel);
      }
    };
    for (const s of doc.moduleScripts) addRoot(s.src, 'entry', true);
    for (const l of doc.modulePreloads) addRoot(l.href, 'modulepreload', true);
    for (const l of doc.scriptPreloads) addRoot(l.href, 'preload', false);
    for (const s of doc.classicScripts) addRoot(s.src, 'classic', false);
    for (const s of doc.nomoduleScripts) warnings.push(`${htmlRel}: nomodule script ${s.src} is skipped by module-capable browsers and not counted`);

    // Inline scripts count as initial JS; inline modules may import chunks statically.
    if (doc.inlineScripts.some((s) => s.isModule)) {
      const inlineParsed = staticImportsOf(
        doc.inlineScripts.filter((s) => s.isModule).map((s) => ({ key: `inline-${s.index}`, code: s.code })),
      );
      for (const s of doc.inlineScripts.filter((x) => x.isModule)) {
        const r = inlineParsed[`inline-${s.index}`];
        if ('error' in r) pageErrors.push(`${htmlRel}: inline module script #${s.index} does not parse (${r.error})`);
        else moduleRoots.push(...importsOf(`${htmlRel} inline #${s.index}`, r.specifiers, docUrl, pageErrors));
      }
    }
    for (const s of doc.inlineScripts) inline.push({ file: `${htmlRel}#inline-${s.index}`, role: s.isModule ? 'inline-module' : 'inline', via: htmlRel, ...sizer.ofCode(s.code) });

    const reached = closure(moduleRoots, pageErrors);
    for (const [rel, { via }] of reached) {
      if (!initial.has(rel)) initial.set(rel, { role: 'static-import', via: via ?? htmlRel });
    }

    const files = [...initial].map(([rel, info]) => ({ file: rel, role: info.role, via: info.via, ...sizer.of(rel) }));
    files.push(...inline);
    const totalBytes = files.reduce((n, f) => n + f.bytes, 0);
    const totalGzipBytes = files.reduce((n, f) => n + f.gzipBytes, 0);
    const within = budget.op === '<' ? totalGzipBytes < budget.maxGzipBytes : totalGzipBytes <= budget.maxGzipBytes;
    const fraction = totalGzipBytes / budget.maxGzipBytes;
    if (within && budget.warnAtFraction !== null && fraction >= budget.warnAtFraction) {
      warnings.push(`${htmlRel}: initial JS is ${(fraction * 100).toFixed(1)}% of the budget (warning at ${(budget.warnAtFraction * 100).toFixed(0)}%)`);
    }

    // Forbidden modules (e.g. three.js) must never be in the initial graph.
    const forbiddenHits = [];
    for (const rule of budget.forbidden) {
      const hitFiles = [...initial.keys()].filter((rel) => JS_EXT.has(path.posix.extname(rel)) && textOf(rel).includes(rule.signature));
      const inlineHits = doc.inlineScripts.filter((s) => s.code.includes(rule.signature)).map((s) => `${htmlRel}#inline-${s.index}`);
      if (hitFiles.length || inlineHits.length) forbiddenHits.push({ name: rule.name, signature: rule.signature, source: rule.source, files: [...hitFiles, ...inlineHits] });
    }

    // Lazy JS: everything else. On-demand cost = itself plus static imports not already initial.
    const initialSet = new Set(initial.keys());
    const texts = allFiles.filter((f) => TEXT_EXT.has(path.posix.extname(f)));
    const lazy = [];
    for (const rel of jsFiles) {
      if (initialSet.has(rel)) continue;
      const own = sizer.of(rel);
      const lazyProblems = [];
      const onDemand = closure([rel], lazyProblems, initialSet);
      const onDemandFiles = [...onDemand.keys()];
      const onDemandGzipBytes = onDemandFiles.reduce((n, f) => n + sizer.of(f).gzipBytes, 0);
      const name = path.posix.basename(rel);
      const referencedBy = texts.filter((t) => t !== rel && textOf(t).includes(name));
      const importedByLazy = jsFiles.filter((j) => !initialSet.has(j) && j !== rel && 'specifiers' in (parsed[j] ?? {}) && importsOf(j, parsed[j].specifiers, urlPathOf(j, base), []).includes(rel));
      let role = 'orphan';
      if (referencedBy.some((t) => initialSet.has(t) || t === htmlRel)) role = 'lazy-root';
      else if (referencedBy.length || importedByLazy.length) role = 'lazy-dependency';
      const contains = budget.forbidden.filter((f) => textOf(rel).includes(f.signature)).map((f) => f.name.split(' (')[0]);
      for (const p of lazyProblems) warnings.push(`lazy ${p}`);
      if (role === 'orphan') warnings.push(`${rel}: emitted but never referenced by any HTML, JS or CSS file (dead output?)`);
      lazy.push({ file: rel, role, ...own, onDemandGzipBytes, onDemandFiles, referencedBy, contains });
    }
    lazy.sort((a, b) => b.onDemandGzipBytes - a.onDemandGzipBytes || a.file.localeCompare(b.file));

    // CSS, reported only.
    const cssInitial = [];
    for (const l of doc.stylesheets) {
      const r = resolveReference(l.href, docUrl, base);
      if ('rel' in r && fileSet.has(r.rel)) cssInitial.push({ file: r.rel, ...sizer.of(r.rel) });
      else if ('external' in r) warnings.push(`${htmlRel}: external stylesheet ${r.external} not measured`);
      else pageErrors.push(`${htmlRel}: stylesheet "${l.href}" does not resolve to a file in dist`);
    }
    const cssInitialSet = new Set(cssInitial.map((c) => c.file));
    const cssLazy = cssFiles.filter((c) => !cssInitialSet.has(c)).map((c) => ({ file: c, ...sizer.of(c) }));

    errors.push(...pageErrors);
    pages.push({
      html: htmlRel,
      htmlBytes: sizer.of(htmlRel).bytes,
      htmlGzipBytes: sizer.of(htmlRel).gzipBytes,
      initialJs: { files, totalBytes, totalGzipBytes },
      verdict: {
        withinBudget: within,
        forbiddenFound: forbiddenHits.length > 0,
        headroomGzipBytes: budget.maxGzipBytes - totalGzipBytes,
        fractionOfBudget: Number(fraction.toFixed(4)),
      },
      forbiddenInInitial: forbiddenHits,
      initialCss: { files: cssInitial, totalGzipBytes: cssInitial.reduce((n, c) => n + c.gzipBytes, 0) },
      lazyJs: lazy,
      lazyCss: cssLazy,
    });
  }

  const budgetMiss = pages.some((p) => !p.verdict.withinBudget || p.verdict.forbiddenFound);
  const exitCode = errors.length ? 2 : budgetMiss ? 1 : 0;
  return {
    tool: 'rig-lab bundle-budget',
    reportVersion: 1,
    generatedAt: new Date().toISOString(),
    distDir: path.resolve(distDir),
    basePath: base,
    gzip: { level: budget.gzipLevel, bytesPerKilobyte: budget.bytesPerKilobyte },
    budget: { maxGzipBytes: budget.maxGzipBytes, op: budget.op, source: budget.source, file: budget.path },
    pages,
    warnings: [...new Set(warnings)],
    errors,
    result: exitCode === 0 ? 'PASS' : exitCode === 1 ? 'FAIL' : 'ERROR',
    exitCode,
  };
}

// ---------------------------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------------------------

export function formatReport(report) {
  const kb = (n) => (n / report.gzip.bytesPerKilobyte).toFixed(2);
  const pad = (s, n) => String(s).padEnd(n);
  const num = (s, n) => String(s).padStart(n);
  const lines = [];
  const unit = report.gzip.bytesPerKilobyte === 1000 ? '1 KB = 1000 B' : '1 KB = 1024 B';
  lines.push(`Rig Lab bundle budget: ${report.distDir} (base ${report.basePath}), gzip level ${report.gzip.level}, ${unit}`);
  lines.push(`Budget: initial JS ${report.budget.op} ${kb(report.budget.maxGzipBytes)} KB gzip. Source: ${report.budget.source}`);
  for (const page of report.pages) {
    lines.push('');
    lines.push(`${page.html}: initial JS (loaded before any dynamic import)`);
    lines.push(`  ${pad('file', 52)}${pad('role', 16)}${num('raw KB', 10)}${num('gzip KB', 10)}`);
    for (const f of page.initialJs.files) {
      lines.push(`  ${pad(f.file, 52)}${pad(f.role, 16)}${num(kb(f.bytes), 10)}${num(kb(f.gzipBytes), 10)}`);
    }
    const v = page.verdict;
    const status = v.withinBudget ? 'PASS' : 'FAIL';
    lines.push(`  ${pad('TOTAL initial JS', 68)}${num(kb(page.initialJs.totalBytes), 10)}${num(kb(page.initialJs.totalGzipBytes), 10)}`);
    lines.push(`  size check ${status}: ${kb(page.initialJs.totalGzipBytes)} KB of ${kb(report.budget.maxGzipBytes)} KB (${(v.fractionOfBudget * 100).toFixed(1)}% of budget, headroom ${kb(v.headroomGzipBytes)} KB)`);
    if (!page.forbiddenInInitial.length && report.pages.length) lines.push(`  lazy-only check PASS: no forbidden module in the initial graph`);
    for (const hit of page.forbiddenInInitial) {
      lines.push(`  lazy-only check FAIL: ${hit.name} is in the initial graph (signature "${hit.signature}" in ${hit.files.join(', ')}). ${hit.source}`);
    }
    lines.push(`  initial CSS (report only): ${kb(page.initialCss.totalGzipBytes)} KB gzip in ${page.initialCss.files.length} file(s); HTML document ${kb(page.htmlGzipBytes)} KB gzip`);
    if (page.lazyJs.length) {
      lines.push(`  lazy JS (excluded from the budget; loaded on demand):`);
      lines.push(`    ${pad('file', 50)}${pad('role', 16)}${num('gzip KB', 10)}${num('on-demand KB', 14)}  contains`);
      for (const l of page.lazyJs) {
        lines.push(`    ${pad(l.file, 50)}${pad(l.role, 16)}${num(kb(l.gzipBytes), 10)}${num(kb(l.onDemandGzipBytes), 14)}  ${l.contains.join(', ')}`);
      }
    }
    if (page.lazyCss.length) {
      lines.push(`  lazy CSS: ${page.lazyCss.map((c) => `${c.file} ${kb(c.gzipBytes)} KB`).join('; ')}`);
    }
  }
  if (report.warnings.length) {
    lines.push('');
    lines.push('Warnings:');
    for (const w of report.warnings) lines.push(`  - ${w}`);
  }
  if (report.errors.length) {
    lines.push('');
    lines.push('Errors (the budget could not be verified):');
    for (const e of report.errors) lines.push(`  - ${e}`);
  }
  lines.push('');
  lines.push(`Result: ${report.result} (exit ${report.exitCode})`);
  return lines.join('\n');
}

const USAGE = `Usage: node tests/perf/bundle-budget.mjs [options]
  --dist <dir>        built output directory (default: budget.json bundle.distDir, relative to cwd)
  --html <file>       entry HTML inside dist, repeatable (default: budget.json bundle.entryHtml)
  --all-html          measure every .html file in dist
  --budget <file>     budget file (default: tests/perf/budget.json)
  --base <path>       site base path (default: budget.json bundle.basePath)
  --json <file>       also write the JSON report to this file
  --format <fmt>      stdout format: table (default) or json
Exit codes: 0 within budget, 1 budget miss, 2 cannot measure.`;

export function main(argv = process.argv.slice(2)) {
  let args;
  try {
    ({ values: args } = parseArgs({
      args: argv,
      options: {
        dist: { type: 'string' },
        html: { type: 'string', multiple: true },
        'all-html': { type: 'boolean', default: false },
        budget: { type: 'string' },
        base: { type: 'string' },
        json: { type: 'string' },
        format: { type: 'string', default: 'table' },
        help: { type: 'boolean', default: false },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    process.stderr.write(`${error.message}\n${USAGE}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (!['table', 'json'].includes(args.format)) {
    process.stderr.write(`--format must be "table" or "json"\n${USAGE}\n`);
    return 2;
  }
  try {
    const budget = loadBudget(args.budget ? path.resolve(args.budget) : DEFAULT_BUDGET_PATH);
    const distDir = path.resolve(args.dist ?? budget.distDir);
    const report = analyzeDist({ distDir, htmlFiles: args.html, allHtml: args['all-html'], budget, basePath: args.base });
    if (args.json) {
      mkdirSync(path.dirname(path.resolve(args.json)), { recursive: true });
      writeFileSync(path.resolve(args.json), `${JSON.stringify(report, null, 2)}\n`);
    }
    process.stdout.write(`${args.format === 'json' ? JSON.stringify(report, null, 2) : formatReport(report)}\n`);
    return report.exitCode;
  } catch (error) {
    if (error instanceof MeasureError) {
      process.stderr.write(`bundle-budget: ${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

function invokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  process.exitCode = main();
}
