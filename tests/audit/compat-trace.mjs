#!/usr/bin/env node
/**
 * Compatibility traceability check (docs/qa/test-plan.md §9.3, BUILD_PROMPT §8 "Every compatibility
 * rule has a passing positive and negative test"). Owner: qa-lead. Zero dependencies, Node >= 22.
 *
 * It reads three things, and never the engine's code:
 *   - QA's expected rule set, tests/audit/compat-rules.json (test plan §9.2);
 *   - the engine's rule registry, as JSON from the engine dump script;
 *   - the Vitest JSON report of the unit run and, from Phase 2, the Playwright JSON report.
 *
 * A rule test is named by its own title (not its describe blocks):
 *   [<rule-id>] <kind>: <description>
 *   kind, in Vitest under --test-root: ok | warn | block | unknown | boundary at | boundary inside | boundary outside
 *   kind, in Playwright:               message
 * Every rule in the registry needs a passing test of each kind compat-rules.json requires for it, and
 * none of its tests may fail. Every rule in compat-rules.json must be in the registry, unless
 * --allow-pending names it. A misspelt kind, or a valid kind on an unknown rule id, is an error, so a
 * typo cannot quietly drop a test out of the count.
 *
 * A rule that reads only required fields has no unknown-data test. Instead, each validator test its
 * "requiredFields" names must pass, in a file under --data-test-root (the Director's ruling,
 * 2026-10-02, phase-1-plan WP-E1). When the registry holds the engine's RuleSpec objects, their
 * "outcomes", "numeric" and "unknownData" must equal compat-rules.json's, so the two sides cannot
 * drift apart.
 *
 * Usage:
 *   node tests/audit/compat-trace.mjs --registry <rules.json> --vitest <vitest-report.json>
 *     [--playwright <playwright-report.json>] [--require-e2e] [--allow-pending <id,id,...>]
 *     [--rules tests/audit/compat-rules.json] [--test-root src/engine] [--data-test-root src/data]
 *     [--repo-root .] [--json <out>]
 * The registry is a JSON array of ids or of { id } objects, or an object holding one under "rules".
 * Exit codes: 0 every rule traced · 1 a rule is untraced, a rule test failed or a name is wrong ·
 * 2 cannot measure (bad input, or a test file under --test-root that failed to load).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_RULES = path.join(HERE, 'compat-rules.json');
export const DEFAULT_OUT = path.join('artifacts', 'qa', 'compat-trace', 'compat-trace.json');

export const STATUSES = ['ok', 'warn', 'block'];
export const UNIT_KINDS = [
  'ok',
  'warn',
  'block',
  'unknown',
  'boundary at',
  'boundary inside',
  'boundary outside',
];
export const E2E_KINDS = ['message'];
/** How compat-rules.json proves that a field a rule reads cannot be unpublished. */
export const PROOFS = ['null-rejected', 'empty-rejected', 'validator', 'none-by-definition'];
const BOUNDARY_KINDS = ['boundary at', 'boundary inside', 'boundary outside'];
const ID = '[a-z0-9]+(?:-[a-z0-9]+)*';
const ID_RE = new RegExp(`^${ID}$`);
const PREFIX_RE = new RegExp(`^\\[(${ID})\\]`);
const TITLE_RE = new RegExp(`^\\[(${ID})\\] ([a-z]+(?: [a-z]+)?): (\\S.*)$`);

/** Bad input: the checker cannot measure. */
export class TraceInputError extends Error {}

export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function readJson(file, what) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    throw new TraceInputError(`cannot read the ${what} ${file}: ${error.message}`);
  }
  try {
    return { json: JSON.parse(text), sha256: sha256(text) };
  } catch (error) {
    throw new TraceInputError(`the ${what} ${file} is not JSON: ${error.message}`);
  }
}

/** Validates QA's rule set and returns its rules. */
export function validateRules(doc) {
  if (!doc || doc.schemaVersion !== 1 || !Array.isArray(doc.rules) || doc.rules.length === 0)
    throw new TraceInputError('the rule set must be { "schemaVersion": 1, "rules": [ ... ] }');
  const seen = new Set();
  for (const [i, r] of doc.rules.entries()) {
    const where = `rule set entry ${i}`;
    if (!r || typeof r.id !== 'string' || !ID_RE.test(r.id))
      throw new TraceInputError(`${where}: "id" must be a kebab-case string`);
    if (seen.has(r.id)) throw new TraceInputError(`${where}: duplicate rule id ${r.id}`);
    seen.add(r.id);
    if (
      !Array.isArray(r.outcomes) ||
      !r.outcomes.includes('ok') ||
      !r.outcomes.some((s) => s !== 'ok') ||
      r.outcomes.some((s) => !STATUSES.includes(s)) ||
      new Set(r.outcomes).size !== r.outcomes.length
    )
      throw new TraceInputError(
        `${r.id}: "outcomes" must hold "ok" and at least one of "warn" and "block", each once`,
      );
    if (typeof r.numeric !== 'boolean' || typeof r.unknownData !== 'boolean')
      throw new TraceInputError(`${r.id}: "numeric" and "unknownData" must be true or false`);
    if (r.unknownData) {
      if (r.requiredFields !== undefined)
        throw new TraceInputError(`${r.id}: a rule with unknown data has no "requiredFields"`);
      if (
        !Array.isArray(r.unpublishable) ||
        r.unpublishable.length === 0 ||
        r.unpublishable.some((u) => typeof u !== 'string' || u === '')
      )
        throw new TraceInputError(
          `${r.id}: "unpublishable" must list the values that can be unpublished`,
        );
    } else {
      if (r.unpublishable !== undefined)
        throw new TraceInputError(`${r.id}: a rule without unknown data has no "unpublishable"`);
      if (!Array.isArray(r.requiredFields) || r.requiredFields.length === 0)
        throw new TraceInputError(
          `${r.id}: a rule without unknown data must list its "requiredFields" and their proofs`,
        );
      for (const [j, f] of r.requiredFields.entries()) {
        const named = typeof f?.test === 'string' && f.test !== '';
        if (
          !f ||
          typeof f.field !== 'string' ||
          !PROOFS.includes(f.proof) ||
          (f.proof === 'none-by-definition' ? f.test !== null || !f.why : !named)
        )
          throw new TraceInputError(
            `${r.id}: requiredFields ${j} needs a "field", a "proof" of ${PROOFS.join(', ')}, and the test that proves it (null, with a "why", only for none-by-definition)`,
          );
      }
    }
    for (const [j, v] of (r.variants ?? []).entries()) {
      if (!v || !UNIT_KINDS.includes(v.kind) || typeof v.pattern !== 'string')
        throw new TraceInputError(`${r.id}: variant ${j} needs a unit-test "kind" and a "pattern"`);
      try {
        new RegExp(v.pattern, 'i');
      } catch (error) {
        throw new TraceInputError(
          `${r.id}: variant ${j} pattern does not compile: ${error.message}`,
        );
      }
    }
  }
  return doc.rules;
}

/**
 * The engine's registry entries, from any of the accepted shapes: { id, outcomes, numeric }, where
 * outcomes, numeric and unknownData are null when the registry does not give them. Duplicates are kept.
 */
export function registryEntries(doc) {
  const list = Array.isArray(doc) ? doc : Array.isArray(doc?.rules) ? doc.rules : null;
  if (!list)
    throw new TraceInputError(
      'the registry must be a JSON array of rule ids or { id } objects, or { "rules": [ ... ] }',
    );
  return list.map((entry, i) => {
    const id = typeof entry === 'string' ? entry : entry?.id;
    if (typeof id !== 'string' || id === '')
      throw new TraceInputError(`registry entry ${i} has no rule id`);
    const outcomes = Array.isArray(entry?.outcomes) ? entry.outcomes.map(String) : null;
    const numeric = typeof entry?.numeric === 'boolean' ? entry.numeric : null;
    const unknownData = typeof entry?.unknownData === 'boolean' ? entry.unknownData : null;
    return { id, outcomes, numeric, unknownData };
  });
}

/** The engine's registry ids. Duplicates are kept for the check. */
export function registryIds(doc) {
  return registryEntries(doc).map((e) => e.id);
}

/** Splits a test title into its rule id, kind and description, or says why it is malformed. */
export function parseTitle(title, knownIds, allowedKinds) {
  const prefix = PREFIX_RE.exec(title);
  if (!prefix) return null;
  const full = TITLE_RE.exec(title);
  const known = knownIds.has(prefix[1]);
  if (full && allowedKinds.includes(full[2])) {
    if (!known) return { error: `names an unknown rule id "${prefix[1]}"` };
    return { ruleId: full[1], kind: full[2], description: full[3] };
  }
  if (!known) return null; // some other bracketed convention, such as [golden]
  return {
    error: `starts with [${prefix[1]}] but is not "[${prefix[1]}] <kind>: <description>" with a kind of ${allowedKinds.join(', ')}`,
  };
}

/** "[<id>] <unit kind>: <text>": a rule test by its shape, whatever the id. */
function looksLikeRuleTest(title) {
  const m = TITLE_RE.exec(title);
  return m !== null && UNIT_KINDS.includes(m[2]);
}

function relativeTo(repoRoot, file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function underRoot(rel, testRoot) {
  const root = testRoot.replace(/\\/g, '/').replace(/\/+$/, '');
  return rel === root || rel.startsWith(`${root}/`);
}

/**
 * Test cases from a Vitest JSON report. Only files under testRoot count; titles elsewhere that look
 * like rule tests are returned in `outside`, so the report can name them.
 */
export function vitestCases(report, { repoRoot, testRoot }) {
  if (!report || !Array.isArray(report.testResults))
    throw new TraceInputError('the Vitest report has no "testResults" list (use --reporter=json)');
  const cases = [];
  const outside = [];
  const loadErrors = [];
  for (const file of report.testResults) {
    const rel = relativeTo(repoRoot, String(file.name));
    const results = Array.isArray(file.assertionResults) ? file.assertionResults : [];
    if (!underRoot(rel, testRoot)) {
      for (const t of results)
        if (looksLikeRuleTest(String(t.title))) outside.push({ file: rel, title: String(t.title) });
      continue;
    }
    if (file.status === 'failed' && results.length === 0)
      loadErrors.push(`${rel} failed to load: ${String(file.message || 'no message')}`);
    for (const t of results) {
      const status =
        t.status === 'passed' ? 'passed' : t.status === 'failed' ? 'failed' : 'not run';
      cases.push({ source: 'vitest', file: rel, title: String(t.title), status });
    }
  }
  return { cases, outside, loadErrors };
}

/**
 * Every test in files under dataTestRoot, by title: the validator tests that prove a field cannot
 * be unpublished. A file there that failed to load is a load error, as under the test root.
 */
export function dataTestCases(report, { repoRoot, dataTestRoot }) {
  if (!report || !Array.isArray(report.testResults))
    throw new TraceInputError('the Vitest report has no "testResults" list (use --reporter=json)');
  const cases = [];
  const loadErrors = [];
  for (const file of report.testResults) {
    const rel = relativeTo(repoRoot, String(file.name));
    if (!underRoot(rel, dataTestRoot)) continue;
    const results = Array.isArray(file.assertionResults) ? file.assertionResults : [];
    if (file.status === 'failed' && results.length === 0)
      loadErrors.push(`${rel} failed to load: ${String(file.message || 'no message')}`);
    for (const t of results) {
      const status =
        t.status === 'passed' ? 'passed' : t.status === 'failed' ? 'failed' : 'not run';
      cases.push({ file: rel, title: String(t.title), status });
    }
  }
  return { cases, loadErrors };
}

/** Test cases from a Playwright JSON report: one per spec, over every project it ran in. */
export function playwrightCases(report, { repoRoot }) {
  if (!report || !Array.isArray(report.suites))
    throw new TraceInputError('the Playwright report has no "suites" list (use --reporter=json)');
  const cases = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      const tests = spec.tests ?? [];
      let status = 'not run';
      if (tests.some((t) => t.status === 'unexpected')) status = 'failed';
      else if (tests.some((t) => t.status === 'flaky')) status = 'flaky';
      else if (tests.some((t) => t.status === 'expected' && t.expectedStatus === 'passed'))
        status = 'passed';
      const file = spec.file ?? suite.file ?? '';
      cases.push({
        source: 'playwright',
        file: path.isAbsolute(file) ? relativeTo(repoRoot, file) : file.replace(/\\/g, '/'),
        title: String(spec.title),
        status,
      });
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites) walk(suite);
  return cases;
}

/** What a rule needs: one passing test of each kind, plus each variant. */
export function requiredKinds(rule, { requireE2e = false } = {}) {
  const kinds = [...rule.outcomes];
  if (rule.unknownData) kinds.push('unknown');
  if (rule.numeric) kinds.push(...BOUNDARY_KINDS);
  if (requireE2e) kinds.push('message');
  return kinds;
}

/**
 * The trace itself, on parsed inputs.
 * @returns {{ ok: boolean, rules: object[], errors: string[], summary: object }}
 */
export function trace({
  rules,
  registry,
  registrySpecs = [],
  unitCases,
  dataCases = [],
  e2eCases = [],
  requireE2e = false,
  allowPending = [],
}) {
  const errors = [];
  const known = new Set(rules.map((r) => r.id));
  for (const id of allowPending)
    if (!known.has(id))
      throw new TraceInputError(
        `--allow-pending names "${id}", which is not a rule in the rule set`,
      );

  const inRegistry = new Map();
  for (const id of registry) inRegistry.set(id, (inRegistry.get(id) ?? 0) + 1);
  for (const [id, n] of inRegistry) {
    if (!known.has(id))
      errors.push(
        `the registry has "${id}", which is not in test plan §9.2: agree the id with QA first`,
      );
    if (n > 1) errors.push(`the registry lists "${id}" ${n} times`);
  }

  // The engine's RuleSpec against test plan §9.2, where the registry gives them.
  const byId = new Map(rules.map((r) => [r.id, r]));
  const sorted = (list) => STATUSES.filter((s) => list.includes(s));
  for (const spec of registrySpecs) {
    const rule = byId.get(spec.id);
    if (!rule) continue;
    if (spec.outcomes && sorted(spec.outcomes).join() !== sorted(rule.outcomes).join())
      errors.push(
        `${spec.id}: the registry gives the outcomes ${spec.outcomes.join(', ')}, test plan §9.2 gives ${rule.outcomes.join(', ')}`,
      );
    if (spec.numeric !== null && spec.numeric !== rule.numeric)
      errors.push(
        `${spec.id}: the registry says numeric is ${spec.numeric}, test plan §9.2 says ${rule.numeric}`,
      );
    if (spec.unknownData !== null && spec.unknownData !== rule.unknownData)
      errors.push(
        `${spec.id}: the registry says unknownData is ${spec.unknownData}, test plan §9.2 says ${rule.unknownData}`,
      );
  }
  for (const id of allowPending)
    if (inRegistry.has(id))
      errors.push(`--allow-pending names "${id}", but the registry has it: take it off the list`);

  const byRule = new Map(rules.map((r) => [r.id, []]));
  const outcomesOf = new Map(rules.map((r) => [r.id, r.outcomes]));
  const record = (c, allowedKinds, where) => {
    const parsed = parseTitle(c.title, known, allowedKinds);
    if (!parsed) return;
    if (parsed.error) {
      errors.push(`${where} test "${c.title}" (${c.file}) ${parsed.error}`);
      return;
    }
    // A status the agreed outcome set leaves out: often an unknown-data test named "warn:".
    if (STATUSES.includes(parsed.kind) && !outcomesOf.get(parsed.ruleId).includes(parsed.kind))
      errors.push(
        `${where} test "${c.title}" (${c.file}) is a "${parsed.kind}" test, but test plan §9.2 gives ${parsed.ruleId} only ${outcomesOf.get(parsed.ruleId).join(', ')}: name unknown-data tests "unknown:", or agree the outcome set with QA`,
      );
    byRule.get(parsed.ruleId).push({ ...c, kind: parsed.kind, description: parsed.description });
  };
  for (const c of unitCases) record(c, UNIT_KINDS, 'unit');
  for (const c of e2eCases) record(c, E2E_KINDS, 'e2e');

  const out = [];
  for (const rule of rules) {
    const tests = byRule.get(rule.id);
    const pending = !inRegistry.has(rule.id) && allowPending.includes(rule.id);
    const required = requiredKinds(rule, { requireE2e });
    const passing = (kind) => tests.filter((t) => t.kind === kind && t.status === 'passed');
    const counts = Object.fromEntries(
      [...UNIT_KINDS, ...E2E_KINDS].map((k) => [k, passing(k).length]),
    );
    const missing = required.filter((k) => counts[k] === 0);
    const missingVariants = (rule.variants ?? [])
      .filter((v) => !passing(v.kind).some((t) => new RegExp(v.pattern, 'i').test(t.description)))
      .map((v) => `${v.kind} matching /${v.pattern}/i`);
    const failing = tests.filter((t) => t.status === 'failed' || t.status === 'flaky');
    const notRun = tests.filter((t) => t.status === 'not run');
    // The Director's unknown-data ruling (2026-10-02): a rule that reads only required fields
    // proves it with validator tests, and each of them must pass.
    const fieldProofs = (rule.requiredFields ?? []).map((f) => {
      if (f.test === null) return { field: f.field, proof: f.proof, test: null, status: 'n/a' };
      const found = dataCases.filter((c) => c.title === f.test);
      const status = found.some((c) => c.status === 'failed')
        ? 'failed'
        : found.some((c) => c.status === 'passed')
          ? 'passed'
          : found.length
            ? 'not run'
            : 'missing';
      return { field: f.field, proof: f.proof, test: f.test, status };
    });
    const unproven = fieldProofs.filter((f) => f.status !== 'passed' && f.status !== 'n/a');
    let result;
    if (!inRegistry.has(rule.id)) {
      result = pending ? 'PENDING' : 'NOT IN REGISTRY';
      if (!pending) errors.push(`${rule.id}: not in the engine's registry`);
    } else {
      result =
        missing.length || missingVariants.length || failing.length || unproven.length
          ? 'UNTRACED'
          : 'TRACED';
      if (missing.length) errors.push(`${rule.id}: no passing "${missing.join('", "')}" test`);
      if (missingVariants.length)
        errors.push(`${rule.id}: no passing test for the variant ${missingVariants.join('; ')}`);
      for (const f of unproven)
        errors.push(
          `${rule.id}: the validator test "${f.test}" for ${f.field} ${f.status === 'missing' ? 'is missing' : f.status === 'failed' ? 'failed' : 'did not run'} (unknown-data ruling, 2026-10-02)`,
        );
    }
    for (const t of failing)
      errors.push(
        `${rule.id}: the ${t.source} test "${t.title}" ${t.status === 'flaky' ? 'is flaky' : 'failed'}`,
      );
    out.push({
      id: rule.id,
      result,
      required,
      counts,
      missing,
      missingVariants,
      failing: failing.map((t) => ({ title: t.title, file: t.file, status: t.status })),
      notRun: notRun.map((t) => ({ title: t.title, file: t.file })),
      fieldProofs,
      tests: tests.map((t) => ({ kind: t.kind, title: t.title, file: t.file, status: t.status })),
    });
  }

  const count = (r) => out.filter((x) => x.result === r).length;
  return {
    ok: errors.length === 0,
    errors,
    rules: out,
    summary: {
      rulesInPlan: rules.length,
      inRegistry: inRegistry.size,
      traced: count('TRACED'),
      untraced: count('UNTRACED'),
      pending: out.filter((x) => x.result === 'PENDING').map((x) => x.id),
      notInRegistry: out.filter((x) => x.result === 'NOT IN REGISTRY').map((x) => x.id),
      requireE2e,
    },
  };
}

const COLUMNS = [
  ['ok', 'ok'],
  ['warn', 'warn'],
  ['block', 'block'],
  ['unknown', 'unk'],
  ['boundary at', 'b-at'],
  ['boundary inside', 'b-in'],
  ['boundary outside', 'b-out'],
  ['message', 'e2e'],
];

/**
 * A text matrix of passing tests per kind: "-" not required, "0!" required and missing. "fields" is
 * the passing validator tests over those required, for a rule without unknown data. A rule not in
 * the registry shows its counts only, since nothing is required of it yet.
 */
export function formatTrace(result) {
  const s = result.summary;
  const width = Math.max(...result.rules.map((r) => r.id.length), 4) + 2;
  const lines = [
    `Compatibility trace · ${s.rulesInPlan} rules in test plan §9.2 · ${s.inRegistry} in the registry · ${s.traced} traced, ${s.untraced} untraced, ${s.pending.length} pending`,
    `${'rule'.padEnd(width)}${COLUMNS.map(([, h]) => h.padStart(6)).join('')}  fields  result`,
  ];
  for (const r of result.rules) {
    const registered = r.result === 'TRACED' || r.result === 'UNTRACED';
    const cells = COLUMNS.map(([kind]) => {
      if (!registered || !r.required.includes(kind))
        return (r.counts[kind] ? String(r.counts[kind]) : '-').padStart(6);
      return (r.counts[kind] ? String(r.counts[kind]) : '0!').padStart(6);
    });
    const proofs = r.fieldProofs.filter((f) => f.status !== 'n/a');
    const fields = proofs.length
      ? `${proofs.filter((f) => f.status === 'passed').length}/${proofs.length}`
      : '-';
    lines.push(`${r.id.padEnd(width)}${cells.join('')}  ${fields.padStart(6)}  ${r.result}`);
  }
  if (result.errors.length) {
    lines.push('', `${result.errors.length} problem(s):`);
    for (const e of result.errors) lines.push(`  - ${e}`);
  }
  lines.push('', result.ok ? 'PASS' : 'FAIL');
  return lines.join('\n');
}

export function main(argv = process.argv.slice(2)) {
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        rules: { type: 'string' },
        registry: { type: 'string' },
        vitest: { type: 'string' },
        playwright: { type: 'string' },
        'require-e2e': { type: 'boolean' },
        'allow-pending': { type: 'string' },
        'test-root': { type: 'string' },
        'data-test-root': { type: 'string' },
        'repo-root': { type: 'string' },
        json: { type: 'string' },
      },
      strict: true,
    });
    if (!values.registry) throw new TraceInputError('--registry is required');
    if (!values.vitest) throw new TraceInputError('--vitest is required');
    if (values['require-e2e'] && !values.playwright)
      throw new TraceInputError('--require-e2e needs --playwright');
    const repoRoot = path.resolve(values['repo-root'] ?? '.');
    const testRoot = values['test-root'] ?? 'src/engine';
    const dataTestRoot = values['data-test-root'] ?? 'src/data';
    const rulesFile = values.rules ?? DEFAULT_RULES;
    const rulesDoc = readJson(rulesFile, 'rule set');
    const registryDoc = readJson(values.registry, 'registry');
    const vitestDoc = readJson(values.vitest, 'Vitest report');
    const playwrightDoc = values.playwright
      ? readJson(values.playwright, 'Playwright report')
      : null;
    const rules = validateRules(rulesDoc.json);
    const {
      cases: unitCases,
      outside,
      loadErrors,
    } = vitestCases(vitestDoc.json, { repoRoot, testRoot });
    const data = dataTestCases(vitestDoc.json, { repoRoot, dataTestRoot });
    if (loadErrors.length || data.loadErrors.length)
      throw new TraceInputError(
        `cannot count the tests in a file that did not load: ${[...loadErrors, ...data.loadErrors].join('; ')}`,
      );
    const allowPending = (values['allow-pending'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const entries = registryEntries(registryDoc.json);
    const result = trace({
      rules,
      registry: entries.map((e) => e.id),
      registrySpecs: entries,
      unitCases,
      dataCases: data.cases,
      e2eCases: playwrightDoc ? playwrightCases(playwrightDoc.json, { repoRoot }) : [],
      requireE2e: Boolean(values['require-e2e']),
      allowPending,
    });
    const inputs = {
      rules: { file: rulesFile, sha256: rulesDoc.sha256 },
      registry: { file: values.registry, sha256: registryDoc.sha256 },
      vitest: { file: values.vitest, sha256: vitestDoc.sha256 },
      ...(playwrightDoc && {
        playwright: { file: values.playwright, sha256: playwrightDoc.sha256 },
      }),
      testRoot,
      dataTestRoot,
      allowPending,
    };
    const out = path.resolve(values.json ?? DEFAULT_OUT);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(
      out,
      `${JSON.stringify({ tool: 'compat-trace', inputs, ...result, outsideTestRoot: outside }, null, 2)}\n`,
    );
    const note = outside.length
      ? `\nNot counted: ${outside.length} rule-like test name(s) outside ${testRoot} (listed in the matrix file).`
      : '';
    process.stdout.write(`${formatTrace(result)}${note}\nMatrix written to ${out}\n`);
    return result.ok ? 0 : 1;
  } catch (error) {
    // Any failure to measure is exit 2, never 1: an uncaught exception would exit 1 and read as a
    // trace failure.
    const detail =
      error instanceof TraceInputError ? error.message : (error?.stack ?? String(error));
    process.stderr.write(`compat-trace: ${detail}\n`);
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
