/**
 * Rig Lab engine: compatibility, power, performance and bottleneck analysis (BUILD_PROMPT §5).
 *
 * Rules for everything under `src/engine/`:
 * - pure functions only: no DOM, no React, no I/O. The catalogue comes in as an argument;
 * - 100% line, branch, function and statement coverage (enforced in `vitest.config.ts`);
 * - estimates are ranges with a confidence level, never single numbers (CLAUDE.md rule 2).
 *
 * The result types are the contract in `./types`, reviewed by qa-lead and design-lead.
 */
export * from './types';
export { estimate } from './estimate';
export { RULE_SPECS, ruleSpec } from './rules';
export { systemOf } from './system';
export {
  parseQueryInput,
  runQueries,
  type ParsedQueryInput,
  type QueryAnswer,
  type QueryBuild,
  type QueryInput,
  type QueryOutput,
} from './query';
export {
  COMPAT_RULES,
  checkCompatibility,
  type CompatRule,
  type RuleEvaluator,
} from './compat/check';
export {
  dumpColumns,
  dumpRule,
  dumpSummary,
  partsOfRow,
  sweepRows,
  type DumpCell,
  type DumpColumn,
  type DumpOptions,
  type DumpRow,
  type EngineDumpSummary,
  type PartExtremes,
  type PowerExtremes,
  type RuleDump,
  type SweptRows,
} from './dump';
