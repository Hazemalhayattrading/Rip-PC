import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { DATA_PATHS } from '../src/data/schema';
import { utcToday } from '../src/data/validate';
import type { CompatRule } from '../src/engine/compat/check';
import { dumpRule, dumpSummary } from '../src/engine/dump';
import { displayNames } from '../src/engine/names';
import { parseQueryInput, runQueries } from '../src/engine/query';
import { RULE_SPECS, ruleSpec } from '../src/engine/rules';
import type { RuleResult } from '../src/engine/types';
import { buildCatalogue, readDataFiles } from './catalogue/catalogue';
// The extension matters: './engine-dump' would resolve to the launcher, engine-dump.mjs.
import { main, resolveEngineCommit, ruleFileJson, type DumpHeader } from './engine-dump.ts';

const ROOT = resolve(import.meta.dirname, '..');
const COMMIT = 'f'.repeat(40);
const SAMPLE = resolve(ROOT, 'scripts/engine-dump.sample-query.json');
const texts = readDataFiles(ROOT);
const built = buildCatalogue(texts, utcToday());
const { catalogue } = built;
const HEADER: DumpHeader = {
  engineCommit: COMMIT,
  catalogueFile: built.fileName,
  dataHash: catalogue.dataHash,
};

const temp = mkdtempSync(join(tmpdir(), 'rig-lab-engine-dump-'));
afterAll(() => {
  rmSync(temp, { recursive: true, force: true });
});

interface Run {
  readonly code: number;
  readonly outDir: string;
  readonly logged: readonly string[];
  readonly errors: readonly string[];
}

/** Runs the shell with a fresh output folder under `temp`, collecting what it prints. */
function run(
  name: string,
  options: { root?: string; argv?: string[]; rules?: readonly CompatRule[] } = {},
): Run {
  const outDir = join(temp, name);
  const logged: string[] = [];
  const errors: string[] = [];
  const code = main({
    root: options.root ?? ROOT,
    argv: options.argv ?? [],
    outDir,
    cwd: temp,
    env: { GITHUB_SHA: COMMIT },
    log: (line) => logged.push(line),
    error: (line) => errors.push(line),
    ...(options.rules === undefined ? {} : { rules: options.rules }),
  });
  return { code, outDir, logged, errors };
}

const pretty = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

/** A copy of the repo's data files under `temp`, with `edit` applied to each file's text. */
function copyOfData(name: string, edit: (path: string, text: string) => string): string {
  const root = join(temp, name);
  for (const [path, text] of Object.entries(texts)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), edit(path, text));
  }
  return root;
}

/** A stand-in display-output rule whose results are sound, or break the copy guide. */
function displayRule(reason: string): CompatRule {
  return {
    spec: ruleSpec('display-output'),
    evaluate: (build): RuleResult => ({
      ruleId: 'display-output',
      status: 'ok',
      cantVerify: false,
      parts: [{ category: 'cpu', partId: build.cpu ?? 'none' }],
      reason,
      action: null,
      steps: null,
      evidence: [
        {
          partId: build.cpu ?? 'none',
          category: 'cpu',
          field: 'igpu',
          value: null,
          unit: null,
          availability: 'none',
          condition: null,
          note: null,
          sources: [],
        },
      ],
      layoutId: null,
    }),
  };
}

describe('ruleFileJson', () => {
  const dump = dumpRule(ruleSpec('ram-cooler-clearance'), catalogue);
  const text = ruleFileJson(HEADER, dump);

  it('is the header and the rule dump, as JSON', () => {
    expect(JSON.parse(text)).toStrictEqual({ ...HEADER, ...dump });
    expect(text.endsWith(']}\n')).toBe(true);
  });

  it('puts the metadata on the first line, then one row and one result per line', () => {
    const lines = text.split('\n');
    expect(lines[0]).toMatch(/^\{"engineCommit":.*"columns":\["ram","cooler"\],$/);
    expect(lines[1]).toBe('"rows":[');
    dump.rows.forEach((row, i) => {
      expect(lines[2 + i]).toBe(`${JSON.stringify(row)}${i < dump.rows.length - 1 ? ',' : ''}`);
    });
    expect(lines).toHaveLength(1 + (2 + dump.rows.length) + (2 + dump.results.length) + 1);
  });

  it('writes an empty table compactly', () => {
    const empty = { ...dump, combinationCount: 0, rows: [], results: [] };
    const emptyText = ruleFileJson(HEADER, empty);
    expect(JSON.parse(emptyText)).toStrictEqual({ ...HEADER, ...empty });
    expect(emptyText.endsWith('"rows":[],\n"results":[]}\n')).toBe(true);
  });
});

describe('npm run engine:dump', () => {
  const { code, outDir, logged, errors } = run('full');
  const dumps = RULE_SPECS.map((spec) => dumpRule(spec, catalogue));

  it('exits 0 and prints no errors', () => {
    expect(code).toBe(0);
    expect(errors).toEqual([]);
  });

  it('writes one compact file per rule, with the header', () => {
    const files = readdirSync(join(outDir, 'rules')).sort();
    expect(files).toEqual(RULE_SPECS.map((spec) => `${spec.id}.json`).sort());
    for (const dump of dumps) {
      const text = readFileSync(join(outDir, 'rules', `${dump.id}.json`), 'utf8');
      expect(text, dump.id).toBe(ruleFileJson(HEADER, dump));
    }
  });

  it("writes QA's registry, which holds only implemented rules: none before WP-E1", () => {
    expect(readFileSync(join(outDir, 'rules.json'), 'utf8')).toBe(
      pretty({ schemaVersion: 1, ...HEADER, rules: [] }),
    );
  });

  it("writes every part's display name, for design-lead's review", () => {
    expect(readFileSync(join(outDir, 'display-names.json'), 'utf8')).toBe(
      pretty({ ...HEADER, displayNames: displayNames(catalogue) }),
    );
  });

  it('writes the summary, with every spec and each rule dump complete or not', () => {
    const summary = readJson(join(outDir, 'summary.json'));
    expect(summary).toStrictEqual({ ...HEADER, ...dumpSummary(catalogue, dumps) });
    expect(summary).toMatchObject({ catalogueFile: built.fileName, specs: RULE_SPECS });
  });

  it('prints one line per rule with its combination count, then the total', () => {
    expect(logged).toHaveLength(RULE_SPECS.length + 1);
    dumps.forEach((dump, i) => {
      const flags = dump.complete ? 'not implemented' : 'not implemented, incomplete';
      expect(logged[i]).toMatch(
        new RegExp(`^${dump.id} +${String(dump.combinationCount)} combinations \\(${flags}\\)$`),
      );
    });
    const total = dumps.reduce((sum, dump) => sum + dump.combinationCount, 0);
    expect(logged.at(-1)).toBe(
      `Total: ${String(total)} combinations for ${String(dumps.length)} rules, written to ${outDir}`,
    );
  });

  it('stays far from a combinatorial explosion', () => {
    // About 8 MB today. A guard against a sweep that multiplies out (a full product of
    // psu-wattage's reads was millions of rows), not a budget for catalogue growth.
    const sizes = readdirSync(join(outDir, 'rules')).map(
      (file) => statSync(join(outDir, 'rules', file)).size,
    );
    expect(sizes.reduce((a, b) => a + b, 0)).toBeLessThan(50_000_000);
  });
});

describe('npm run engine:dump with implemented rules', () => {
  it('lists them in the registry, evaluates every row and marks them implemented', () => {
    const rules = [displayRule('A stand-in reason.')];
    const { code, outDir, logged, errors } = run('implemented', { rules });
    expect([code, errors]).toEqual([0, []]);
    expect(readJson(join(outDir, 'rules.json'))).toMatchObject({
      rules: [ruleSpec('display-output')],
    });
    const file = readJson(join(outDir, 'rules', 'display-output.json')) as {
      implemented: boolean;
      results: unknown[];
    };
    expect(file.implemented).toBe(true);
    expect(file.results.every((result) => result !== null)).toBe(true);
    expect(logged.find((line) => line.startsWith('display-output'))).toMatch(/combinations$/);
  });

  it('exits 1 when a result breaks the contract, naming the rule and the row', () => {
    const { code, errors } = run('broken', { rules: [displayRule('no full stop')] });
    expect(code).toBe(1);
    expect(errors[0]).toBe(
      'display-output, row 0: display-output: the reason must be one sentence that ends with a full stop.',
    );
    expect(errors).toHaveLength(dumpRule(ruleSpec('display-output'), catalogue).combinationCount);
  });
});

describe('npm run engine:dump on data that does not validate', () => {
  it('exits 1 with the validation errors, and writes nothing', () => {
    const root = copyOfData('bad-data', (path, text) =>
      path === DATA_PATHS.specs.cpu ? '{ not json' : text,
    );
    for (const argv of [[], ['--input', SAMPLE, '--out', join(temp, 'bad-data-out.json')]]) {
      const { code, outDir, logged, errors } = run('bad', { root, argv });
      expect(code).toBe(1);
      expect(errors).toEqual([
        `The catalogue has 1 validation error:\n${DATA_PATHS.specs.cpu}: not valid JSON`,
      ]);
      expect(logged).toEqual([]);
      expect(() => readdirSync(outDir)).toThrow();
    }
  });

  it('throws on a missing data file, which is not a validation error: Node then exits 1', () => {
    expect(() => run('no-data', { root: join(temp, 'no-data-root') })).toThrow(/ENOENT/);
  });
});

describe('npm run engine:dump with its defaults, as the CLI runs it', () => {
  it('writes to <root>/artifacts/engine and prints with console.log', () => {
    const root = copyOfData('defaults', (_path, text) => text);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      expect(main({ root })).toBe(0);
      expect(log).toHaveBeenCalledTimes(RULE_SPECS.length + 1);
    } finally {
      log.mockRestore();
    }
    const summary = readJson(join(root, 'artifacts/engine/summary.json'));
    expect(summary).toHaveProperty('engineCommit');
    expect(summary).toMatchObject({ dataHash: catalogue.dataHash });
  });
});

describe('npm run engine:dump -- --input <file> --out <file>', () => {
  const sampleText = readFileSync(SAMPLE, 'utf8');
  const parsed = parseQueryInput(JSON.parse(sampleText), catalogue);
  const input = parsed.ok ? parsed.input : { schemaVersion: 1 as const, builds: [] };

  it("answers the builds of the input file, with the header and the input file's hash", () => {
    const inPath = join(temp, 'query', 'in.json');
    const outPath = join(temp, 'query', 'answers', 'out.json');
    mkdirSync(dirname(inPath), { recursive: true });
    copyFileSync(SAMPLE, inPath);
    const { code, logged, errors } = run('query', { argv: ['--input', inPath, '--out', outPath] });
    expect([code, errors]).toEqual([0, []]);
    expect(readFileSync(outPath, 'utf8')).toBe(
      pretty({
        schemaVersion: 1,
        ...HEADER,
        input: {
          file: inPath,
          sha256: createHash('sha256').update(readFileSync(inPath)).digest('hex'),
        },
        builds: runQueries(input, catalogue).builds,
      }),
    );
    expect(logged).toEqual([`Answered 2 builds from ${inPath}, written to ${outPath}.`]);
  });

  it('reads and writes paths relative to the working folder', () => {
    copyFileSync(SAMPLE, join(temp, 'relative.json'));
    const { code } = run('relative', {
      argv: ['--input=relative.json', '--out=out/relative.json'],
    });
    expect(code).toBe(0);
    expect(readJson(join(temp, 'out', 'relative.json'))).toMatchObject({
      input: { file: 'relative.json' },
    });
  });

  it('exits 1 when an answer breaks the contract, naming the build, and still writes the answers', () => {
    const outPath = join(temp, 'broken-answers.json');
    const { code, errors } = run('broken-query', {
      argv: ['--input', SAMPLE, '--out', outPath],
      rules: [displayRule('no full stop')],
    });
    const problem = 'display-output: the reason must be one sentence that ends with a full stop.';
    expect(code).toBe(1);
    expect(errors).toEqual(input.builds.map((build) => `${build.id}: ${problem}`));
    expect(readJson(outPath)).toMatchObject({
      builds: input.builds.map(() => ({ problems: [problem] })),
    });
  });

  it.each([
    [['--input', 'a.json'], 'Give --input and --out together, or neither.'],
    [['--out', 'b.json'], 'Give --input and --out together, or neither.'],
    [['--input'], "Option '--input <value>' argument missing"],
    [['--bogus', 'x'], "Unknown option '--bogus'"],
    [['stray'], "Unexpected argument 'stray'"],
  ])('exits 2 on the arguments %j', (argv, message) => {
    const { code, errors } = run('bad-arguments', { argv });
    expect(code).toBe(2);
    expect(errors[0]).toContain(message);
    expect(errors.at(-1)).toBe('Usage: npm run engine:dump [-- --input <file> --out <file>]');
  });

  it.each([
    [
      'an input file that cannot be read',
      null,
      /^missing\.json: the query input can't be read \(.+\)\.$/,
    ],
    [
      'an input file that is not JSON',
      '{ not json',
      /^missing\.json: the query input is not valid JSON\.$/,
    ],
  ])('exits 2 on %s', (_label, text, message) => {
    if (text !== null) writeFileSync(join(temp, 'missing.json'), text);
    else rmSync(join(temp, 'missing.json'), { force: true });
    const { code, errors } = run('bad-input', {
      argv: ['--input', 'missing.json', '--out', 'x.json'],
    });
    expect(code).toBe(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(message);
  });

  it('reads an input file that starts with a byte order mark', () => {
    writeFileSync(join(temp, 'bom.json'), `\uFEFF${sampleText}`);
    expect(run('bom', { argv: ['--input', 'bom.json', '--out', 'bom-out.json'] }).code).toBe(0);
  });

  it('exits 2 on input problems, printing each with the file and its JSON path', () => {
    writeFileSync(
      join(temp, 'problems.json'),
      JSON.stringify({ schemaVersion: 1, builds: [{ id: 'b', parts: { cpu: 'x', ram: 'y' } }] }),
    );
    const { code, errors } = run('problems', {
      argv: ['--input', 'problems.json', '--out', 'problems-out.json'],
    });
    expect(code).toBe(2);
    expect(errors).toEqual([
      'problems.json: $.builds[0].parts.cpu: "x" is not a CPU in the catalogue.',
      'problems.json: $.builds[0].parts.ram: "y" is not a memory kit in the catalogue.',
    ]);
  });

  // Two child processes, each loading the engine through Vite: slow on a cold CI runner.
  it('runs end to end through the launcher on the sample input', { timeout: 30_000 }, () => {
    const outPath = join(temp, 'launcher', 'out.json');
    const answered = spawnSync(
      process.execPath,
      ['scripts/engine-dump.mjs', '--input', SAMPLE, '--out', outPath],
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(answered.stderr).toBe('');
    expect(answered.status).toBe(0);
    const output = readJson(outPath) as { builds: { id: string; problems: unknown[] }[] };
    expect(output.builds.map((build) => [build.id, build.problems])).toEqual(
      input.builds.map((build) => [build.id, []]),
    );
    const refused = spawnSync(process.execPath, ['scripts/engine-dump.mjs', '--input', SAMPLE], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(refused.status).toBe(2);
    expect(refused.stderr).toContain('Give --input and --out together, or neither.');
  });
});

describe('resolveEngineCommit', () => {
  const git = (): string => `${'a'.repeat(40)}\n`;
  const noGit = (): string => {
    throw new Error('not a git repository');
  };

  it('takes GITHUB_SHA in CI', () => {
    expect(resolveEngineCommit({ GITHUB_SHA: COMMIT }, git)).toBe(COMMIT);
  });

  it('asks git for HEAD otherwise, or when GITHUB_SHA is empty', () => {
    expect(resolveEngineCommit({}, git)).toBe('a'.repeat(40));
    expect(resolveEngineCommit({ GITHUB_SHA: '' }, git)).toBe('a'.repeat(40));
  });

  it('gives null without git, or when git prints nothing', () => {
    expect(resolveEngineCommit({}, noGit)).toBeNull();
    expect(resolveEngineCommit({}, () => '\n')).toBeNull();
  });

  it('reads HEAD of this repository by default', () => {
    expect(resolveEngineCommit({}, undefined, ROOT)).toMatch(/^[0-9a-f]{40}$/);
  });
});
