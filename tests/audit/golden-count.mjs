#!/usr/bin/env node
/**
 * Golden-count check (docs/qa/test-plan.md §8, phase-1-plan §4 "Every benchmark anchor: the model").
 * Owner: qa-lead. Zero dependencies, Node >= 22.
 *
 * The engine's golden test is generated from the anchor files, one case per row (BUILD_PROMPT §5.3).
 * This check proves it from the outside: it reads the anchor files and the Vitest JSON report, and
 * never the engine's code. It compares ids, not only counts, because equal counts can hide one
 * missing case plus one duplicate. Each golden case is named by its own title:
 *   [golden] <anchor id>            or   [golden] <anchor id>: <description>
 * and must sit in a test file under --test-root.
 *
 * With --estimates it also checks the tolerance itself, from the engine's own output for each anchor,
 * so a golden test that asserts a looser tolerance than budget.json cannot pass here. The estimates
 * file is a JSON array, or { "estimates": [ ... ] }, of { "anchorId", "low", "high" } in the
 * anchor's own unit (avgFps for a game row, score for a creator row). The model's number is the
 * range midpoint, as for held-out results (test plan §8).
 *
 * Usage:
 *   node tests/audit/golden-count.mjs --vitest <vitest-report.json>
 *     [--anchors data/benchmarks/game.json,data/benchmarks/creator.json] [--estimates <file>]
 *     [--test-root src/engine] [--repo-root .] [--json <out>]
 * Exit codes: 0 one passing case per anchor (and every estimate within tolerance) · 1 a case is
 * missing, extra, duplicated, failed or not run, or an estimate is off · 2 cannot measure.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ANCHORS = ['data/benchmarks/game.json', 'data/benchmarks/creator.json'];
export const DEFAULT_OUT = path.join('artifacts', 'qa', 'golden-count', 'golden-count.json');
const ID = '[a-z0-9]+(?:-[a-z0-9]+)*';
const GOLDEN_PREFIX_RE = /^\[golden\]/;
const GOLDEN_RE = new RegExp(`^\\[golden\\] (${ID})(?:: (\\S.*))?$`);
// Vitest 5 cuts a value interpolated into an it.each or test.for title ("$id", "%s") at 40
// characters by default, and 141 of the 143 anchor ids at c621c15 are longer.
export const TRUNCATION_HINT =
  ': Vitest cut an interpolated value at 40 characters (taskTitleValueFormatTruncate); build the title with a template literal, or set that option to 0';

/** Bad input: the checker cannot measure. */
export class GoldenInputError extends Error {}

function readJson(file, what) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    throw new GoldenInputError(`cannot read the ${what} ${file}: ${error.message}`);
  }
  try {
    return {
      json: JSON.parse(text),
      sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
    };
  } catch (error) {
    throw new GoldenInputError(`the ${what} ${file} is not JSON: ${error.message}`);
  }
}

export function goldenTolerancePct(budgetFile = path.join(HERE, '..', 'perf', 'budget.json')) {
  const pct = JSON.parse(readFileSync(budgetFile, 'utf8')).models?.goldenTolerancePct;
  if (typeof pct !== 'number' || !(pct > 0))
    throw new GoldenInputError('budget.json models.goldenTolerancePct must be a positive number');
  return pct;
}

/** The published number of one anchor row: avgFps for a game row, score for a creator row. */
export function publishedValue(row) {
  const value = typeof row.avgFps === 'number' ? row.avgFps : row.score;
  if (typeof value !== 'number' || !(value > 0))
    throw new GoldenInputError(`anchor ${row.id} has no positive avgFps or score`);
  return value;
}

/** Anchor rows from the given files: { id, file, published }. Ids must be unique across files. */
export function anchorRows(files) {
  const rows = [];
  const seen = new Map();
  for (const { file, json } of files) {
    if (!json || !Array.isArray(json.items))
      throw new GoldenInputError(`${file} must be { "schemaVersion": 1, "items": [ ... ] }`);
    for (const [i, row] of json.items.entries()) {
      if (!row || typeof row.id !== 'string' || !new RegExp(`^${ID}$`).test(row.id))
        throw new GoldenInputError(`${file} item ${i} has no kebab-case "id"`);
      if (seen.has(row.id))
        throw new GoldenInputError(
          `anchor id ${row.id} is in both ${seen.get(row.id)} and ${file}`,
        );
      seen.set(row.id, file);
      rows.push({ id: row.id, file, published: publishedValue(row) });
    }
  }
  if (!rows.length) throw new GoldenInputError('the anchor files hold no rows');
  return rows;
}

/** Golden cases in a Vitest JSON report, from files under testRoot. */
export function goldenCases(report, { repoRoot, testRoot }) {
  if (!report || !Array.isArray(report.testResults))
    throw new GoldenInputError('the Vitest report has no "testResults" list (use --reporter=json)');
  const root = testRoot.replace(/\\/g, '/').replace(/\/+$/, '');
  const cases = [];
  const malformed = [];
  const loadErrors = [];
  for (const file of report.testResults) {
    const rel = path.relative(repoRoot, String(file.name)).split(path.sep).join('/');
    if (rel !== root && !rel.startsWith(`${root}/`)) continue;
    const results = Array.isArray(file.assertionResults) ? file.assertionResults : [];
    if (file.status === 'failed' && results.length === 0)
      loadErrors.push(`${rel} failed to load: ${String(file.message || 'no message')}`);
    for (const t of results) {
      const title = String(t.title);
      if (!GOLDEN_PREFIX_RE.test(title)) continue;
      const m = GOLDEN_RE.exec(title);
      if (!m) {
        malformed.push({ file: rel, title });
        continue;
      }
      const status =
        t.status === 'passed' ? 'passed' : t.status === 'failed' ? 'failed' : 'not run';
      cases.push({ anchorId: m[1], file: rel, title, status });
    }
  }
  return { cases, malformed, loadErrors };
}

/** Parses an estimates file: a list of { anchorId, low, high }. */
export function estimateList(doc) {
  const list = Array.isArray(doc) ? doc : Array.isArray(doc?.estimates) ? doc.estimates : null;
  if (!list)
    throw new GoldenInputError('the estimates file must be an array or { "estimates": [ ... ] }');
  return list.map((e, i) => {
    const ok =
      e &&
      typeof e.anchorId === 'string' &&
      Number.isFinite(e.low) &&
      Number.isFinite(e.high) &&
      e.low <= e.high;
    if (!ok)
      throw new GoldenInputError(`estimate ${i} needs "anchorId" and finite "low" <= "high"`);
    return { anchorId: e.anchorId, low: e.low, high: e.high };
  });
}

/** Ids for a message: at most 12, since the result file lists them all. */
function idList(ids, max = 12) {
  if (ids.length <= max) return ids.join(', ');
  return `${ids.slice(0, max).join(', ')} and ${ids.length - max} more (all in the result file)`;
}

/**
 * The check itself, on parsed inputs.
 * @returns {{ ok: boolean, errors: string[], summary: object, estimates?: object[] }}
 */
export function check({ anchors, cases, malformed = [], estimates = null, tolerancePct }) {
  const errors = [];
  const anchorIds = new Set(anchors.map((a) => a.id));
  const byId = new Map();
  for (const c of cases) byId.set(c.anchorId, [...(byId.get(c.anchorId) ?? []), c]);

  const missing = anchors.filter((a) => !byId.has(a.id)).map((a) => a.id);
  const extra = [...byId.keys()].filter((id) => !anchorIds.has(id));
  const duplicated = [...byId.entries()].filter(([, list]) => list.length > 1).map(([id]) => id);
  const failed = cases.filter((c) => c.status === 'failed');
  const notRun = cases.filter((c) => c.status === 'not run');

  if (cases.length !== anchors.length)
    errors.push(`${cases.length} golden cases for ${anchors.length} anchor rows`);
  if (missing.length)
    errors.push(`${missing.length} anchor(s) with no golden case: ${idList(missing)}`);
  if (extra.length)
    errors.push(`${extra.length} golden case(s) for no anchor row: ${idList(extra)}`);
  if (duplicated.length)
    errors.push(`${duplicated.length} anchor(s) with more than one case: ${idList(duplicated)}`);
  for (const c of failed) errors.push(`golden case failed: ${c.title} (${c.file})`);
  for (const c of notRun) errors.push(`golden case did not run: ${c.title} (${c.file})`);
  for (const m of malformed)
    errors.push(
      `"${m.title}" (${m.file}) is not "[golden] <anchor id>" or "[golden] <anchor id>: <text>"${m.title.includes('…') ? TRUNCATION_HINT : ''}`,
    );

  let estimateRows;
  if (estimates) {
    const published = new Map(anchors.map((a) => [a.id, a.published]));
    const seen = new Set();
    estimateRows = [];
    for (const e of estimates) {
      if (!published.has(e.anchorId)) {
        errors.push(`an estimate for ${e.anchorId}, which is not an anchor row`);
        continue;
      }
      if (seen.has(e.anchorId)) {
        errors.push(`more than one estimate for ${e.anchorId}`);
        continue;
      }
      seen.add(e.anchorId);
      const value = published.get(e.anchorId);
      const midpoint = (e.low + e.high) / 2;
      const errorPct = (Math.abs(midpoint - value) / value) * 100;
      // "Within ±5%" includes 5%. The epsilon (in percentage points) keeps a midpoint exactly 5% off,
      // such as 145.6 × 1.05, from failing on floating-point rounding (5.000000000000004%).
      const within = errorPct <= tolerancePct + 1e-9;
      estimateRows.push({
        anchorId: e.anchorId,
        published: value,
        low: e.low,
        high: e.high,
        midpoint,
        errorPct: Number(errorPct.toFixed(3)),
        within,
        inRange: e.low <= value && value <= e.high,
      });
      if (!within)
        errors.push(
          `${e.anchorId}: midpoint ${midpoint} is ${errorPct.toFixed(2)}% from the published ${value}, over ±${tolerancePct}%`,
        );
    }
    const noEstimate = anchors.filter((a) => !seen.has(a.id)).map((a) => a.id);
    if (noEstimate.length)
      errors.push(`${noEstimate.length} anchor(s) with no estimate: ${idList(noEstimate)}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      anchorRows: anchors.length,
      goldenCases: cases.length,
      equal: cases.length === anchors.length && !missing.length && !extra.length,
      passed: cases.filter((c) => c.status === 'passed').length,
      missing,
      extra,
      duplicated,
      failed: failed.map((c) => c.anchorId),
      notRun: notRun.map((c) => c.anchorId),
      ...(estimateRows && {
        tolerancePct,
        maxErrorPct: estimateRows.reduce((m, r) => Math.max(m, r.errorPct), 0),
        overTolerance: estimateRows.filter((r) => !r.within).map((r) => r.anchorId),
        publishedOutsideRange: estimateRows.filter((r) => !r.inRange).length,
      }),
    },
    ...(estimateRows && { estimates: estimateRows }),
  };
}

export function formatCheck(result) {
  const s = result.summary;
  const lines = [
    `Golden-count check · ${s.anchorRows} anchor rows · ${s.goldenCases} golden cases · ${s.passed} passed`,
  ];
  if (s.tolerancePct !== undefined)
    lines.push(
      `Estimates: max error ${s.maxErrorPct}% against ±${s.tolerancePct}% · ${s.overTolerance.length} over · published value outside the range for ${s.publishedOutsideRange}`,
    );
  if (result.errors.length) {
    lines.push(`${result.errors.length} problem(s):`);
    for (const e of result.errors) lines.push(`  - ${e}`);
  }
  lines.push(result.ok ? 'PASS' : 'FAIL');
  return lines.join('\n');
}

export function main(argv = process.argv.slice(2)) {
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        vitest: { type: 'string' },
        anchors: { type: 'string' },
        estimates: { type: 'string' },
        'test-root': { type: 'string' },
        'repo-root': { type: 'string' },
        json: { type: 'string' },
      },
      strict: true,
    });
    if (!values.vitest) throw new GoldenInputError('--vitest is required');
    const repoRoot = path.resolve(values['repo-root'] ?? '.');
    const testRoot = values['test-root'] ?? 'src/engine';
    const anchorFiles = (values.anchors ?? DEFAULT_ANCHORS.join(','))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const files = anchorFiles.map((file) => {
      const doc = readJson(path.resolve(repoRoot, file), 'anchor file');
      return { file, json: doc.json, sha256: doc.sha256 };
    });
    const vitest = readJson(values.vitest, 'Vitest report');
    const { cases, malformed, loadErrors } = goldenCases(vitest.json, { repoRoot, testRoot });
    if (loadErrors.length)
      throw new GoldenInputError(
        `cannot count the cases in a file that did not load: ${loadErrors.join('; ')}`,
      );
    const estimatesDoc = values.estimates ? readJson(values.estimates, 'estimates file') : null;
    const result = check({
      anchors: anchorRows(files),
      cases,
      malformed,
      estimates: estimatesDoc ? estimateList(estimatesDoc.json) : null,
      tolerancePct: goldenTolerancePct(),
    });
    const inputs = {
      anchors: files.map((f) => ({ file: f.file, sha256: f.sha256 })),
      vitest: { file: values.vitest, sha256: vitest.sha256 },
      ...(estimatesDoc && { estimates: { file: values.estimates, sha256: estimatesDoc.sha256 } }),
      testRoot,
    };
    const out = path.resolve(values.json ?? DEFAULT_OUT);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify({ tool: 'golden-count', inputs, ...result }, null, 2)}\n`);
    process.stdout.write(`${formatCheck(result)}\nResult written to ${out}\n`);
    return result.ok ? 0 : 1;
  } catch (error) {
    // Any failure to measure is exit 2, never 1 (an uncaught exception would exit 1).
    const detail =
      error instanceof GoldenInputError ? error.message : (error?.stack ?? String(error));
    process.stderr.write(`golden-count: ${detail}\n`);
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
