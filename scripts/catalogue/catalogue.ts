/**
 * Builds the catalogue: every data file, validated with data-lead's Zod schemas and rules, as
 * one minified JSON file named after the SHA-256 of its content (plan WP-E0).
 *
 * Node only. The Vite plugin (`scripts/vite/catalogue.ts`) runs it at build time and the engine
 * dump runs it before writing results, so the browser gets validated data without Zod, and
 * every consumer reads the same bytes. A validation error stops the build.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DATA_PATHS,
  MARKETS,
  SPEC_CATEGORIES,
  type SpecCategory,
  type SpecRecordByCategory,
} from '../../src/data/schema/index.ts';
import { formatIssue, validateFiles } from '../../src/data/validate/index.ts';
import type { Catalogue } from '../../src/engine/types.ts';

/** Every data file the catalogue holds: `DATA_PATHS` without the audits, which are QA records. */
export function catalogueDataPaths(): string[] {
  return [
    DATA_PATHS.publishers,
    DATA_PATHS.games,
    ...SPEC_CATEGORIES.map((category) => DATA_PATHS.specs[category]),
    ...MARKETS.map((market) => DATA_PATHS.prices[market]),
    DATA_PATHS.benchmarks.game,
    DATA_PATHS.benchmarks.creator,
  ];
}

/** Reads the catalogue's data files under `root`, keyed by repo-relative path. */
export function readDataFiles(root: string): Record<string, string> {
  return Object.fromEntries(
    catalogueDataPaths().map((path) => [path, readFileSync(resolve(root, path), 'utf8')]),
  );
}

/** The catalogue failed validation. `issues` holds one line per problem. */
export class CatalogueError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    const count = issues.length;
    super(
      `The catalogue has ${String(count)} validation error${count === 1 ? '' : 's'}:\n${issues.join('\n')}`,
    );
    this.name = 'CatalogueError';
    this.issues = issues;
  }
}

export interface BuiltCatalogue {
  readonly catalogue: Catalogue;
  /** The minified JSON the browser downloads. */
  readonly json: string;
  /** `catalogue-<first 16 hex digits of the SHA-256 of json>.json`. */
  readonly fileName: string;
  /** The validator's warnings. They don't stop the build. */
  readonly warnings: readonly string[];
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** The content-hashed file name for catalogue JSON. */
export function catalogueFileName(json: string): string {
  return `catalogue-${sha256(json).slice(0, 16)}.json`;
}

/** SHA-256 over every data file, path and content, in `catalogueDataPaths` order. */
function hashDataFiles(texts: Readonly<Record<string, string>>): string {
  const hash = createHash('sha256');
  for (const path of catalogueDataPaths()) {
    hash.update(`${path}\0${texts[path] ?? ''}\0`);
  }
  return hash.digest('hex');
}

/**
 * Validates the data files and assembles the catalogue.
 * @param texts each data file's text, keyed by repo-relative path (see `readDataFiles`)
 * @param today today's UTC date (YYYY-MM-DD): nothing may be retrieved or published after it
 * @throws {CatalogueError} listing every file that is missing, unreadable or invalid
 */
export function buildCatalogue(
  texts: Readonly<Record<string, string>>,
  today: string,
): BuiltCatalogue {
  const parsed: Record<string, unknown> = {};
  const unreadable: string[] = [];
  for (const path of catalogueDataPaths()) {
    const text = texts[path];
    if (text === undefined) continue; // The validator reports it as a missing file.
    try {
      parsed[path] = JSON.parse(text);
    } catch {
      unreadable.push(`${path}: not valid JSON`);
    }
  }
  if (unreadable.length > 0) throw new CatalogueError(unreadable);

  const result = validateFiles(parsed, { today });
  if (result.errors.length > 0) throw new CatalogueError(result.errors.map(formatIssue));

  const { dataset } = result;
  const { publishers, games, gameBenchmarks, creatorBenchmarks } = dataset;
  const sa = dataset.prices.SA;
  const us = dataset.prices.US;
  // The validator reports a missing or invalid file as an error, so these hold after the check above.
  if (
    publishers === null ||
    games === null ||
    gameBenchmarks === null ||
    creatorBenchmarks === null ||
    sa === null ||
    us === null
  ) {
    throw new CatalogueError(['The validator passed a dataset with a missing section.']);
  }

  const catalogue: Catalogue = {
    schemaVersion: 1,
    dataHash: hashDataFiles(texts),
    publishers,
    parts: partsOf(dataset.specs),
    prices: { SA: sa, US: us },
    games: games.games,
    gameBenchmarks,
    creatorBenchmarks,
  };
  const json = JSON.stringify(catalogue);
  return {
    catalogue,
    json,
    fileName: catalogueFileName(json),
    warnings: result.warnings.map(formatIssue),
  };
}

function partsOf(specs: {
  [C in SpecCategory]: SpecRecordByCategory[C][] | null;
}): Catalogue['parts'] {
  const missing = SPEC_CATEGORIES.filter((category) => specs[category] === null);
  if (missing.length > 0) {
    throw new CatalogueError([`The validator passed a dataset without ${missing.join(', ')}.`]);
  }
  return specs as Catalogue['parts'];
}
