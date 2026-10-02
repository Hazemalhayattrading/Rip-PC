/**
 * The engine dump, pure part (plan WP-E0): every catalogue combination a rule's sweep gives
 * (`RuleSpec.sweep`), with the rule's result for each. QA's sweep and its per-rule workers read
 * it, so QA never reads the engine's code. `scripts/engine-dump.ts` writes it to
 * `artifacts/engine/`.
 *
 * A rule's dump is a table:
 * - `columns`: the read categories in reads order, plus `radiatorPosition` for a layout rule;
 * - `rows`: one per combination. A cell is a part id, the drive list for `storage`, or `null`
 *   for "not picked" (for the radiator position: unset, so the engine picks the position);
 * - `results`: the rule's verdict on each row, aligned with the rows, `null` before WP-E1.
 * `partsOfRow` turns a row back into the build the engine checked.
 *
 * Everything here is plain JSON (null, never undefined) and deterministic: no dates, no
 * randomness, catalogue order throughout.
 */
import type { Market, MountPosition, SpecCategory } from '../data/schema';
import { CATALOGUE_CATEGORIES } from './catalogue';
import type { RuleEvaluator } from './compat/check';
import { RULE_SPECS } from './rules';
import type {
  BuildCategory,
  BuildParts,
  Catalogue,
  RuleId,
  RuleNotRun,
  RuleRead,
  RuleResult,
  RuleSpec,
} from './types';

/** A column of a rule's rows: a read category, or the radiator position of a layout rule. */
export type DumpColumn = BuildCategory | 'radiatorPosition';

/** One cell: a part id, a list of drive ids for `storage`, or `null` for not picked. */
export type DumpCell = string | readonly string[] | null;

/** One combination, a cell per column. */
export type DumpRow = readonly DumpCell[];

/** The catalogue parts of one category with the lowest and the highest power draw (WP-E2). */
export interface PartExtremes {
  readonly lowest: string;
  readonly highest: string;
}

/** WP-E2's power draws, for the `power-extremes` sweep: each category's extreme parts. */
export type PowerExtremes = (category: BuildCategory) => PartExtremes;

/** A sweep's rows, and whether they cover every catalogue combination the rule can meet. */
export interface SweptRows {
  readonly rows: readonly DumpRow[];
  /**
   * `false` for `power-extremes` without the power draws (WP-E0): the categories besides the
   * CPU, the card and the power supply stay unpicked, so the rows bound nothing yet.
   */
  readonly complete: boolean;
}

export interface DumpOptions {
  /** The rule's evaluate function (WP-E1). Without it, every result is `null`. */
  readonly evaluate?: RuleEvaluator | undefined;
  /** The power draws for `power-extremes` (WP-E2). */
  readonly extremes?: PowerExtremes | undefined;
}

/** One rule's dump, `artifacts/engine/rules/<id>.json`: its spec, then its sweep as a table. */
export interface RuleDump extends RuleSpec {
  /** `false` until WP-E1 plugs in the rule's evaluate function. */
  readonly implemented: boolean;
  readonly complete: boolean;
  readonly combinationCount: number;
  readonly columns: readonly DumpColumn[];
  /** In sweep order. */
  readonly rows: readonly DumpRow[];
  /** The verdict on each row, aligned with `rows`; `null` while the rule is not implemented. */
  readonly results: readonly (RuleResult | RuleNotRun | null)[];
}

/** What the dump covered: `artifacts/engine/summary.json`, without the file header. */
export interface EngineDumpSummary {
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
    readonly complete: boolean;
    readonly combinationCount: number;
  }[];
  /** The spec of all 20 rules, implemented or not. */
  readonly specs: readonly RuleSpec[];
}

/** The categories the `power-extremes` sweep takes part by part. Every other read takes its extremes. */
const POWER_ENUMERATED: ReadonlySet<BuildCategory> = new Set(['cpu', 'gpu-card', 'psu']);

/** The columns of a rule's rows: its reads in reads order, plus the radiator position of a layout rule. */
export function dumpColumns(spec: RuleSpec): DumpColumn[] {
  const columns: DumpColumn[] = spec.reads.map((read) => read.category);
  return spec.layoutDependent ? [...columns, 'radiatorPosition'] : columns;
}

/** The cell for one part: its id, or a one-drive list for storage. */
const cellOf = (category: BuildCategory, id: string): DumpCell =>
  category === 'storage' ? [id] : id;

/** The cell for "not picked". */
const unpicked = (category: BuildCategory): DumpCell => (category === 'storage' ? [] : null);

/** One read's cells: every part in catalogue order, then "not picked" when it is optional. */
function choicesOf(catalogue: Catalogue, read: RuleRead): DumpCell[] {
  const cells = catalogue.parts[read.category].map((part) => cellOf(read.category, part.id));
  return read.optional ? [...cells, unpicked(read.category)] : cells;
}

/** Every row with one cell from each list, the first list varying slowest. */
function cartesian(lists: readonly (readonly DumpCell[])[]): DumpCell[][] {
  return lists.reduce<DumpCell[][]>(
    (rows, cells) => rows.flatMap((row) => cells.map((cell) => [...row, cell])),
    [[]],
  );
}

/** Every multiset of `size` items, each in the items' order: combinations with repetition. */
function multisetsOf(items: readonly string[], size: number): string[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, i) =>
    multisetsOf(items.slice(i), size - 1).map((rest) => [item, ...rest]),
  );
}

/** Every list of 1 to `maxDrives` catalogue drives, repeats allowed: smallest first, then catalogue order. */
function driveLists(catalogue: Catalogue, maxDrives: number): DumpCell[] {
  const drives = catalogue.parts.storage.map((drive) => drive.id);
  return Array.from({ length: maxDrives }, (_, i) => i + 1).flatMap((size) =>
    multisetsOf(drives, size),
  );
}

/** The id, checked to be a catalogue part of the category. */
function partIn(catalogue: Catalogue, category: BuildCategory, id: string): string {
  if (!catalogue.parts[category].some((part) => part.id === id)) {
    throw new RangeError(`The power extremes name ${id}, which is not a ${category} part.`);
  }
  return id;
}

/**
 * Every CPU, graphics card (and none, when optional) and power supply. With the power draws,
 * each such row comes twice: every other read at its lowest-draw part, then at its highest.
 */
function powerExtremeRows(
  spec: RuleSpec,
  catalogue: Catalogue,
  extremes: PowerExtremes | undefined,
): { rows: DumpCell[][]; complete: boolean } {
  const bases = cartesian(
    spec.reads.map((read) =>
      POWER_ENUMERATED.has(read.category) ? choicesOf(catalogue, read) : [unpicked(read.category)],
    ),
  );
  if (extremes === undefined) return { rows: bases, complete: false };
  const sides = (['lowest', 'highest'] as const).map((side) =>
    spec.reads.map((read) =>
      POWER_ENUMERATED.has(read.category)
        ? undefined
        : cellOf(read.category, partIn(catalogue, read.category, extremes(read.category)[side])),
    ),
  );
  return {
    rows: bases.flatMap((base) => sides.map((side) => base.map((cell, i) => side[i] ?? cell))),
    complete: true,
  };
}

/**
 * The positions a case takes for a cooler's radiator, in the case's order and without repeats.
 * None for an air cooler, no cooler or no case.
 */
function radiatorPositionsOf(
  catalogue: Catalogue,
  coolerId: unknown,
  caseId: unknown,
): MountPosition[] {
  const cooler = catalogue.parts.cooler.find((part) => part.id === coolerId);
  const pcCase = catalogue.parts.case.find((part) => part.id === caseId);
  if (cooler?.type !== 'aio' || pcCase === undefined) return [];
  const fits = pcCase.radiatorSupport.filter((mount) =>
    mount.sizesMm.includes(cooler.radiatorSizeMm),
  );
  return [...new Set(fits.map((mount) => mount.position))];
}

/** Each row with the radiator position unset, then at each position the case takes. */
function withRadiatorPositions(
  catalogue: Catalogue,
  spec: RuleSpec,
  rows: readonly DumpCell[][],
): DumpCell[][] {
  const columns = dumpColumns(spec);
  const cooler = columns.indexOf('cooler');
  const pcCase = columns.indexOf('case');
  return rows.flatMap((row) =>
    [null, ...radiatorPositionsOf(catalogue, row[cooler], row[pcCase])].map((position) => [
      ...row,
      position,
    ]),
  );
}

/**
 * The rows of a rule's sweep, in sweep order (`RuleSweep`):
 * - `product`: every combination of the reads, the first varying slowest, each optional read
 *   "not picked" after its parts;
 * - `drive-lists`: the same, with `storage` taking every list of 1 to `maxDrives` drives;
 * - `power-extremes`: see `PowerExtremes`.
 * A layout-dependent rule's rows then take each radiator position (unset first).
 * @throws {RangeError} when the power extremes name a part the catalogue doesn't have
 */
export function sweepRows(
  spec: RuleSpec,
  catalogue: Catalogue,
  extremes?: PowerExtremes,
): SweptRows {
  const { sweep } = spec;
  let swept: { rows: DumpCell[][]; complete: boolean };
  switch (sweep.kind) {
    case 'product':
      swept = {
        rows: cartesian(spec.reads.map((read) => choicesOf(catalogue, read))),
        complete: true,
      };
      break;
    case 'drive-lists':
      swept = {
        rows: cartesian(
          spec.reads.map((read) =>
            read.category === 'storage'
              ? driveLists(catalogue, sweep.maxDrives)
              : choicesOf(catalogue, read),
          ),
        ),
        complete: true,
      };
      break;
    case 'power-extremes':
      swept = powerExtremeRows(spec, catalogue, extremes);
      break;
  }
  const rows = spec.layoutDependent
    ? withRadiatorPositions(catalogue, spec, swept.rows)
    : swept.rows;
  return { rows, complete: swept.complete };
}

/**
 * The build a row stands for. A column the row doesn't have, `null` and an empty drive list
 * are "not picked"; a case fan is one retail pack.
 */
export function partsOfRow(columns: readonly DumpColumn[], row: DumpRow): BuildParts {
  const cellAt = (column: DumpColumn): DumpCell => row[columns.indexOf(column)] ?? null;
  const one = (category: Exclude<BuildCategory, 'storage'>): string | null => {
    const cell = cellAt(category);
    return typeof cell === 'string' ? cell : null;
  };
  const drives = cellAt('storage');
  const fan = one('case-fan');
  const position = cellAt('radiatorPosition');
  return {
    cpu: one('cpu'),
    motherboard: one('motherboard'),
    ram: one('ram'),
    'gpu-card': one('gpu-card'),
    storage: typeof drives === 'object' && drives !== null ? drives : [],
    psu: one('psu'),
    cooler: one('cooler'),
    case: one('case'),
    'case-fan': fan === null ? null : { partId: fan, packs: 1 },
    // The sweep writes only positions from a case's own radiator mounts here.
    radiatorPosition: typeof position === 'string' ? (position as MountPosition) : null,
  };
}

/**
 * One rule's dump: its spec, and every combination its sweep gives, each with the rule's
 * result. Without `evaluate`, the rule is not implemented yet and every result is `null`.
 * @throws {RangeError} when the power extremes name a part the catalogue doesn't have
 */
export function dumpRule(
  spec: RuleSpec,
  catalogue: Catalogue,
  options: DumpOptions = {},
): RuleDump {
  const { evaluate, extremes } = options;
  const columns = dumpColumns(spec);
  const { rows, complete } = sweepRows(spec, catalogue, extremes);
  return {
    ...spec,
    implemented: evaluate !== undefined,
    complete,
    combinationCount: rows.length,
    columns,
    rows,
    results: rows.map((row) =>
      evaluate === undefined ? null : evaluate(partsOfRow(columns, row), catalogue),
    ),
  };
}

/** The dump's summary: what the catalogue held, what each rule dump covered, and every spec. */
export function dumpSummary(
  catalogue: Catalogue,
  ruleDumps: readonly RuleDump[],
): EngineDumpSummary {
  const pricesIn = (market: Market) => ({
    observations: catalogue.prices[market].observations.length,
    gaps: catalogue.prices[market].gaps.length,
  });
  return {
    parts: Object.fromEntries(
      CATALOGUE_CATEGORIES.map((category) => [category, catalogue.parts[category].length]),
    ) as Record<SpecCategory, number>,
    prices: { SA: pricesIn('SA'), US: pricesIn('US') },
    anchors: { game: catalogue.gameBenchmarks.length, creator: catalogue.creatorBenchmarks.length },
    rules: ruleDumps.map(({ id, implemented, complete, combinationCount }) => ({
      id,
      implemented,
      complete,
      combinationCount,
    })),
    specs: RULE_SPECS,
  };
}
