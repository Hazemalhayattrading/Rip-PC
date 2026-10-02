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
 * - Every sentence the engine writes (`reason`, `action`, `steps`, `explanation`, `verdict`,
 *   `whatWouldHelp`) follows design-lead's copy guide (`docs/design/copy-guide.md`): one sentence
 *   per field, numbers with their units, and parts by their display name (`displayName`).
 * - Every number traces to a source: a spec on a part (`SpecEvidence`), a benchmark row
 *   (`AnchorUse`), a power constant (`PowerBasis`) or a price observation (`PriceRef`).
 * - Estimates are ranges with a confidence level (`Estimate`), never single numbers
 *   (CLAUDE.md rule 2). Where there is no source there is no estimate (`NoEstimate`).
 * - The invariants that types can't express are checked by `./invariants` (QA's sweep and every
 *   rule's tests run them).
 *
 * This module imports types only, so it adds nothing to any bundle except the `as const`
 * lists that the union types are read from.
 */
import type {
  CreatorBenchmark,
  Currency,
  Game,
  GameBenchmark,
  Market,
  MemoryType,
  MountPosition,
  PriceFile,
  Publisher,
  Resolution,
  SourceRef,
  SpecCategory,
  SpecRecordByCategory,
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
 * `cardPowerW`, `speedMtps`), and `unitOfField` maps each suffix to one of these.
 */
export const UNITS = [
  'mm',
  'W',
  'V',
  'MHz',
  'MT/s',
  'MB',
  'GB',
  'Gbps',
  'GB/s',
  'MB/s',
  'TBW',
  'bits',
  'RPM',
  'CFM',
  'mmH2O',
  'dBA',
  'sone',
  'L',
  'years',
  'slots',
  'lanes',
  'fps',
  'points',
  'samples/min',
  's',
  'tokens/s',
  '%',
] as const;
export type Unit = (typeof UNITS)[number];

/** A spec value as the engine read it. `null` means the part has none, or it isn't published. */
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
   * For a limit that holds only in some layouts, the condition in words, as the copy guide
   * writes it inside a sentence: "with a 360 mm front radiator", "with one HDD tray". `null`
   * for a value that always applies (design-lead's S2).
   */
  readonly condition: string | null;
  /**
   * The record's note for this field, word for word, or `null`. Always set for
   * `not-published` ("DeepCool does not publish the RAM clearance").
   */
  readonly note: string | null;
  /**
   * The record's sources whose `fields` overlap this path, plus those without `fields` (they
   * back the whole record). Never empty for a published value, because the validator requires a
   * source for every non-null value. A null value may have none: its `note` says why.
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
  /** The seller as the page shows it ("Amazon.sa", "Newegg"): the lab says "sold by …". */
  readonly seller: string;
  /** Sold by a third-party seller on a marketplace rather than by the retailer itself. */
  readonly isMarketplace: boolean;
  /** The live product page the amount was read from. */
  readonly url: string;
  readonly inStock: boolean;
  /** The UTC date the page was read: the lab and the builder show "Price as of <date>". */
  readonly retrievedAt: string;
}

/** The engine has no source for this number, so it gives none. The UI says why. */
export interface NoEstimate {
  readonly kind: 'no-estimate';
  /**
   * The line under the "No estimate yet" label (copy guide §10), one sentence: "There is no
   * published test of Elden Ring on the NVIDIA GeForce RTX 5060."
   */
  readonly reason: string;
}

/** The engine needs more parts before it can answer. The UI says which. */
export interface NeedsParts {
  readonly kind: 'needs-parts';
  readonly needs: readonly BuildCategory[];
  /** "Pick a CPU to estimate the frame rate." */
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
   * - `scaling`: a ratio, such as a RAM-speed or reference-CPU scaling test (plan §8, risk 1),
   *   or a per-source calibration (the Director's ruling of 2026-10-02).
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
 * One build: its parts by part id, keyed like the share URL's categories, plus the layout
 * choices the buyer fixed. `null` (or an empty list) means not picked yet. Rules that need a
 * part that isn't picked don't run (`RuleNotRun`).
 */
export interface BuildParts {
  readonly cpu: string | null;
  readonly motherboard: string | null;
  /** One RAM kit. Its module count is on the kit. */
  readonly ram: string | null;
  readonly 'gpu-card': string | null;
  /**
   * Drives, in the order the buyer added them. The same drive may appear more than once. The
   * engine assigns the M.2 slots and SATA ports itself (`CompatReport.driveSlots`).
   */
  readonly storage: readonly string[];
  readonly psu: string | null;
  readonly cooler: string | null;
  readonly case: string | null;
  /** Fans bought on top of the case's own: one fan model, in retail packs. */
  readonly 'case-fan': { readonly partId: string; readonly packs: number } | null;
  /**
   * Where the buyer mounts a liquid cooler's radiator. `null` lets the engine pick any position
   * the case takes. A fixed position limits the layout search to layouts that use it: "the
   * SAPPHIRE PULSE AMD Radeon RX 9070 XT 16GB in the North with a front 360" is a block, the same
   * build with the radiator anywhere is not.
   */
  readonly radiatorPosition: MountPosition | null;
}

/**
 * Memory as the performance model reads it: a catalogue kit's specs, or a published test
 * bench's memory ("2 x 24 GB DDR5-6000 30-38-38-96").
 */
export interface RamConfig {
  readonly type: MemoryType;
  readonly speedMtps: number;
  /** All modules together. */
  readonly capacityGb: number;
  readonly moduleCount: number;
  /** CAS latency, when it is stated. */
  readonly cl: number | null;
}

/**
 * The system the performance model estimates: catalogue CPU and GPU chip ids plus memory
 * (QA's C1). A build resolves to one through `EngineApi.systemOf`. The golden test, the
 * held-out run and the dump's query mode describe a published test bench with it directly,
 * because a test bench is rarely a catalogue build: most reviews test a reference card, and
 * their memory kit isn't in the catalogue.
 */
export interface PerfSystem {
  readonly cpuId: string;
  /** `null`: no graphics card, which the model has no anchors for (a `NoEstimate`). */
  readonly gpuChipId: string | null;
  /** The catalogue card, when the system has one; its factory clocks may differ from the chip's. */
  readonly gpuCardId: string | null;
  /** `null` when the memory is not stated. */
  readonly ram: RamConfig | null;
}

/**
 * Ask for an estimate as one publisher measured it: that publisher's test scene, settings and
 * bench (the Director's ruling of 2026-10-02).
 * - The golden test passes each anchor's own publisher and row, and must reproduce the row
 *   within ±5%. The model may calibrate per source; the explanation then names the calibration.
 * - Buyers' estimates pass no source context (`null`). Where reputable sources disagree by more
 *   than 10% on the same configuration (`conflictsWith`), that range contains every published
 *   value of the pair, at medium confidence or lower.
 */
export interface SourceContext {
  /** Publisher id of the review or database. */
  readonly publisher: string;
  /** The row whose conditions to reproduce, or `null` for the publisher's usual test scene. */
  readonly benchmarkId: string | null;
}

// ---------------------------------------------------------------------------------------------
// 1. Compatibility (BUILD_PROMPT §5.1, plan WP-E1 and §3)

/**
 * The 20 rule ids, in the order the lab lists them: test plan §9.2's 18 plus `cooler-socket`
 * and `display-output` (Hazem, plan §6). Final for test plan v4 (qa-lead, 2026-10-02). Ids are
 * stable: tests, QA's trace and share links name them, so an id is never renamed.
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
 * The four states the lab's status chip shows for a rule that ran (copy guide §6): Passes,
 * Warning, Can't verify and Incompatible. "Can't verify" is a `warn` result with
 * `cantVerify: true`, never a fifth status: missing data is never `ok` (test plan §9.1). A rule
 * that didn't run shows "Not checked" or "Doesn't apply" (`RuleNotRun`).
 */
export type StatusChip = RuleStatus | 'cant-verify';

/** A maker's procedure, condensed: today the BIOS FlashBack update (copy guide §8). */
export interface Steps {
  /** "Update the BIOS with BIOS FlashBack". */
  readonly title: string;
  /** One sentence per step, in order. */
  readonly items: readonly string[];
  /** The maker's page the steps come from. Never empty. */
  readonly sources: readonly SourceRef[];
}

interface RuleResultFields {
  readonly ruleId: RuleId;
  /** The parts this result is about, in build order. Storage may list several drives. */
  readonly parts: readonly PartRef[];
  /**
   * One sentence, numbers with units, parts by display name (copy guide §2 and §7), for example:
   * - Incompatible: "The AMD Ryzen 7 9800X3D needs an AM5 board, but the ASUS TUF GAMING
   *   Z890-PLUS WIFI has an LGA1851 socket."
   * - Passes: "The SAPPHIRE PULSE AMD Radeon RX 9070 XT 16GB is 320 mm long, and the Fractal
   *   Design North Charcoal Black TG Light takes cards up to 355 mm."
   * - Can't verify (the chip says so; the reason gives what is missing): "DeepCool doesn't
   *   publish how much room the DeepCool AN400 leaves for memory."
   * For a numeric limit, the reason says what happens exactly at the limit (test plan §9.1).
   */
  readonly reason: string;
  /**
   * What the buyer should do, one sentence starting with a verb, or `null` when there is
   * nothing to do beyond picking another part (copy guide §2, rule 9). The BIOS warning without
   * FlashBack: "Ask the retailer for a board already updated to BIOS 1205 or later."
   */
  readonly action: string | null;
  /** A maker's procedure with its own source (BIOS FlashBack), or `null` (design-lead's M1). */
  readonly steps: Steps | null;
  /** Every spec the rule read, including the unpublished ones. Never empty. */
  readonly evidence: readonly SpecEvidence[];
  /**
   * For a layout-dependent rule (`RuleSpec.layoutDependent`): the id of the layout it was
   * checked under, which is `CompatReport.layout.layout` when a layout fits and
   * `CompatReport.layout.closest` when none does. `null` for every other rule.
   */
  readonly layoutId: string | null;
}

/**
 * One rule's verdict on a build. A pure function of the build and the catalogue: the same
 * inputs always give the same result.
 *
 * Invariants (`ruleResultProblems` checks them, and every rule's tests and QA's sweep run it):
 * - `ok` rests only on published values and real "none" answers: no evidence item of an `ok`
 *   result is `not-published` (QA's C3). Any `ok` that reads an unpublished value is a false
 *   negative.
 * - `cantVerify: true` has at least one `not-published` evidence item.
 * - `evidence` is never empty, and every sentence ends with a full stop.
 */
export type RuleResult = RuleResultFields &
  (
    | { readonly status: 'ok' | 'block'; readonly cantVerify: false }
    | {
        readonly status: 'warn';
        /**
         * `true` when the rule could not decide because a spec it needs is not published:
         * the chip says "Can't verify", and `evidence` holds the null value with its note.
         * `false` for a real concern, such as memory above its official speed.
         */
        readonly cantVerify: boolean;
      }
  );

/**
 * A rule that did not run, and why. Together, `CompatReport.results` and `.notRun` name every
 * rule exactly once, so a rule is never silently skipped. Neither counts as a pass.
 */
export interface RuleNotRun {
  readonly ruleId: RuleId;
  /**
   * - `needs-parts` ("Not checked"): a part it checks isn't picked yet. The reason says what to
   *   pick: "Pick a case to check the card's length."
   * - `not-applicable` ("Doesn't apply"): the build has nothing for it to check, and the reason
   *   says why: "The DeepCool AN400 is an air cooler, so it has no radiator." A rule must never
   *   use this to hide a combination it can't judge: that is a `warn` with `cantVerify: true`.
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
  /**
   * A full sentence, shown after a "Layout checked" label and never spliced into another
   * sentence: "A 360 mm radiator at the front." (copy guide §7.7).
   */
  readonly description: string;
  /** The specs that define this layout, with their sources. */
  readonly evidence: readonly SpecEvidence[];
}

/**
 * The layout search: the engine looks for one layout that meets every case constraint at once
 * (a layout fits when no layout-dependent rule blocks under it), and says which it assumed, or
 * why none works. Layout-dependent rules are evaluated under one layout only, so their results
 * can never pass under different layouts while no single layout fits them all (QA's C4).
 */
export type LayoutSearch =
  | {
      readonly fits: true;
      /** The layout every layout-dependent rule was checked under: of those that fit, the one with the fewest warnings, then the case's own order. */
      readonly layout: CaseLayout;
      /** How many other layouts also fit. The lab can say "1 of 3 layouts that fit". */
      readonly alsoFits: number;
    }
  | {
      readonly fits: false;
      /** One sentence: "No spine position fits both the 160 mm cooler and the 2.7-slot card." */
      readonly reason: string;
      /**
       * The layout with the fewest blocking rules (then the case's own order). Every
       * layout-dependent rule is reported under it, so at least one of them is `block`, and
       * `CompatReport.worst` is `block` whenever no layout fits.
       */
      readonly closest: CaseLayout;
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
  /**
   * The power estimate `psu-wattage` checked the power supply against, so its range and every
   * line behind it trace to their sources (QA's C6). `null` until WP-E2, or without a CPU.
   */
  readonly power: PowerEstimate | null;
}

/** One category a rule reads. */
export interface RuleRead {
  readonly category: BuildCategory;
  /** "Not picked" can change the result (`display-output` without a graphics card), so the dump enumerates it too. */
  readonly optional: boolean;
}

/**
 * How the dump enumerates a rule's combinations. QA checks the dump's count per rule against it.
 * - `product`: every combination of the read categories, one part each, plus "not picked" for
 *   each optional one. Layout-dependent rules also enumerate the radiator position: unset, then
 *   each position the case takes for that radiator.
 * - `drive-lists`: every board with every multiset of 1 to `maxDrives` catalogue drives, for
 *   `m2-lanes`. `maxDrives` is one more than the most M.2 slots of any catalogue board, so every
 *   board also gets a build with more drives than slots; a test fails when the catalogue
 *   outgrows it.
 * - `power-extremes`: every CPU, graphics card (and none) and power supply, with every other
 *   category once at its lowest-power and once at its highest-power catalogue part. The
 *   result depends on those parts only through the summed load, which rises with each part's
 *   draw, so the two extremes bound every other combination (`psu-wattage`).
 */
export type RuleSweep =
  | { readonly kind: 'product' }
  | { readonly kind: 'drive-lists'; readonly maxDrives: number }
  | { readonly kind: 'power-extremes' };

/**
 * What QA's trace and the dump read about each rule (test plan §9.1 to §9.3). `outcomes`,
 * `numeric` and `unknownData` must equal QA's `tests/audit/compat-rules.json`, and `compat-trace`
 * fails when they drift.
 */
export interface RuleSpec {
  readonly id: RuleId;
  /** The lab row's name, from copy guide §6: "CPU socket", "Graphics card length". */
  readonly title: string;
  /** What it checks, one line (plan §3, "Checks"). */
  readonly checks: string;
  /**
   * The statuses it returns for published data (test plan §9.2, "Results"). The can't-verify
   * `warn` is not listed here: `unknownData` covers it.
   */
  readonly outcomes: readonly RuleStatus[];
  /**
   * A numeric limit. It needs boundary tests, named as compat-trace counts them: "boundary at"
   * the limit, "boundary inside" (1 unit on the passing side) and "boundary outside" (1 unit
   * on the failing side).
   */
  readonly numeric: boolean;
  /**
   * It reads a value that can be unpublished (test plan v4 §9.1: a null with a note, a nullable
   * list, or a fact the schema doesn't hold), so it needs "unknown:" tests that give a `warn`
   * with `cantVerify: true`.
   */
  readonly unknownData: boolean;
  /**
   * It is checked under one case layout (`CompatReport.layout`): `gpu-length`, `gpu-thickness`,
   * `cooler-height`, `radiator-fit` and `psu-length`.
   */
  readonly layoutDependent: boolean;
  /**
   * Every category that can change its result, the layout search included (QA's C5): a
   * layout-dependent rule reads every input of the layout search, because a part that moves the
   * radiator or a drive tray can change its result.
   */
  readonly reads: readonly RuleRead[];
  readonly sweep: RuleSweep;
}

// ---------------------------------------------------------------------------------------------
// 2. Power (BUILD_PROMPT §5.2, plan WP-E2)

/**
 * Where a power figure comes from:
 * - `spec`: a value on a part, such as a CPU's PPT or a card's TBP;
 * - `constant`: an entry in data-lead's power constants registry (WP-D1), such as memory per
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
  /**
   * The component in words, as the breakdown's first column shows it (copy guide §9): "CPU",
   * "Graphics card", "Memory (2 modules)", "Storage (1 M.2 drive)", "Fans (3)", "Pump". The
   * part's display name is shown beside it, never inside it.
   */
  readonly label: string;
  /** How many units the line counts: modules, drives, fans. */
  readonly count: number;
  /** The line's total for a gaming load, and for the worst case. */
  readonly gaming: PowerFigure;
  readonly worstCase: PowerFigure;
}

/** Extra capacity for short power spikes, by graphics card class (ATX 3.1 and makers' guidance). */
export interface TransientHeadroom {
  /** The class id in the power constants registry. */
  readonly gpuClass: string;
  /** "Graphics cards rated 300 W and up." */
  readonly label: string;
  readonly headroomW: number;
  readonly basis: PowerBasis;
}

/**
 * A recommended power supply size: always a range ("750–850 W"), never one number. `minW` is
 * below `maxW` (`psuRangeProblems` checks it).
 */
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
   * The card maker's recommended power supply, shown next to the range for comparison (plan
   * WP-E2: the range should include it, or the hand-off explains why not). `null` without a
   * card, or when the maker publishes none.
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

/**
 * An upscaler and its mode, as the game's menu names them.
 * - `mode` is "Quality", "Balanced", "Ultra Quality" and so on, or "Native" for the upscaler's
 *   anti-aliasing at native resolution (DLAA, FSR Native AA, XeSS Native AA).
 * - Every choice, "Native" included, is an upscaler query: its result is
 *   `FpsEstimate.withUpscaler`. `FpsEstimate.native` is always without any upscaler (QA's C2).
 *   So an anchor with `upscaling.method` "native" is checked against `native`, and every other
 *   anchor (Quality, Ultra Quality or Native mode) against `withUpscaler`.
 */
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
  /** `null`: no upscaler, the game's own anti-aliasing at native resolution. */
  readonly upscaling: UpscalingChoice | null;
  /** `null` for a buyer's estimate; a publisher (and row) for the golden test and QA's checks. */
  readonly source: SourceContext | null;
}

/** One side of the min(GPU, CPU) model: the frame rate this part allows. */
export interface FpsLimit {
  readonly fps: Estimate;
  readonly anchors: readonly AnchorUse[];
  /**
   * One sentence on how the number was reached, naming any per-source calibration in words:
   * "Adjusted for the difference between the test scenes of ComputerBase and TechPowerUp in
   * Cyberpunk 2077." (copy guide §10).
   */
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
  /**
   * Published tests disagree by more than 10% (`conflictsWith`), so the range covers both: one
   * sentence, "Published tests disagree: ComputerBase measured 146 fps and TechPowerUp 128 fps,
   * so the range covers both." `null` otherwise. With it, `avg.confidence` is never `high`.
   */
  readonly disagreement: string | null;
}

/**
 * The game estimate for one system and one query. Native, upscaler and frame-generation figures
 * are separate fields, so a frame-generation number can never enter a native one
 * (BUILD_PROMPT §5.3). Every anchor today has frame generation off, so `frameGeneration` is a
 * `NoEstimate` until a source for it exists; the field takes an `FpsResult` then without a
 * contract change.
 */
export interface FpsEstimate {
  readonly system: PerfSystem;
  readonly query: GameQuery;
  /** Without any upscaler. */
  readonly native: FpsResult | NoEstimate;
  /** The query's upscaler choice, in any mode, "Native" included. `null` when it names none. */
  readonly withUpscaler: FpsResult | NoEstimate | null;
  readonly frameGeneration: FpsResult | NoEstimate;
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

/** What to estimate: one named test of one creator workload. */
export interface CreatorQuery {
  readonly workload: CreatorWorkload;
  /** The named test, as `CreatorEstimate.test` names it, or `null` for the workload's usual test. */
  readonly test: string | null;
  /** As for games: `null` for a buyer, a publisher (and row) for the golden test. */
  readonly source: SourceContext | null;
}

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
  /**
   * The line under the "Doesn't fit in 8 GB" label (copy guide §10): "Llama 3.1 8B Instruct at
   * Q8_0 needs about 9.5 GB of video memory."
   */
  readonly reason: string;
  readonly neededGb: number;
  readonly availableGb: number;
  readonly anchors: readonly AnchorUse[];
}

/** One named test of one creator workload, for one system. */
export interface CreatorEstimate {
  readonly system: PerfSystem;
  readonly workload: CreatorWorkload;
  /**
   * The named test, as the result's sources name it, and unique within its workload:
   * "Blender 5.2.0, scene 'monster', OptiX", "Cinebench 2024 multi-core",
   * "Llama 3.1 8B Instruct, Q4_K_M".
   */
  readonly test: string;
  /** The part that runs it, as the creator anchors' `subject` names it. */
  readonly device:
    | { readonly type: 'cpu'; readonly cpuId: string }
    | { readonly type: 'gpu'; readonly chipId: string };
  readonly result: CreatorResult | DoesNotFit | NoEstimate;
}

// ---------------------------------------------------------------------------------------------
// 5. Bottleneck analysis (BUILD_PROMPT §5.4, plan WP-E5)

/** The workload a bottleneck report is about. Bottleneck queries never carry a source context. */
export type WorkloadRef =
  | { readonly kind: 'game'; readonly query: GameQuery }
  | { readonly kind: 'creator'; readonly query: CreatorQuery };

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
  /** "No faster graphics card has a price in Saudi Arabia." when `to` is `null`; otherwise the upgrade in words. */
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
  /** The rebalanced build's total, from `prices`. */
  readonly total: Money;
  /**
   * The difference from the original total, in percent: +3.1 means 3.1% dearer, −2.0 means 2%
   * cheaper. Always within ±5%, either way (plan §6: |totalDeltaPct| ≤ 5).
   */
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
   * One sentence on the limit (copy guide §11): "At 1440p High in Cyberpunk 2077, the graphics
   * card is the limit." Or, balanced: "…, neither part holds the build back: the CPU and
   * graphics card limits are within 4% of each other."
   */
  readonly verdict: string;
  /**
   * One sentence on the upgrades (design-lead's S1): "One tier up, the AMD Ryzen 7 9850X3D would
   * add about 2%, and the NVIDIA GeForce RTX 5080 Founders Edition about 28%." Each "about x%" is
   * the midpoint of that upgrade's `gainPct`, rounded to a whole number, and a test pins it.
   * `null` when no part is one tier up.
   */
  readonly whatWouldHelp: string | null;
  readonly upgrades: readonly TierUpgrade[];
  /** 1 to 3 builds; empty only with `noRebalanceReason`. */
  readonly rebalanced: readonly RebalancedBuild[];
  /** Why there are no rebalanced builds ("No price for the Fractal Design Terra Graphite in Saudi Arabia."), or `null`. */
  readonly noRebalanceReason: string | null;
  /** The original build's total in the market, or `null` when a part has no price there. */
  readonly total: Money | null;
}

// ---------------------------------------------------------------------------------------------
// The engine's entry points (implemented in WP-E1 to WP-E5)

/**
 * Every entry point takes the catalogue as an argument and does no I/O. The performance model
 * has one path for buyers, the golden test, the held-out run and the dump's query mode: a build
 * resolves to a `PerfSystem` (`systemOf`), and a published test bench is described as one.
 */
export interface EngineApi {
  readonly checkCompatibility: (build: BuildParts, catalogue: Catalogue) => CompatReport;
  readonly estimatePower: (build: BuildParts, catalogue: Catalogue) => PowerEstimate;
  /** The CPU, GPU chip, card and memory of a build, or which parts are still missing (the CPU). */
  readonly systemOf: (build: BuildParts, catalogue: Catalogue) => PerfSystem | NeedsParts;
  readonly estimateFps: (system: PerfSystem, query: GameQuery, catalogue: Catalogue) => FpsEstimate;
  readonly estimateCreator: (
    system: PerfSystem,
    query: CreatorQuery,
    catalogue: Catalogue,
  ) => CreatorEstimate;
  readonly analyseBottleneck: (
    build: BuildParts,
    workload: WorkloadRef,
    market: Market,
    catalogue: Catalogue,
  ) => BottleneckReport;
}
