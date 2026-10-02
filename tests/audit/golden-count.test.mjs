/**
 * Tests for tests/audit/golden-count.mjs (test plan §8). The planted defects go through real Vitest:
 * the fixture suite in fixtures/golden-suite, generated from its anchor files with it.each as the
 * engine's golden test will be, runs once with the JSON reporter. Each scenario is that real report
 * narrowed to one scenario file, plus the file outside the test root.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  anchorRows,
  check,
  DEFAULT_ANCHORS,
  estimateList,
  formatCheck,
  GoldenInputError,
  goldenCases,
  goldenTolerancePct,
  TRUNCATION_HINT,
} from './golden-count.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const SUITE = path.join(HERE, 'fixtures', 'golden-suite');
const CLI = path.join(HERE, 'golden-count.mjs');
const VITEST = path.join(REPO, 'node_modules', 'vitest', 'vitest.mjs');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const fixtureFiles = DEFAULT_ANCHORS.map((file) => ({
  file,
  json: readJson(path.join(SUITE, file)),
}));
const anchors = anchorRows(fixtureFiles);

const temp = [];
afterAll(() => temp.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tempDir = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'golden-count-'));
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
  // One scenario plants a failing case, so Vitest exits 1. The report is what the check reads.
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
function checkScenario(name, estimates = null) {
  const { cases, malformed } = goldenCases(scenario(name), {
    repoRoot: SUITE,
    testRoot: 'src/engine',
  });
  return check({ anchors, cases, malformed, estimates, tolerancePct: 5 });
}
const [first, second] = anchors.map((a) => a.id);

describe('the real anchor files', () => {
  it('give 143 anchor rows today: 116 game and 27 creator (phase-1-plan §4)', () => {
    const files = DEFAULT_ANCHORS.map((file) => ({
      file,
      json: readJson(path.join(REPO, file)),
    }));
    const rows = anchorRows(files);
    expect(rows).toHaveLength(143);
    expect(rows.filter((r) => r.file.endsWith('game.json'))).toHaveLength(116);
  });

  it('use the tolerance in budget.json, ±5% (BUILD_PROMPT §5.3)', () => {
    expect(goldenTolerancePct()).toBe(5);
  });
});

describe('the clean suite, through real Vitest', () => {
  it('passes with one passing case per anchor row', () => {
    const r = checkScenario('clean');
    expect(r.errors).toEqual([]);
    expect(r.summary).toMatchObject({ anchorRows: 5, goldenCases: 5, equal: true, passed: 5 });
  });

  it('does not count a golden-named case outside the test root, or a plain test', () => {
    const { cases } = goldenCases(scenario('clean'), { repoRoot: SUITE, testRoot: 'src/engine' });
    expect(cases.map((c) => c.file)).toEqual(Array(5).fill('src/engine/clean.fixture.mjs'));
  });
});

describe('planted defects, through real Vitest', () => {
  it('duplicate: equal counts, but one anchor has no case and another has two', () => {
    const r = checkScenario('duplicate');
    expect(r.summary.goldenCases).toBe(r.summary.anchorRows);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain(`1 anchor(s) with no golden case: ${first}`);
    expect(r.errors).toContain(`1 anchor(s) with more than one case: ${second}`);
  });

  it.each([
    ['missing', [`4 golden cases for 5 anchor rows`, `1 anchor(s) with no golden case: ${first}`]],
    [
      'extra',
      [
        '6 golden cases for 5 anchor rows',
        '1 golden case(s) for no anchor row: tpu-not-an-anchor-row',
      ],
    ],
    [
      'failing',
      [
        `golden case failed: [golden] ${first}: reproduces the published number within ±5% (src/engine/failing.fixture.mjs)`,
      ],
    ],
    [
      'skipped',
      [
        `golden case did not run: [golden] ${first}: reproduces the published number within ±5% (src/engine/skipped.fixture.mjs)`,
      ],
    ],
    [
      'malformed',
      [
        `"[golden]${first}" (src/engine/malformed.fixture.mjs) is not "[golden] <anchor id>" or "[golden] <anchor id>: <text>"`,
      ],
    ],
  ])('%s fails the check', (name, expected) => {
    const r = checkScenario(name);
    expect(r.ok).toBe(false);
    for (const e of expected) expect(r.errors, r.errors.join('\n')).toContain(e);
  });

  it('truncated: it.each with "$id" cuts long ids at 40 characters, and the check says why', () => {
    const r = checkScenario('truncated');
    expect(r.ok).toBe(false);
    expect(r.summary.goldenCases).toBe(0);
    const cut = r.errors.filter((e) => e.endsWith(TRUNCATION_HINT));
    // The 5 fixture ids are 55 to 69 characters long, so every title is cut to 39 characters + "…".
    expect(cut).toHaveLength(5);
    expect(cut[0]).toMatch(/^"\[golden\] cb-2026-battlefield-6-1440p-raster-nvid…: /);
  });
});

describe('the tolerance, from the engine output', () => {
  const at = (factor) =>
    anchors.map((a) => ({ anchorId: a.id, low: a.published * factor, high: a.published * factor }));

  it('passes estimates whose midpoint is within ±5%, exactly 5% included', () => {
    for (const factor of [1, 0.95, 1.05]) {
      const r = checkScenario('clean', at(factor));
      expect(r.errors, `factor ${factor}`).toEqual([]);
    }
    const wide = anchors.map((a) => ({
      anchorId: a.id,
      low: a.published * 0.9,
      high: a.published * 1.1,
    }));
    expect(checkScenario('clean', wide).summary).toMatchObject({
      maxErrorPct: 0,
      publishedOutsideRange: 0,
    });
  });

  it('fails a midpoint just over 5%, even when the range contains the published number', () => {
    const r = checkScenario('clean', at(1.0501));
    expect(r.ok).toBe(false);
    expect(r.summary.overTolerance).toHaveLength(5);
    const lopsided = anchors.map((a) => ({
      anchorId: a.id,
      low: a.published,
      high: a.published * 1.2,
    }));
    const l = checkScenario('clean', lopsided);
    expect(l.summary.publishedOutsideRange).toBe(0);
    expect(l.errors[0]).toMatch(/is 10\.00% from the published .*, over ±5%$/);
  });

  it('fails a missing, duplicated or unknown estimate', () => {
    const list = at(1);
    const r = checkScenario('clean', [
      ...list.slice(1),
      list[1],
      { anchorId: 'not-an-anchor', low: 1, high: 2 },
    ]);
    expect(r.errors).toEqual(
      expect.arrayContaining([
        `more than one estimate for ${second}`,
        'an estimate for not-an-anchor, which is not an anchor row',
        `1 anchor(s) with no estimate: ${first}`,
      ]),
    );
  });

  it('refuses a malformed estimates file', () => {
    expect(() => estimateList({ items: [] })).toThrow(GoldenInputError);
    expect(() => estimateList([{ anchorId: 'x', low: 2, high: 1 }])).toThrow(GoldenInputError);
    expect(() => estimateList([{ anchorId: 'x', low: Number.NaN, high: 1 }])).toThrow(
      GoldenInputError,
    );
    expect(estimateList({ estimates: [{ anchorId: 'x', low: 1, high: 2 }] })).toEqual([
      { anchorId: 'x', low: 1, high: 2 },
    ]);
  });
});

describe('the anchor files are validated', () => {
  it('refuses an id in two files, a row without a published number and an empty set', () => {
    const row = { id: 'a-row', avgFps: 10 };
    const file = (name, items) => ({ file: name, json: { schemaVersion: 1, items } });
    expect(() => anchorRows([file('g', [row]), file('c', [row])])).toThrow(/is in both g and c/);
    expect(() => anchorRows([file('g', [{ id: 'a-row' }])])).toThrow(/no positive avgFps or score/);
    expect(() => anchorRows([file('g', [])])).toThrow(/hold no rows/);
    expect(() => anchorRows([{ file: 'g', json: [] }])).toThrow(GoldenInputError);
  });
});

describe('the command line', () => {
  function cli(args) {
    const out = path.join(tempDir(), 'golden.json');
    const r = spawnSync(process.execPath, [CLI, ...args, '--json', out], {
      cwd: REPO,
      encoding: 'utf8',
    });
    return { ...r, result: existsSync(out) ? readJson(out) : null };
  }
  function file(content) {
    const f = path.join(tempDir(), 'input.json');
    writeFileSync(f, JSON.stringify(content));
    return f;
  }
  const common = (rep) => ['--vitest', file(rep), '--repo-root', SUITE];

  it('exits 0 on the clean suite, and records the inputs by checksum', () => {
    const r = cli(common(scenario('clean')));
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/5 anchor rows · 5 golden cases · 5 passed\nPASS/);
    expect(r.result.inputs.anchors.map((a) => a.file)).toEqual(DEFAULT_ANCHORS);
    expect(r.result.inputs.vitest.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('exits 1 on a planted defect, and on an estimate over the tolerance', () => {
    expect(cli(common(scenario('duplicate'))).status).toBe(1);
    const over = anchors.map((a) => ({
      anchorId: a.id,
      low: a.published * 1.06,
      high: a.published * 1.06,
    }));
    const r = cli([...common(scenario('clean')), '--estimates', file(over)]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/5 over/);
  });

  it('can check one anchor file alone, for a work package that covers only games', () => {
    const r = cli([...common(scenario('clean')), '--anchors', 'data/benchmarks/game.json']);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/3 anchor rows · 5 golden cases/);
    expect(r.stdout).toMatch(/2 golden case\(s\) for no anchor row/);
  });

  it('exits 2 when it cannot measure', () => {
    expect(cli([]).status).toBe(2);
    expect(cli([...common(scenario('clean')), '--anchors', 'data/no-such-file.json']).status).toBe(
      2,
    );
    const broken = {
      testResults: [
        {
          name: path.join(SUITE, 'src', 'engine', 'broken.fixture.mjs'),
          status: 'failed',
          message: 'SyntaxError',
          assertionResults: [],
        },
      ],
    };
    expect(cli(common(broken)).status).toBe(2);
  });

  it('prints what it found', () => {
    expect(formatCheck(checkScenario('missing'))).toMatch(
      /^Golden-count check · 5 anchor rows · 4 golden cases · 4 passed/,
    );
  });
});
