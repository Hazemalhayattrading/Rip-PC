import { checkCreatorBenchmarks, checkGameBenchmarks } from './benchmarks';
import { checkCompatFixtures } from './fixtures';
import { checkGames } from './games';
import { checkIds, checkRegistry } from './integrity';
import { IssueSink, type Issue } from './issues';
import { parseDataset, type Dataset } from './parse';
import { checkPrices } from './prices';
import { checkSpecs } from './specs';

export { RULES, formatIssue, type Issue, type RuleId, type Severity } from './issues';
export type { Dataset } from './parse';

export interface ValidateOptions {
  /** Today's UTC date (YYYY-MM-DD). Nothing may be retrieved, checked or published after it. */
  today: string;
}

export interface ValidationResult {
  dataset: Dataset;
  issues: Issue[];
  errors: Issue[];
  warnings: Issue[];
}

/** Today's date in UTC, as YYYY-MM-DD. */
export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Validates the whole dataset. `files` maps repo-relative paths (see DATA_PATHS) to parsed JSON.
 * Stage 1 parses every file with its strict schema. Stage 2 runs the semantic rules on every file
 * that parsed (see RULES for the list).
 */
export function validateFiles(files: Readonly<Record<string, unknown>>, options: ValidateOptions): ValidationResult {
  const sink = new IssueSink();
  const dataset = parseDataset(files, sink);
  const registry = checkRegistry(sink, dataset.publishers ?? []);
  checkIds(sink, dataset);
  if (dataset.publishers !== null) {
    checkSpecs(sink, dataset, registry, options.today);
    checkPrices(sink, dataset, registry, options.today);
    checkGames(sink, dataset, registry, options.today);
    checkGameBenchmarks(sink, dataset, registry, options.today);
    checkCreatorBenchmarks(sink, dataset, registry, options.today);
    checkCompatFixtures(sink, dataset, registry, options.today);
  }
  const issues = sink.issues;
  return {
    dataset,
    issues,
    errors: issues.filter((i) => i.severity === 'error'),
    warnings: issues.filter((i) => i.severity === 'warning'),
  };
}
