/**
 * `npm run engine:dump`: the engine dump's I/O shell (plan WP-E0).
 *
 * Without arguments, it validates the catalogue and writes the full dump to artifacts/engine/:
 * - `rules/<rule-id>.json`: one rule's sweep as a table (`src/engine/dump.ts`), with the
 *   metadata on the first line, then one row and one result per line;
 * - `rules.json`: QA's registry, the spec of every implemented rule (`COMPAT_RULES`), so it
 *   lists none before WP-E1;
 * - `display-names.json`: every catalogue part's display name, for design-lead's review;
 * - `summary.json`, last, so it marks a complete dump: what the dump covered, and all 20 specs.
 *
 * With `--input <file> --out <file>`, it answers the builds of a query file instead
 * (`src/engine/query.ts`), and writes the answers to the out file.
 *
 * Every file starts with `engineCommit`, `catalogueFile` (the built site's catalogue asset name)
 * and `dataHash`. Exit codes: 0 done; 1 the data doesn't validate, or an answer breaks the
 * contract (`src/engine/invariants.ts`); 2 a problem with the arguments or the input file.
 * Problems go to stderr, one per line.
 *
 * Node only: scripts/engine-dump.mjs loads this module through Vite's `runnerImport`, because
 * the engine and data modules use extensionless imports that Node's own type stripping can't
 * resolve.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { utcToday } from '../src/data/validate/index.ts';
import { COMPAT_RULES, type CompatRule } from '../src/engine/compat/check.ts';
import { dumpRule, dumpSummary, type RuleDump } from '../src/engine/dump.ts';
import { ruleResultProblems } from '../src/engine/invariants.ts';
import { displayNames } from '../src/engine/names.ts';
import { parseQueryInput, runQueries } from '../src/engine/query.ts';
import { RULE_SPECS } from '../src/engine/rules.ts';
import type { Catalogue } from '../src/engine/types.ts';
import {
  CatalogueError,
  buildCatalogue,
  readDataFiles,
  type BuiltCatalogue,
} from './catalogue/catalogue.ts';

/** What every file of the dump starts with: the code and the data it came from. */
export interface DumpHeader {
  /** The commit the dump ran on: `GITHUB_SHA` in CI, else `git rev-parse HEAD`, else `null`. */
  readonly engineCommit: string | null;
  /** The catalogue's content-hashed file name, the same as the built site's asset. */
  readonly catalogueFile: string;
  /** The SHA-256 of the data files (`Catalogue.dataHash`). */
  readonly dataHash: string;
}

type Env = Readonly<Record<string, string | undefined>>;

const USAGE = 'Usage: npm run engine:dump [-- --input <file> --out <file>]';

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

/**
 * A rule file: the header and the rule's metadata on the first line, then one row per line and
 * one result per line, so a part id or a row number is easy to find, and the file stays small.
 */
export function ruleFileJson(header: DumpHeader, dump: RuleDump): string {
  const { rows, results, ...metadata } = dump;
  const head = JSON.stringify({ ...header, ...metadata });
  const list = (name: string, items: readonly unknown[]): string =>
    items.length === 0
      ? `"${name}":[]`
      : `"${name}":[\n${items.map((item) => JSON.stringify(item)).join(',\n')}\n]`;
  return `${head.slice(0, -1)},\n${list('rows', rows)},\n${list('results', results)}}\n`;
}

export interface MainOptions {
  /** The repo root: the data files are read from here, and git runs here. */
  readonly root: string;
  /** The command-line arguments after the script name. */
  readonly argv?: readonly string[];
  /** Where the full dump goes. Default: `<root>/artifacts/engine`. */
  readonly outDir?: string;
  /** The folder `--input` and `--out` are relative to. Default: the process's. */
  readonly cwd?: string;
  readonly env?: Env;
  /** The implemented rules. Default: `COMPAT_RULES`; tests pass stand-ins. */
  readonly rules?: readonly CompatRule[];
  readonly log?: (line: string) => void;
  readonly error?: (line: string) => void;
}

interface Context {
  readonly catalogue: Catalogue;
  readonly header: DumpHeader;
  readonly rules: readonly CompatRule[];
  readonly log: (line: string) => void;
  readonly error: (line: string) => void;
}

/** Prints the problems, and gives the exit code: 1 when there are any. */
function reported(problems: readonly string[], error: (line: string) => void): number {
  for (const problem of problems) error(problem);
  return problems.length === 0 ? 0 : 1;
}

/** The full dump: every rule's sweep, the registry, the display names, then the summary. */
function writeFullDump(context: Context, outDir: string): number {
  const { catalogue, header, rules, log, error } = context;
  const evaluators = new Map(rules.map((rule) => [rule.spec.id, rule.evaluate]));
  const dumps = RULE_SPECS.map((spec) =>
    dumpRule(spec, catalogue, { evaluate: evaluators.get(spec.id) }),
  );

  mkdirSync(join(outDir, 'rules'), { recursive: true });
  for (const dump of dumps) {
    writeFileSync(join(outDir, 'rules', `${dump.id}.json`), ruleFileJson(header, dump));
  }
  writeJson(join(outDir, 'rules.json'), {
    schemaVersion: 1,
    ...header,
    rules: rules.map((rule) => rule.spec),
  });
  writeJson(join(outDir, 'display-names.json'), {
    ...header,
    displayNames: displayNames(catalogue),
  });
  writeJson(join(outDir, 'summary.json'), { ...header, ...dumpSummary(catalogue, dumps) });

  const width = Math.max(...dumps.map((dump) => dump.id.length));
  for (const dump of dumps) {
    const count = String(dump.combinationCount).padStart(6);
    const flags = [
      ...(dump.implemented ? [] : ['not implemented']),
      ...(dump.complete ? [] : ['incomplete']),
    ];
    const note = flags.length === 0 ? '' : ` (${flags.join(', ')})`;
    log(`${dump.id.padEnd(width)} ${count} combinations${note}`);
  }
  const total = dumps.reduce((sum, dump) => sum + dump.combinationCount, 0);
  log(
    `Total: ${String(total)} combinations for ${String(dumps.length)} rules, written to ${outDir}`,
  );

  // Every result keeps the contract (`ruleResultProblems`), as the invariants module asks.
  return reported(
    dumps.flatMap((dump) =>
      dump.results.flatMap((result, row) =>
        result !== null && 'status' in result
          ? ruleResultProblems(result).map(
              (problem) => `${dump.id}, row ${String(row)}: ${problem}`,
            )
          : [],
      ),
    ),
    error,
  );
}

/** The query mode: the answers for the builds of the input file. */
function answerQueries(
  context: Context,
  files: { readonly input: string; readonly out: string },
  cwd: string,
): number {
  const { catalogue, header, rules, log, error } = context;
  let bytes: Buffer;
  try {
    bytes = readFileSync(resolve(cwd, files.input));
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : String(caught);
    error(`${files.input}: the query input can't be read (${reason}).`);
    return 2;
  }
  let json: unknown;
  try {
    json = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  } catch {
    error(`${files.input}: the query input is not valid JSON.`);
    return 2;
  }
  const parsed = parseQueryInput(json, catalogue);
  if (!parsed.ok) {
    for (const problem of parsed.problems) error(`${files.input}: ${problem}`);
    return 2;
  }

  const { builds } = runQueries(parsed.input, catalogue, rules);
  const outPath = resolve(cwd, files.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeJson(outPath, {
    schemaVersion: 1,
    ...header,
    input: { file: files.input, sha256: createHash('sha256').update(bytes).digest('hex') },
    builds,
  });
  log(`Answered ${String(builds.length)} builds from ${files.input}, written to ${files.out}.`);
  return reported(
    builds.flatMap((build) => build.problems.map((problem) => `${build.id}: ${problem}`)),
    error,
  );
}

/** `--input` and `--out`, both or neither; or the problem with the arguments. */
function parseArguments(
  argv: readonly string[],
): { readonly query: { readonly input: string; readonly out: string } | null } | string {
  try {
    const { values } = parseArgs({
      args: [...argv],
      options: { input: { type: 'string' }, out: { type: 'string' } },
      strict: true,
      allowPositionals: false,
    });
    const { input, out } = values;
    if (input === undefined && out === undefined) return { query: null };
    if (input === undefined || out === undefined) {
      return 'Give --input and --out together, or neither.';
    }
    return { query: { input, out } };
  } catch (caught) {
    return caught instanceof Error ? caught.message : String(caught);
  }
}

/**
 * Validates the catalogue, then writes the full dump, or with `--input` and `--out`, the
 * answers for a query file.
 * @returns the exit code: 0, 1 (the data or an answer) or 2 (the arguments or the input)
 */
export function main({
  root,
  argv = [],
  outDir = resolve(root, 'artifacts/engine'),
  cwd = process.cwd(),
  env = process.env,
  rules = COMPAT_RULES,
  log = console.log,
  error = console.error,
}: MainOptions): number {
  const args = parseArguments(argv);
  if (typeof args === 'string') {
    error(args);
    error(USAGE);
    return 2;
  }

  let built: BuiltCatalogue;
  try {
    built = buildCatalogue(readDataFiles(root), utcToday());
  } catch (caught) {
    if (!(caught instanceof CatalogueError)) throw caught;
    error(caught.message);
    return 1;
  }
  const context: Context = {
    catalogue: built.catalogue,
    header: {
      engineCommit: resolveEngineCommit(env, undefined, root),
      catalogueFile: built.fileName,
      dataHash: built.catalogue.dataHash,
    },
    rules,
    log,
    error,
  };
  return args.query === null
    ? writeFullDump(context, outDir)
    : answerQueries(context, args.query, cwd);
}
