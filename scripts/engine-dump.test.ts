import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { DATA_PATHS } from '../src/data/schema';
import { utcToday } from '../src/data/validate';
import { dumpRule, dumpSummary } from '../src/engine/dump';
import { RULE_SPECS } from '../src/engine/rules';
import { buildCatalogue, readDataFiles } from './catalogue/catalogue';
// The extension matters: './engine-dump' would resolve to the launcher, engine-dump.mjs.
import { main, resolveEngineCommit } from './engine-dump.ts';

const ROOT = resolve(import.meta.dirname, '..');
const COMMIT = 'f'.repeat(40);
const texts = readDataFiles(ROOT);
const { catalogue } = buildCatalogue(texts, utcToday());
const dumps = RULE_SPECS.map((spec) => dumpRule(spec, catalogue));

const temp = mkdtempSync(join(tmpdir(), 'rig-lab-engine-dump-'));
afterAll(() => {
  rmSync(temp, { recursive: true, force: true });
});

/** Runs the dump into a fresh folder under `temp`, collecting what it prints. */
function run(name: string, root = ROOT) {
  const outDir = join(temp, name);
  const logged: string[] = [];
  const errors: string[] = [];
  const code = main({
    root,
    outDir,
    env: { GITHUB_SHA: COMMIT },
    log: (line) => logged.push(line),
    error: (line) => errors.push(line),
  });
  return { code, outDir, logged, errors };
}

const pretty = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

describe('npm run engine:dump', () => {
  const { code, outDir, logged, errors } = run('ok');

  it('exits 0 and prints no errors', () => {
    expect(code).toBe(0);
    expect(errors).toEqual([]);
  });

  it('writes one file per rule: its dump, as pretty JSON with a trailing newline', () => {
    const files = readdirSync(join(outDir, 'rules')).sort();
    expect(files).toEqual(RULE_SPECS.map((spec) => `${spec.id}.json`).sort());
    for (const dump of dumps) {
      const text = readFileSync(join(outDir, 'rules', `${dump.id}.json`), 'utf8');
      expect(text, dump.id).toBe(pretty(dump));
      expect(text.split('\n')[1], dump.id).toBe(`  "id": "${dump.id}",`);
    }
  });

  it('writes the summary with the engine commit and the data hash', () => {
    const text = readFileSync(join(outDir, 'summary.json'), 'utf8');
    expect(text).toBe(pretty({ engineCommit: COMMIT, ...dumpSummary(catalogue, dumps) }));
    expect(JSON.parse(text)).toMatchObject({ engineCommit: COMMIT, dataHash: catalogue.dataHash });
  });

  it('prints one line per rule with its combination count, then the total', () => {
    expect(logged).toHaveLength(RULE_SPECS.length + 1);
    dumps.forEach((dump, i) => {
      expect(logged[i]).toMatch(
        new RegExp(
          `^${dump.id} +${String(dump.combinationCount)} combinations \\(not implemented\\)$`,
        ),
      );
    });
    const total = dumps.reduce((sum, dump) => sum + dump.combinationCount, 0);
    expect(logged.at(-1)).toBe(
      `Total: ${String(total)} combinations for ${String(dumps.length)} rules, written to ${outDir}`,
    );
  });
});

/** A copy of the repo's data files under `temp`, with `edit` applied to each file's text. */
function copyOfData(name: string, edit: (path: string, text: string) => string): string {
  const root = join(temp, name);
  for (const [path, text] of Object.entries(texts)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), edit(path, text));
  }
  return root;
}

describe('npm run engine:dump on data that does not validate', () => {
  it('exits 1 with the validation errors, and writes nothing', () => {
    const root = copyOfData('bad-data', (path, text) =>
      path === DATA_PATHS.specs.cpu ? '{ not json' : text,
    );
    const { code, outDir, logged, errors } = run('bad', root);
    expect(code).toBe(1);
    expect(errors).toEqual([
      `The catalogue has 1 validation error:\n${DATA_PATHS.specs.cpu}: not valid JSON`,
    ]);
    expect(logged).toEqual([]);
    expect(() => readdirSync(outDir)).toThrow();
  });

  it('throws on a missing data file, which is not a validation error: Node then exits 1', () => {
    expect(() => run('no-data', join(temp, 'no-data-root'))).toThrow(/ENOENT/);
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
    const summary = JSON.parse(
      readFileSync(join(root, 'artifacts/engine/summary.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(summary).toHaveProperty('engineCommit');
    expect(summary.dataHash).toBe(catalogue.dataHash);
    expect(readdirSync(join(root, 'artifacts/engine/rules'))).toHaveLength(RULE_SPECS.length);
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
