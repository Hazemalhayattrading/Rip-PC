/**
 * Tests for tests/audit/compat-trace.mjs (test plan §9.3). The planted defects go through real
 * Vitest: the fixture suite in fixtures/trace-suite runs once with the JSON reporter, and each
 * scenario is that real report narrowed to one scenario file, plus the file outside the test root.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  formatTrace,
  parseTitle,
  playwrightCases,
  registryIds,
  trace,
  TraceInputError,
  UNIT_KINDS,
  validateRules,
  vitestCases,
} from './compat-trace.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const SUITE = path.join(HERE, 'fixtures', 'trace-suite');
const CLI = path.join(HERE, 'compat-trace.mjs');
const VITEST = path.join(REPO, 'node_modules', 'vitest', 'vitest.mjs');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const fixtureRules = validateRules(readJson(path.join(SUITE, 'rules.json')));
const fixtureRegistry = registryIds(readJson(path.join(SUITE, 'registry.json')));

const temp = [];
afterAll(() => temp.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tempDir = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'compat-trace-'));
  temp.push(dir);
  return dir;
};

let report;
beforeAll(() => {
  const out = path.join(tempDir(), 'vitest-report.json');
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('VITEST')),
  );
  const run = spawnSync(
    process.execPath,
    [
      VITEST,
      'run',
      '--config',
      path.join(SUITE, 'vitest.config.mjs'),
      '--reporter=json',
      `--outputFile=${out}`,
    ],
    { cwd: SUITE, env, encoding: 'utf8', timeout: 60_000 },
  );
  // One scenario plants a failing test, so Vitest exits 1. The report is what the trace reads.
  expect(existsSync(out), `${run.stdout}\n${run.stderr}`).toBe(true);
  report = readJson(out);
}, 60_000);

const posix = (file) => String(file).replace(/\\/g, '/');
function scenario(name) {
  return {
    ...report,
    testResults: report.testResults.filter(
      (f) =>
        posix(f.name).endsWith(`/src/engine/${name}.fixture.mjs`) ||
        posix(f.name).endsWith('/src/lab/outside.fixture.mjs'),
    ),
  };
}
function traceScenario(name, options = {}) {
  const { cases } = vitestCases(scenario(name), { repoRoot: SUITE, testRoot: 'src/engine' });
  return trace({
    rules: fixtureRules,
    registry: fixtureRegistry,
    unitCases: cases,
    allowPending: ['display-output'],
    ...options,
  });
}
const resultOf = (r, id) => r.rules.find((x) => x.id === id);

describe('the real rule set, tests/audit/compat-rules.json', () => {
  const rules = validateRules(readJson(path.join(HERE, 'compat-rules.json')));

  it('holds the 20 rule ids of phase-1-plan §3, in order', () => {
    expect(rules.map((r) => r.id)).toEqual([
      'cpu-socket',
      'cpu-chipset',
      'bios-version',
      'ram-type',
      'ram-slots',
      'ram-speed',
      'gpu-length',
      'gpu-thickness',
      'cooler-height',
      'ram-cooler-clearance',
      'radiator-fit',
      'psu-form-factor',
      'psu-length',
      'psu-wattage',
      'gpu-power-connector',
      'm2-lanes',
      'board-form-factor',
      'usb-c-header',
      'cooler-socket',
      'display-output',
    ]);
  });

  it('never lets bios-version block, and keeps both FlashBack variants (Hazem, plan §6.1)', () => {
    const bios = rules.find((r) => r.id === 'bios-version');
    expect(bios.outcomes).toEqual(['ok', 'warn']);
    const patterns = bios.variants.map((v) => new RegExp(v.pattern, 'i'));
    const withSteps = 'Ryzen 7 9850X3D on the TUF Gaming X870-Plus WiFi, with BIOS FlashBack';
    const without = 'Core i5-14600K on the Prime B760M-A WiFi D4, without BIOS FlashBack';
    expect(patterns.map((p) => p.test(withSteps))).toEqual([true, false]);
    expect(patterns.map((p) => p.test(without))).toEqual([false, true]);
  });
});

describe('test names', () => {
  const known = new Set(['cpu-socket', 'gpu-length']);

  it.each(UNIT_KINDS)('reads the kind "%s"', (kind) => {
    expect(parseTitle(`[gpu-length] ${kind}: a real case`, known, UNIT_KINDS)).toEqual({
      ruleId: 'gpu-length',
      kind,
      description: 'a real case',
    });
  });

  it('keeps colons in the description', () => {
    expect(parseTitle('[cpu-socket] block: AM5: on LGA1851', known, UNIT_KINDS)).toMatchObject({
      kind: 'block',
      description: 'AM5: on LGA1851',
    });
  });

  it.each([
    ['[cpu-socket] okay: x', 'a misspelt kind'],
    ['[cpu-socket] ok:x', 'no space after the colon'],
    ['[cpu-socket] ok: ', 'an empty description'],
    ['[cpu-socket] message: x', 'an e2e kind in a unit test'],
    ['[cpu-socket]ok: x', 'no space after the bracket'],
  ])('flags %s (%s) on a known rule', (title) => {
    expect(parseTitle(title, known, UNIT_KINDS).error).toMatch(/starts with \[cpu-socket\]/);
  });

  it('flags a valid kind on an unknown rule id, and ignores other bracket conventions', () => {
    expect(parseTitle('[gpu-lenght] ok: x', known, UNIT_KINDS).error).toMatch(/unknown rule id/);
    expect(parseTitle('[golden] cb-2026-x: y', known, UNIT_KINDS)).toBeNull();
    expect(parseTitle('reads a plain title', known, UNIT_KINDS)).toBeNull();
  });
});

describe('the clean suite, through real Vitest', () => {
  it('traces every registered rule and leaves the pending one pending', () => {
    const r = traceScenario('clean');
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.rules.map((x) => [x.id, x.result])).toEqual([
      ['cpu-socket', 'TRACED'],
      ['gpu-length', 'TRACED'],
      ['bios-version', 'TRACED'],
      ['display-output', 'PENDING'],
    ]);
    expect(resultOf(r, 'gpu-length').counts).toMatchObject({
      ok: 1,
      block: 1,
      unknown: 1,
      'boundary at': 1,
      'boundary inside': 1,
      'boundary outside': 1,
    });
    expect(resultOf(r, 'bios-version').counts.warn).toBe(2);
  });

  it('does not count a rule-like test outside the test root', () => {
    const { cases, outside } = vitestCases(scenario('clean'), {
      repoRoot: SUITE,
      testRoot: 'src/engine',
    });
    expect(cases.every((c) => c.file.startsWith('src/engine/'))).toBe(true);
    expect(outside).toEqual([
      {
        file: 'src/lab/outside.fixture.mjs',
        title: '[cpu-socket] ok: counted only under src/engine',
      },
    ]);
  });

  it('prints a matrix that marks a missing kind', () => {
    const text = formatTrace(traceScenario('no-unknown'));
    expect(text).toMatch(/^gpu-length\s+1\s+-\s+1\s+0!\s+1\s+1\s+1\s+-\s+UNTRACED$/m);
    expect(text).toMatch(/FAIL$/);
  });
});

describe('planted defects, through real Vitest', () => {
  it.each([
    [
      'kind-typo',
      [
        /unit test "\[cpu-socket\] okay: .*" \(src\/engine\/kind-typo\.fixture\.mjs\) starts with \[cpu-socket\]/,
        /^cpu-socket: no passing "ok" test$/,
      ],
    ],
    [
      'failing-negative',
      [
        /^cpu-socket: no passing "block" test$/,
        /^cpu-socket: the vitest test "\[cpu-socket\] block: .*" failed$/,
      ],
    ],
    ['skipped-boundary', [/^gpu-length: no passing "boundary outside" test$/]],
    ['no-unknown', [/^gpu-length: no passing "unknown" test$/]],
    [
      'variant-missing',
      [/^bios-version: no passing test for the variant warn matching \/\\b\(without\|no\)/],
    ],
    ['id-typo', [/names an unknown rule id "gpu-lenght"/, /^gpu-length: no passing "ok" test$/]],
    [
      'warn-misnamed',
      [
        /is a "warn" test, but test plan §9\.2 gives cpu-socket only ok, block/,
        /^cpu-socket: no passing "unknown" test$/,
      ],
    ],
  ])('%s fails the trace', (name, expected) => {
    const r = traceScenario(name);
    expect(r.ok).toBe(false);
    for (const re of expected)
      expect(
        r.errors.some((e) => re.test(e)),
        `${re}\n${r.errors.join('\n')}`,
      ).toBe(true);
  });

  it('lists a skipped test as not run', () => {
    expect(resultOf(traceScenario('skipped-boundary'), 'gpu-length').notRun).toEqual([
      {
        title: '[gpu-length] boundary outside: a 356 mm card against the 355 mm limit',
        file: 'src/engine/skipped-boundary.fixture.mjs',
      },
    ]);
  });
});

describe('the registry against the rule set', () => {
  it.each([
    [
      'a rule missing from the registry',
      { registry: ['cpu-socket', 'bios-version'] },
      /^gpu-length: not in the engine's registry$/,
    ],
    [
      'an id the plan does not have',
      { registry: [...fixtureRegistry, 'gpu-width'] },
      /the registry has "gpu-width", which is not in test plan §9\.2/,
    ],
    [
      'a duplicate id',
      { registry: [...fixtureRegistry, 'cpu-socket'] },
      /the registry lists "cpu-socket" 2 times/,
    ],
    [
      'a missing rule that is not allowed pending',
      { allowPending: [] },
      /^display-output: not in the engine's registry$/,
    ],
    [
      'a pending rule that the registry already has',
      { allowPending: ['display-output', 'cpu-socket'] },
      /--allow-pending names "cpu-socket", but the registry has it/,
    ],
  ])('fails on %s', (_, options, expected) => {
    const r = traceScenario('clean', options);
    expect(r.ok).toBe(false);
    expect(
      r.errors.some((e) => expected.test(e)),
      r.errors.join('\n'),
    ).toBe(true);
  });

  it('refuses a pending id that is not a rule', () => {
    expect(() => traceScenario('clean', { allowPending: ['no-such-rule'] })).toThrow(
      TraceInputError,
    );
  });

  it('reads the accepted registry shapes', () => {
    expect(registryIds(['a', 'b'])).toEqual(['a', 'b']);
    expect(registryIds([{ id: 'a' }])).toEqual(['a']);
    expect(registryIds({ rules: [{ id: 'a' }, 'b'] })).toEqual(['a', 'b']);
    expect(() => registryIds({ ids: [] })).toThrow(TraceInputError);
    expect(() => registryIds([{ name: 'a' }])).toThrow(TraceInputError);
  });
});

describe('the rule set is validated', () => {
  const base = { id: 'cpu-socket', outcomes: ['ok', 'block'], numeric: false, unknownData: true };
  it.each([
    ['no ok outcome', { ...base, outcomes: ['block'] }],
    ['no negative outcome', { ...base, outcomes: ['ok'] }],
    ['an unknown status', { ...base, outcomes: ['ok', 'fail'] }],
    ['a repeated status', { ...base, outcomes: ['ok', 'block', 'block'] }],
    ['a missing numeric flag', { ...base, numeric: undefined }],
    ['a variant that does not compile', { ...base, variants: [{ kind: 'warn', pattern: '(' }] }],
    ['a variant with an e2e kind', { ...base, variants: [{ kind: 'message', pattern: 'x' }] }],
    ['a non-kebab id', { ...base, id: 'CPU_socket' }],
  ])('refuses %s', (_, rule) => {
    expect(() => validateRules({ schemaVersion: 1, rules: [rule] })).toThrow(TraceInputError);
  });

  it('refuses a duplicate id and an empty set', () => {
    expect(() => validateRules({ schemaVersion: 1, rules: [base, base] })).toThrow(/duplicate/);
    expect(() => validateRules({ schemaVersion: 1, rules: [] })).toThrow(TraceInputError);
  });
});

describe('Playwright message checks (from Phase 2)', () => {
  // The shape of @playwright/test 1.56.1's JSONReport (types/testReporter.d.ts).
  const pwReport = (specs) => ({
    suites: [
      {
        title: 'lab.spec.ts',
        file: 'tests/e2e/lab.spec.ts',
        specs: [],
        suites: [{ title: 'compat', file: 'tests/e2e/lab.spec.ts', specs }],
      },
    ],
  });
  const spec = (title, statuses) => ({
    title,
    file: 'tests/e2e/lab.spec.ts',
    tests: statuses.map((status, i) => ({
      projectName: `e2e-${i}`,
      expectedStatus: 'passed',
      status,
    })),
  });
  const clean = vitestCasesOf('clean');
  function vitestCasesOf(name) {
    return () => vitestCases(scenario(name), { repoRoot: SUITE, testRoot: 'src/engine' }).cases;
  }
  const messages = (status) =>
    ['cpu-socket', 'gpu-length', 'bios-version'].map((id) =>
      spec(`[${id}] message: the lab shows the engine's reason`, status),
    );
  const run = (e2e) =>
    trace({
      rules: fixtureRules,
      registry: fixtureRegistry,
      unitCases: clean(),
      e2eCases: playwrightCases(pwReport(e2e), { repoRoot: REPO }),
      requireE2e: true,
      allowPending: ['display-output'],
    });

  it('passes when every rule has a passing message check in every project it ran in', () => {
    expect(run(messages(['expected', 'expected', 'skipped'])).errors).toEqual([]);
  });

  it('fails a message check that failed in one project, or was flaky', () => {
    const failed = run(messages(['expected', 'unexpected']));
    expect(failed.errors).toContain(
      `cpu-socket: the playwright test "[cpu-socket] message: the lab shows the engine's reason" failed`,
    );
    const flaky = run(messages(['flaky']));
    expect(flaky.errors.some((e) => /is flaky$/.test(e))).toBe(true);
  });

  it('needs a message check for every rule once --require-e2e is on', () => {
    const r = run(messages(['expected']).slice(1));
    expect(r.errors).toContain('cpu-socket: no passing "message" test');
  });

  it('flags a unit kind in an e2e test', () => {
    const r = run([
      ...messages(['expected']),
      spec('[gpu-length] ok: in the browser', ['expected']),
    ]);
    expect(r.errors.some((e) => /e2e test "\[gpu-length\] ok: in the browser"/.test(e))).toBe(true);
  });
});

describe('the command line', () => {
  function cli(args) {
    const dir = tempDir();
    const out = path.join(dir, 'matrix.json');
    const r = spawnSync(process.execPath, [CLI, ...args, '--json', out], {
      cwd: REPO,
      encoding: 'utf8',
    });
    return { ...r, matrix: existsSync(out) ? readJson(out) : null };
  }
  function reportFile(content) {
    const file = path.join(tempDir(), 'report.json');
    writeFileSync(file, JSON.stringify(content));
    return file;
  }
  const common = (report) => [
    '--rules',
    path.join(SUITE, 'rules.json'),
    '--registry',
    path.join(SUITE, 'registry.json'),
    '--vitest',
    reportFile(report),
    '--repo-root',
    SUITE,
  ];

  it('exits 0 on the clean suite and writes the matrix with input checksums', () => {
    const r = cli([...common(scenario('clean')), '--allow-pending', 'display-output']);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/PASS/);
    expect(r.stdout).toMatch(/Not counted: 1 rule-like test name/);
    expect(r.matrix.inputs.vitest.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(r.matrix.summary).toMatchObject({ traced: 3, pending: ['display-output'] });
  });

  it('exits 1 on a planted defect', () => {
    const r = cli([...common(scenario('no-unknown')), '--allow-pending', 'display-output']);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/gpu-length: no passing "unknown" test/);
  });

  it('exits 2 when it cannot measure', () => {
    expect(cli(['--vitest', 'x.json']).status).toBe(2);
    expect(cli([...common(scenario('clean')), '--registry', 'no-such-file.json']).status).toBe(2);
    const broken = {
      testResults: [
        {
          name: path.join(SUITE, 'src', 'engine', 'broken.fixture.mjs'),
          status: 'failed',
          message: 'SyntaxError: Unexpected token',
          assertionResults: [],
        },
      ],
    };
    const r = cli(common(broken));
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/did not load: src\/engine\/broken\.fixture\.mjs failed to load/);
    expect(cli([...common(scenario('clean')), '--require-e2e']).status).toBe(2);
  });
});
