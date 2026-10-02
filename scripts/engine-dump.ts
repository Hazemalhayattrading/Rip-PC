/**
 * `npm run engine:dump`: the engine dump's I/O shell (plan WP-E0). It validates the catalogue,
 * dumps every rule in `RULE_SPECS` with the pure `src/engine/dump.ts`, and writes:
 * - `artifacts/engine/rules/<rule-id>.json`: one rule's combinations, each with its result;
 * - `artifacts/engine/summary.json`: what the dump covered, with the data hash and engine commit.
 *
 * QA's sweep and per-rule workers read these files (plan §4), and CI uploads them. Node only:
 * `scripts/engine-dump.mjs` loads this module through Vite's `runnerImport`, because the engine
 * and data modules use extensionless imports that Node's own type stripping can't resolve.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { utcToday } from '../src/data/validate/index.ts';
import {
  RULE_SPECS,
  dumpRule,
  dumpSummary,
  type Catalogue,
  type EngineDumpSummary,
} from '../src/engine/index.ts';
import { CatalogueError, buildCatalogue, readDataFiles } from './catalogue/catalogue.ts';

/** `artifacts/engine/summary.json`. */
export interface SummaryFile extends EngineDumpSummary {
  /** The commit the dump ran on: `GITHUB_SHA` in CI, else `git rev-parse HEAD`, else `null`. */
  readonly engineCommit: string | null;
}

type Env = Readonly<Record<string, string | undefined>>;

/** HEAD of the repository at `cwd`, as git prints it. */
function gitHead(cwd: string): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/**
 * The commit the dump runs on: `GITHUB_SHA` in CI, else `git rev-parse HEAD`, else `null`.
 * @param git reads HEAD; injectable for tests. Defaults to git in `cwd`.
 */
export function resolveEngineCommit(
  env: Env,
  git?: () => string,
  cwd: string = process.cwd(),
): string | null {
  const sha = env.GITHUB_SHA;
  if (sha !== undefined && sha !== '') return sha;
  try {
    const head = (git ?? (() => gitHead(cwd)))().trim();
    return head === '' ? null : head;
  } catch {
    return null;
  }
}

/** Pretty JSON (2-space indent) with a trailing newline. */
function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export interface MainOptions {
  /** The repo root: the data files are read from here, and git runs here. */
  readonly root: string;
  /** Where the dump goes. Default: `<root>/artifacts/engine`. */
  readonly outDir?: string;
  readonly env?: Env;
  readonly log?: (line: string) => void;
  readonly error?: (line: string) => void;
}

/**
 * Validates the catalogue, dumps every rule, writes the files (the summary last, so it marks a
 * complete dump) and prints one line per rule with its combination count, then the total.
 * @returns the exit code: 0, or 1 with the validation errors when the data doesn't validate
 */
export function main({
  root,
  outDir = resolve(root, 'artifacts/engine'),
  env = process.env,
  log = console.log,
  error = console.error,
}: MainOptions): number {
  let catalogue: Catalogue;
  try {
    ({ catalogue } = buildCatalogue(readDataFiles(root), utcToday()));
  } catch (caught) {
    if (!(caught instanceof CatalogueError)) throw caught;
    error(caught.message);
    return 1;
  }

  const dumps = RULE_SPECS.map((spec) => dumpRule(spec, catalogue));
  mkdirSync(join(outDir, 'rules'), { recursive: true });
  for (const dump of dumps) writeJson(join(outDir, 'rules', `${dump.id}.json`), dump);
  const summary: SummaryFile = {
    engineCommit: resolveEngineCommit(env, undefined, root),
    ...dumpSummary(catalogue, dumps),
  };
  writeJson(join(outDir, 'summary.json'), summary);

  const width = Math.max(...dumps.map((dump) => dump.id.length));
  for (const dump of dumps) {
    const count = String(dump.combinationCount).padStart(6);
    const status = dump.implemented ? '' : ' (not implemented)';
    log(`${dump.id.padEnd(width)} ${count} combinations${status}`);
  }
  const total = dumps.reduce((sum, dump) => sum + dump.combinationCount, 0);
  log(
    `Total: ${String(total)} combinations for ${String(dumps.length)} rules, written to ${outDir}`,
  );
  return 0;
}
