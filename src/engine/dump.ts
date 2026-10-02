/**
 * The engine dump, pure part: every catalogue combination a rule reads, with the rule's result
 * for each (plan WP-E0). QA's sweep and its per-rule workers read it, so QA never reads the
 * engine's code. `scripts/engine-dump.ts` writes it to `artifacts/engine/`.
 *
 * Everything here is plain JSON (null, never undefined) and deterministic: no dates, no
 * randomness, catalogue order throughout. Until WP-E1 adds a rule's evaluate function, its
 * combinations carry `result: null`.
 */
import type { Market, SpecCategory } from '../data/schema';
import { CATALOGUE_CATEGORIES } from './catalogue';
import type {
  BuildCategory,
  BuildParts,
  Catalogue,
  RuleId,
  RuleNotRun,
  RuleResult,
  RuleSpec,
  RuleStatus,
} from './types';

/**
 * One combination of picked parts: a part id per category the rule reads, or `null` for an
 * optional category that is not picked. Categories the rule doesn't read are absent.
 */
export type Combination = Readonly<Partial<Record<BuildCategory, string | null>>>;

/** A rule's evaluate function (WP-E1): a pure function of the build and the catalogue. */
export type RuleEvaluator = (build: BuildParts, catalogue: Catalogue) => RuleResult | RuleNotRun;

/** One combination in a rule's dump. The engine saw `buildPartsOf(parts)`. */
export interface DumpedCombination {
  readonly parts: Combination;
  /** The rule's verdict, or `null` while the rule is not implemented. */
  readonly result: RuleResult | RuleNotRun | null;
}

/** One rule's dump: `artifacts/engine/rules/<id>.json`. */
export interface RuleDump {
  readonly id: RuleId;
  readonly title: string;
  readonly reads: RuleSpec['reads'];
  readonly numeric: boolean;
  readonly outcomes: readonly RuleStatus[];
  /** `false` until WP-E1 plugs in the rule's evaluate function. */
  readonly implemented: boolean;
  readonly combinationCount: number;
  /** In `combinationsOf` order. */
  readonly combinations: readonly DumpedCombination[];
}

/** What the dump covered: `artifacts/engine/summary.json`, with the engine commit added. */
export interface EngineDumpSummary {
  /** The SHA-256 of the data files (`Catalogue.dataHash`). */
  readonly dataHash: string;
  /** Records per catalogue category, in data-lead order. */
  readonly parts: Readonly<Record<SpecCategory, number>>;
  readonly prices: Readonly<
    Record<Market, { readonly observations: number; readonly gaps: number }>
  >;
  /** Benchmark rows: the anchors of the performance model. */
  readonly anchors: { readonly game: number; readonly creator: number };
  /** One row per dumped rule, in the order dumped. */
  readonly rules: readonly {
    readonly id: RuleId;
    readonly implemented: boolean;
    readonly combinationCount: number;
  }[];
}

/**
 * Every combination of the parts in the read categories, in catalogue order: the cartesian
 * product, the first category varying slowest. An optional category adds "not picked" (`null`)
 * after its parts. Keys follow the order of `reads`.
 */
export function combinationsOf(catalogue: Catalogue, reads: RuleSpec['reads']): Combination[] {
  return reads.reduce<Combination[]>(
    (combinations, { category, optional }) => {
      const choices: (string | null)[] = catalogue.parts[category].map((part) => part.id);
      if (optional) choices.push(null);
      return combinations.flatMap((combination) =>
        choices.map((choice) => ({ ...combination, [category]: choice })),
      );
    },
    [{}],
  );
}

/**
 * The build a combination stands for. Every category it doesn't name is unpicked. A drive
 * becomes a one-drive list, and a case fan one retail pack.
 */
export function buildPartsOf(combination: Combination): BuildParts {
  const drive = combination.storage ?? null;
  const fan = combination['case-fan'] ?? null;
  return {
    cpu: combination.cpu ?? null,
    motherboard: combination.motherboard ?? null,
    ram: combination.ram ?? null,
    'gpu-card': combination['gpu-card'] ?? null,
    storage: drive === null ? [] : [drive],
    psu: combination.psu ?? null,
    cooler: combination.cooler ?? null,
    case: combination.case ?? null,
    'case-fan': fan === null ? null : { partId: fan, packs: 1 },
  };
}

/**
 * One rule's dump: its metadata and every catalogue combination it reads, each with the rule's
 * result. Without `evaluate`, the rule is not implemented yet and every result is `null`.
 */
export function dumpRule(spec: RuleSpec, catalogue: Catalogue, evaluate?: RuleEvaluator): RuleDump {
  const combinations = combinationsOf(catalogue, spec.reads);
  return {
    id: spec.id,
    title: spec.title,
    reads: spec.reads,
    numeric: spec.numeric,
    outcomes: spec.outcomes,
    implemented: evaluate !== undefined,
    combinationCount: combinations.length,
    combinations: combinations.map((parts) => ({
      parts,
      result: evaluate === undefined ? null : evaluate(buildPartsOf(parts), catalogue),
    })),
  };
}

/** The dump's summary: what the catalogue held, and what each rule dump covered. */
export function dumpSummary(
  catalogue: Catalogue,
  ruleDumps: readonly RuleDump[],
): EngineDumpSummary {
  const pricesIn = (market: Market) => ({
    observations: catalogue.prices[market].observations.length,
    gaps: catalogue.prices[market].gaps.length,
  });
  return {
    dataHash: catalogue.dataHash,
    parts: Object.fromEntries(
      CATALOGUE_CATEGORIES.map((category) => [category, catalogue.parts[category].length]),
    ) as Record<SpecCategory, number>,
    prices: { SA: pricesIn('SA'), US: pricesIn('US') },
    anchors: { game: catalogue.gameBenchmarks.length, creator: catalogue.creatorBenchmarks.length },
    rules: ruleDumps.map(({ id, implemented, combinationCount }) => ({
      id,
      implemented,
      combinationCount,
    })),
  };
}
