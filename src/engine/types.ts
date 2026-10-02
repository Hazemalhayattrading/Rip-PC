/**
 * The engine's contract: what goes in, and every result type that comes out (plan WP-E0).
 *
 * The lab, QA's dump readers and WP-E1 to WP-E5 build against this file, so it was fixed and
 * reviewed (qa-lead, design-lead) before any rule was written. Change it only through
 * build-lead, and send the change for review again.
 *
 * Conventions for every type here:
 * - Results are plain, JSON-serialisable data: no functions, no classes, no `undefined`. A
 *   missing value is `null`, so `npm run engine:dump` writes exactly what the lab shows.
 * - Every sentence the engine writes (`reason`, `advice`, `explanation`, `verdict`) is plain
 *   English, gives numbers with their units, and names parts as the catalogue writes them
 *   (design-lead's copy guide, WP-DS2).
 * - Every number traces to a source: a spec on a part (`SpecEvidence`), a benchmark row
 *   (`AnchorUse`), a power constant (`PowerBasis`) or a price observation (`PriceRef`).
 * - Estimates are ranges with a confidence level (`Estimate`), never single numbers
 *   (CLAUDE.md rule 2). Where there is no source there is no estimate (`NoEstimate`).
 *
 * This module imports types only, so it adds nothing to any bundle except the `as const`
 * lists that the union types are read from.
 */
import type {
  Currency,
  Market,
  Resolution,
  SourceRef,
  SpecCategory,
  SpecRecordByCategory,
  CreatorBenchmark,
  Game,
  GameBenchmark,
  PriceFile,
  Publisher,
} from '../data/schema';

// ---------------------------------------------------------------------------------------------
// Shared building blocks

export const CONFIDENCES = ['low', 'medium', 'high'] as const;

/**
 * How sure the engine is about an estimate. The proposed meaning (plan WP-E3), finalised and
 * calibrated on the held-out results in WP-E3:
 * - `high`: an anchor exists for this chip, game and setting;
 * - `medium`: interpolated between anchored chips;
 * - `low`: extrapolated, or combined across publishers.
 */
export type Confidence = (typeof CONFIDENCES)[number];

/**
 * An estimated quantity with its uncertainty: an fps range, a render time, a percentage gain.
 * Built with `estimate()`, which rejects non-finite bounds and `low > high`. The unit lives on
 * the enclosing result, never here.
 */
export interface Estimate {
  readonly low: number;
  readonly high: number;
  readonly confidence: Confidence;
}

/**
 * Units the engine shows. Spec field names carry their unit as a suffix (`lengthMm`,
 * `cardPowerW`, `speedMtps`), and the lab maps each suffix to one of these.
 */
export type Unit =
  | 'mm'
  | 'W'
  | 'V'
  | 'MHz'
  | 'MT/s'
  | 'MB'
  | 'GB'
  | 'Gbps'
  | 'GB/s'
  | 'MB/s'
  | 'TBW'
  | 'bits'
  | 'RPM'
  | 'CFM'
  | 'mmH2O'
  | 'dBA'
  | 'sone'
  | 'L'
  | 'years'
  | 'slots'
  | 'lanes'
  | 'fps'
  | 'points'
  | 'samples/min'
  | 's'
  | 'tokens/s'
  | '%';

/** A spec value as the engine read it. `null` means the maker does not publish it. */
export type SpecValue = string | number | boolean | null | readonly (string | number)[];

/** The categories a build picks parts from. GPU chips are not sold; a build picks a card. */
export type BuildCategory = Exclude<SpecCategory, 'gpu-chip'>;

/** One part of the build that a result concerns. */
export interface PartRef {
  readonly category: BuildCategory;
  readonly partId: string;
}

/**
 * One spec the engine read, with every source that backs it. The lab's source links, QA's
 * per-rule checks and the "not published" notes all come from here.
 */
export interface SpecEvidence {
  readonly partId: string;
  /** `gpu-chip` too: VRAM size and reference power come from the card's chip. */
  readonly category: SpecCategory;
  /**
   * Dot path into the record, in the form `SourceRef.fields` uses: `lengthMm`, `socket`,
   * `gpuClearance.1.maxLengthMm`, `biosSupport.cpus.3.minBiosVersion`.
   */
  readonly field: string;
  readonly value: SpecValue;
  /** `null` for values without a unit: a socket, a form factor, a yes or no. */
  readonly unit: Unit | null;
  /**
   * - `published`: the maker publishes it, and `value` holds it.
   * - `none`: `value` is `null` because the schema defines null as "the part has none" for
   *   this field (`igpu`, `wifi`, `boxCooler`, ...). A real answer: "no integrated graphics".
   * - `not-published`: `value` is `null` because the maker doesn't publish it, and `note`
   *   says so. A rule that needs it can't verify (`cantVerify: true`), never `ok`.
   */
  readonly availability: 'published' | 'none' | 'not-published';
  /**
   * The record's note for this field, word for word, or `null`. Always set for
   * `not-published` ("DeepCool does not publish the RAM clearance").
   */
  readonly note: string | null;
  /**
   * The record's sources whose `fields` cover this path, plus those without `fields` (they
   * back the whole record). Never empty: the validator requires a source for every value.
   */
  readonly sources: readonly SourceRef[];
}

/** An amount of money, exactly as a retailer displayed it. Never converted between currencies. */
export interface Money {
  readonly amount: number;
  readonly currency: Currency;
}

/** One observed price, carried with the result that used it, so "price as of" is never lost. */
export interface PriceRef {
  readonly partId: string;
  readonly market: Market;
  readonly price: Money;
  /** Retailer publisher id. */
  readonly retailer: string;
  /** The live product page the amount was read from. */
  readonly url: string;
  readonly inStock: boolean;
  /** The UTC date the page was read: the lab and the builder show "Price as of <date>". */
  readonly retrievedAt: string;
}

/** The engine has no source for this number, so it gives none. The UI says why. */
export interface NoEstimate {
  readonly kind: 'no-estimate';
  /** One sentence: "No published test of EA SPORTS FC 27 at 4K yet." */
  readonly reason: string;
}

/** A benchmark row the model used, with how it used it. */
export interface AnchorUse {
  /** The row's `id` in `data/benchmarks/game.json` or `data/benchmarks/creator.json`. */
  readonly benchmarkId: string;
  readonly kind: 'game' | 'creator';
  /**
   * How the row entered the estimate:
   * - `exact`: same chip (or CPU), game or test, and setting;
   * - `interpolation`: one of the anchored parts on either side of the picked part;
   * - `extrapolation`: the nearest anchored part, when the picked part is outside them all;
   * - `scaling`: a ratio, such as a RAM-speed or reference-CPU scaling test (plan §8, risk 1).
   */
  readonly role: 'exact' | 'interpolation' | 'extrapolation' | 'scaling';
  /** The published number, with its unit: avg fps, Cinebench points, Blender samples per minute. */
  readonly value: number;
  readonly unit: Unit;
  /** The publisher id of the review or database. */
  readonly publisher: string;
  /** The review's publish date (the row's `publishedAt`). */
  readonly publishedAt: string;
  readonly sources: readonly SourceRef[];
}

// ---------------------------------------------------------------------------------------------
// Inputs

/**
 * The catalogue, as the build writes it to one content-hashed JSON file after validating every
 * data file with data-lead's Zod schemas. The engine takes it as an argument and never loads
 * anything itself, so it stays pure and runs the same in the browser, in tests and in the dump.
 */
export interface Catalogue {
  readonly schemaVersion: 1;
  /** SHA-256 of the data files the catalogue was built from (hex), so every result can name its data. */
  readonly dataHash: string;
  readonly publishers: readonly Publisher[];
  readonly parts: { readonly [C in SpecCategory]: readonly SpecRecordByCategory[C][] };
  readonly prices: Readonly<Record<Market, PriceFile>>;
  readonly games: readonly Game[];
  readonly gameBenchmarks: readonly GameBenchmark[];
  readonly creatorBenchmarks: readonly CreatorBenchmark[];
}

/**
 * The parts of one build, by part id. `null` (or an empty list) means not picked yet.
 * Rules that need a part that isn't picked don't run (`RuleNotRun`).
 */
export interface BuildParts {
  readonly cpu: string | null;
  readonly motherboard: string | null;
  /** One RAM kit. Its module count is on the kit. */
  readonly ram: string | null;
  readonly 'gpu-card': string | null;
  /**
   * Drives, in the order the buyer added them. The same drive may appear more than once. The
   * engine assigns the M.2 slots and SATA ports itself (`m2-lanes`).
   */
  readonly storage: readonly string[];
  readonly psu: string | null;
  readonly cooler: string | null;
  readonly case: string | null;
  /** Fans bought on top of the case's own: one fan model, in retail packs. */
  readonly 'case-fan': { readonly partId: string; readonly packs: number } | null;
}

// ---------------------------------------------------------------------------------------------
// 1. Compatibility (BUILD_PROMPT §5.1, plan WP-E1 and §3)

/**
 * The 20 rule ids, in the order the lab lists them: test plan §9.2's 18 plus `cooler-socket`
 * and `display-output` (Hazem, plan §6). Ids are stable: tests, QA's trace and share links
 * name them, so an id is never renamed.
 */
export const RULE_IDS = [
  'cpu-socket',
  'cpu-chipset',
  'bios-version',
  'ram-type',
  'ram-slots',
  'ram-speed',
  'gpu-length',
  'gpu-thickness',
  'cooler-height',
  'ram-cooler-clearance',
  'radiator-fit',
  'psu-form-factor',
  'psu-length',
  'psu-wattage',
  'gpu-power-connector',
  'm2-lanes',
  'board-form-factor',
  'usb-c-header',
  'cooler-socket',
  'display-output',
] as const;
export type RuleId = (typeof RULE_IDS)[number];

export const RULE_STATUSES = ['ok', 'warn', 'block'] as const;

/** BUILD_PROMPT §5.1: every result is `ok`, `warn` or `block`, listed best first. */
export type RuleStatus = (typeof RULE_STATUSES)[number];

/**
 * The four states the lab's status chip shows (design-lead's lab spec). "Can't verify" is a
 * `warn` result with `cantVerify: true`, never a fifth status: missing data is never `ok`
 * (test plan §9.1, `compatibility.unknownDataMustNotReturn`).
 */
export type StatusChip = RuleStatus | 'cant-verify';

interface RuleResultFields {
  readonly ruleId: RuleId;
  /** The parts this result is about, in build order. Storage may list several drives. */
  readonly parts: readonly PartRef[];
  /**
   * One sentence, numbers with units. Examples (final wording: design-lead, WP-DS2):
   * - block: "Needs AM5 — your board is LGA1851."
   * - ok: "The 320 mm Sapphire Pulse RX 9070 XT fits the Fractal North's 355 mm limit."
   * - can't verify: "Can't verify: DeepCool doesn't publish the AN400's RAM clearance."
   * For a numeric limit, the reason says what happens exactly at the limit (test plan §9.1).
   */
  readonly reason: string;
  /**
   * What the buyer should do, in order, one sentence each. Empty when there is nothing to do.
   * The BIOS warning (plan §6) uses it: "Ask the retailer for a board already updated to BIOS
   * 1205 or later." With BIOS FlashBack, it lists the update steps instead.
   */
  readonly advice: readonly string[];
  /** Every spec the rule read, including the unpublished ones. */
  readonly evidence: readonly SpecEvidence[];
  /**
   * For a rule that depends on how the case is arranged: the id of the layout in
   * `CompatReport.layout` it was checked under. `null` for every other rule.
   */
  readonly layoutId: string | null;
}

/**
 * One rule's verdict on a build. A pure function of the build and the catalogue: the same
 * inputs always give the same result.
 */
export type RuleResult = RuleResultFields &
  (
    | { readonly status: 'ok' | 'block'; readonly cantVerify: false }
    | {
        readonly status: 'warn';
        /**
         * `true` when the rule could not decide because a spec it needs is not published:
         * the chip says "Can't verify", and `evidence` holds the null value with its note.
         * `false` for a real concern, such as RAM above its official speed.
         */
        readonly cantVerify: boolean;
      }
  );

/**
 * A rule that did not run, and why. Together, `CompatReport.results` and `.notRun` name every
 * rule exactly once, so a rule is never silently skipped.
 */
export interface RuleNotRun {
  readonly ruleId: RuleId;
  /**
   * - `needs-parts`: a part it checks isn't picked yet ("Pick a case to check the card's length.");
   * - `not-applicable`: the build has nothing for it to check, for example `radiator-fit`
   *   with an air cooler. A rule must never use this to hide a combination it can't judge:
   *   that is a `warn` with `cantVerify: true`.
   */
  readonly why: 'needs-parts' | 'not-applicable';
  /** The categories still to pick, for `needs-parts`. Empty for `not-applicable`. */
  readonly needs: readonly BuildCategory[];
  readonly reason: string;
}

/**
 * One arrangement of a case's movable or optional parts: the Fractal Terra's spine position,
 * the Fractal North's drive trays, which mount the radiator uses (plan WP-E1).
 */
export interface CaseLayout {
  /** Stable within its case, for example `spine-3` or `trays-a.radiator-top`. */
  readonly id: string;
  /** One sentence: "Spine at position 3, radiator at the top." */
  readonly description: string;
  /** The specs that define this layout, with their sources. */
  readonly evidence: readonly SpecEvidence[];
}

/**
 * The layout search: the engine looks for one layout that meets every case constraint at once,
 * and says which it assumed, or why none works.
 */
export type LayoutSearch =
  | {
      readonly fits: true;
      readonly layout: CaseLayout;
      /** How many other layouts also fit. The lab can say "1 of 3 layouts that fit". */
      readonly alsoFits: number;
    }
  | {
      readonly fits: false;
      /** One sentence: "No spine position fits both the 160 mm cooler and the 2.7-slot card." */
      readonly reason: string;
      /** Every layout tried, so the lab can show what each one fails on. */
      readonly tried: readonly CaseLayout[];
    };

/** Where one drive goes, as `m2-lanes` assigned it. */
export interface DriveSlot {
  /** The drive, as listed in `BuildParts.storage`. */
  readonly partId: string;
  /** The board's slot or port id (`m2-1`, `sata-3`), or `null` when no slot is left for it. */
  readonly slotId: string | null;
  /** The slot's name in the manual ("M.2_1", "SATA6G_3"), or `null` with `slotId`. */
  readonly label: string | null;
}

/** The compatibility of one build. */
export interface CompatReport {
  /** One result per rule that ran, in `RULE_IDS` order. */
  readonly results: readonly RuleResult[];
  /** One entry per rule that did not run, in `RULE_IDS` order. */
  readonly notRun: readonly RuleNotRun[];
  /** The worst status in `results`, or `null` when no rule ran (never "ok" by default). */
  readonly worst: RuleStatus | null;
  /** `null` when no case is picked. */
  readonly layout: LayoutSearch | null;
  /** The slot each drive was assigned, in `BuildParts.storage` order. `null` without a board. */
  readonly driveSlots: readonly DriveSlot[] | null;
}

/** What QA's trace and the dump read about each rule (test plan §9.1 to §9.3). */
export interface RuleSpec {
  readonly id: RuleId;
  /** The lab row's plain-English name: "CPU socket", "Graphics card length". */
  readonly title: string;
  /** What it checks, one line (plan §3, "Checks"). */
  readonly checks: string;
  /** The statuses it can return (test plan §9.2, "Results"). */
  readonly outcomes: readonly RuleStatus[];
  /** A numeric limit: it needs boundary tests at the limit, 1 unit under and 1 unit over. */
  readonly numeric: boolean;
  /**
   * The categories it reads. The dump enumerates every catalogue combination of them; an
   * `optional` category also gets "not picked", which some rules turn on (`display-output`
   * without a graphics card).
   */
  readonly reads: readonly { readonly category: BuildCategory; readonly optional: boolean }[];
}

// ---------------------------------------------------------------------------------------------
// 2. Power (BUILD_PROMPT §5.2, plan WP-E2)

/**
 * Where a power figure comes from:
 * - `spec`: a value on a part, such as a CPU's PPT or a card's TBP;
 * - `constant`: an entry in data-lead's power constants registry (WP-D1), such as RAM per
 *   module. `derivation` explains a worked-out value: "rated 0.25 A × 12 V".
 */
export type PowerBasis =
  | { readonly kind: 'spec'; readonly evidence: readonly SpecEvidence[] }
  | {
      readonly kind: 'constant';
      readonly constantId: string;
      readonly derivation: string | null;
      readonly sources: readonly SourceRef[];
    };

/** A power figure in watts, with its basis. */
export interface PowerFigure {
  readonly watts: number;
  readonly basis: PowerBasis;
}

export type PowerComponent =
  'cpu' | 'gpu' | 'motherboard' | 'ram' | 'storage' | 'case-fans' | 'cooler-fans' | 'pump';

/** One line of the power breakdown. */
export interface PowerLine {
  readonly component: PowerComponent;
  /** The part, or `null` for a line made of several parts (all the drives) or a constant. */
  readonly partId: string | null;
  /** "Ryzen 7 9800X3D, PPT", "2 DDR5 modules", "3 case fans". */
  readonly label: string;
  /** How many units the line counts: modules, drives, fans. */
  readonly count: number;
  /** The line's total for a gaming load, and for the worst case. */
  readonly gaming: PowerFigure;
  readonly worstCase: PowerFigure;
}

/** Extra capacity for the GPU's power spikes, by GPU class (ATX 3.1 and GPU makers' guidance). */
export interface TransientHeadroom {
  /** The class id in the power constants registry. */
  readonly gpuClass: string;
  /** "Graphics cards rated 300 W and up." */
  readonly label: string;
  readonly headroomW: number;
  readonly basis: PowerBasis;
}

/** A recommended PSU size, always a range ("750–850 W"), never a single number. */
export interface PsuRange {
  readonly minW: number;
  readonly maxW: number;
  /** One sentence on how the range follows from the loads and the headroom. */
  readonly explanation: string;
}

/** The power estimate of one build. It feeds `psu-wattage`. */
export interface PowerEstimate {
  readonly lines: readonly PowerLine[];
  /** Sums of the lines. Labelled "estimated" wherever they are shown. */
  readonly gamingW: number;
  readonly worstCaseW: number;
  /** `null` when no graphics card is picked. */
  readonly transient: TransientHeadroom | null;
  readonly recommended: PsuRange;
  /**
   * The card maker's recommended PSU, shown next to the range for comparison (plan WP-E2:
   * the range should include it, or the hand-off explains why not). `null` without a card,
   * or when the maker publishes none.
   */
  readonly makerRecommendation: { readonly watts: number; readonly evidence: SpecEvidence } | null;
  /**
   * Parts the estimate could not count: not picked, or a power spec not published. When this
   * isn't empty, the totals are a lower bound and the lab says so.
   */
  readonly missing: readonly { readonly component: PowerComponent; readonly reason: string }[];
}

// ---------------------------------------------------------------------------------------------
// 3. Game performance (BUILD_PROMPT §5.3, plan WP-E3)

/** An upscaler and its mode, as the game's menu names them ("DLSS", "Quality"). */
export interface UpscalingChoice {
  readonly method: 'DLSS' | 'FSR' | 'XeSS' | 'TSR';
  readonly mode: string;
}

/** What to estimate: one game at one setting. */
export interface GameQuery {
  readonly gameId: string;
  readonly resolution: Resolution;
  /** The game's own English preset name (WP-D2 maps each publisher's label onto it). */
  readonly preset: string;
  readonly rayTracing: 'off' | 'on' | 'path-tracing';
  /** `null` for native rendering. */
  readonly upscaling: UpscalingChoice | null;
}

/** One side of the min(GPU, CPU) model: the frame rate this part allows. */
export interface FpsLimit {
  readonly fps: Estimate;
  readonly anchors: readonly AnchorUse[];
  /** One sentence on how the number was reached: "Interpolated between the RTX 5070 and ...". */
  readonly explanation: string;
}

/** Whether the setting fits in the card's memory, from published VRAM-use tests (WP-D2). */
export type VramCheck =
  | {
      readonly status: 'fits' | 'exceeds';
      readonly cardGb: number;
      readonly neededGb: number;
      readonly anchors: readonly AnchorUse[];
    }
  | { readonly status: 'unknown'; readonly cardGb: number; readonly reason: string };

/** A frame-rate estimate. `avg` is the headline range. */
export interface FpsResult {
  readonly kind: 'estimate';
  readonly avg: Estimate;
  /** 1% lows, when the anchors publish them; otherwise `null`. */
  readonly onePercentLow: Estimate | null;
  /** The part that limits the frame rate: the lower of `gpuLimit` and `cpuLimit`. */
  readonly limiter: 'gpu' | 'cpu';
  readonly gpuLimit: FpsLimit;
  readonly cpuLimit: FpsLimit;
  /** The RAM speed and capacity adjustment, applied after the min. `null` when none applies. */
  readonly ram: {
    readonly factor: Estimate;
    readonly explanation: string;
    readonly anchors: readonly AnchorUse[];
  } | null;
  /** A setting that needs more VRAM than the card has is flagged here, never hidden. */
  readonly vram: VramCheck;
}

/**
 * The game estimate for one build and one query. Native, upscaled and frame-generation figures
 * are separate fields, so a frame-generation number can never enter a native one
 * (BUILD_PROMPT §5.3). Every anchor today has frame generation off, so `frameGeneration` is a
 * `NoEstimate` until a source for it exists.
 */
export interface FpsEstimate {
  readonly query: GameQuery;
  readonly native: FpsResult | NoEstimate;
  /** `null` when the query is native. */
  readonly upscaled: FpsResult | NoEstimate | null;
  readonly frameGeneration: NoEstimate;
}

// ---------------------------------------------------------------------------------------------
// 4. Creator workloads (BUILD_PROMPT §5.3, plan WP-E4)

export const CREATOR_WORKLOADS = [
  'blender',
  'cinebench-2024-single',
  'cinebench-2024-multi',
  'video-export',
  'code-compile',
  'local-ai',
] as const;
export type CreatorWorkload = (typeof CREATOR_WORKLOADS)[number];

/** A creator estimate with a source behind it. */
export interface CreatorResult {
  readonly kind: 'estimate';
  readonly value: Estimate;
  /** Blender: `s` for a named scene's render time, or `samples/min` when no sample count is published (plan §8, risk 4). */
  readonly unit: Unit;
  /** `false` for times, where lower is better. */
  readonly higherIsBetter: boolean;
  readonly anchors: readonly AnchorUse[];
  readonly explanation: string;
}

/** Local AI only: the model doesn't fit in the card's memory, so there is no speed to give. */
export interface DoesNotFit {
  readonly kind: 'does-not-fit';
  /** "Doesn't fit in 8 GB: Llama 3.1 8B at Q8_0 needs about 9.5 GB." */
  readonly reason: string;
  readonly neededGb: number;
  readonly availableGb: number;
  readonly anchors: readonly AnchorUse[];
}

/** One named test of one creator workload, for one build. */
export interface CreatorEstimate {
  readonly workload: CreatorWorkload;
  /**
   * The named test, as the result's sources name it, and unique within its workload:
   * "Blender 5.2.0, scene 'monster', OptiX", "Cinebench 2024 multi-core",
   * "Llama 3.1 8B Instruct, Q4_K_M".
   */
  readonly test: string;
  /** The part that runs it. */
  readonly device: PartRef;
  readonly result: CreatorResult | DoesNotFit | NoEstimate;
}

// ---------------------------------------------------------------------------------------------
// 5. Bottleneck analysis (BUILD_PROMPT §5.4, plan WP-E5)

/** The workload a bottleneck report is about. */
export type WorkloadRef =
  | { readonly kind: 'game'; readonly query: GameQuery }
  | { readonly kind: 'creator'; readonly workload: CreatorWorkload; readonly test: string };

/** What a one-tier-up part would gain in the workload. */
export interface TierUpgrade {
  readonly category: 'cpu' | 'gpu-card';
  readonly from: string;
  /**
   * The next-faster catalogue part with a price in the chosen market (plan WP-E5), or `null`
   * when there is none: the reason then says so.
   */
  readonly to: string | null;
  /** The gain in the workload's own metric, in percent. `null` when `to` is `null`. */
  readonly gainPct: Estimate | null;
  readonly price: PriceRef | null;
  readonly reason: string;
}

/** A build at the same total price, rebalanced towards the workload. */
export interface RebalancedBuild {
  readonly parts: BuildParts;
  /** Only the swapped parts. */
  readonly changes: readonly {
    readonly category: BuildCategory;
    readonly from: string;
    readonly to: string;
  }[];
  /** The rebalanced build's total, from `prices`. Within 5% of the original total (plan §6). */
  readonly total: Money;
  /** The difference from the original total, in percent: +3.1 means 3.1% dearer. */
  readonly totalDeltaPct: number;
  /** The gain in the workload's own metric, in percent. */
  readonly gainPct: Estimate;
  /** Every price used, so the lab can show each "price as of" date. */
  readonly prices: readonly PriceRef[];
  /** The rebalanced build passes every rule with ok or warn. Its warnings are listed here. */
  readonly warnings: readonly RuleResult[];
}

/** Which part holds the build back in one workload, by how much, and what to do about it. */
export interface BottleneckReport {
  readonly workload: WorkloadRef;
  readonly market: Market;
  /** `null` when the workload has no estimate, so there is nothing to compare. */
  readonly limiter: 'cpu' | 'gpu' | null;
  /**
   * The plain-English verdict: "At 1440p High in Cyberpunk 2077 your GPU is the limit. A faster
   * CPU would add about 2%, a GPU one tier up about 28%." Every percentage in it comes from
   * `upgrades`, rounded as written, and a test pins it (plan WP-E5).
   */
  readonly verdict: string;
  readonly upgrades: readonly TierUpgrade[];
  /** 1 to 3 builds; empty only with `noRebalanceReason`. */
  readonly rebalanced: readonly RebalancedBuild[];
  /** Why there are no rebalanced builds ("No price for the Fractal Terra in Saudi Arabia"), or `null`. */
  readonly noRebalanceReason: string | null;
  /** The original build's total in the market, or `null` when a part has no price there. */
  readonly total: Money | null;
}

// ---------------------------------------------------------------------------------------------
// The engine's entry points (implemented in WP-E1 to WP-E5)

/** Every entry point takes the catalogue as an argument and does no I/O. */
export interface EngineApi {
  readonly checkCompatibility: (build: BuildParts, catalogue: Catalogue) => CompatReport;
  readonly estimatePower: (build: BuildParts, catalogue: Catalogue) => PowerEstimate;
  readonly estimateFps: (build: BuildParts, query: GameQuery, catalogue: Catalogue) => FpsEstimate;
  /** Every named test of every workload, in `CREATOR_WORKLOADS` order. */
  readonly estimateCreator: (build: BuildParts, catalogue: Catalogue) => readonly CreatorEstimate[];
  readonly analyseBottleneck: (
    build: BuildParts,
    workload: WorkloadRef,
    market: Market,
    catalogue: Catalogue,
  ) => BottleneckReport;
}
