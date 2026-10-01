import * as z from 'zod';
import { Count, PosInt, PosNum, specRecordBase } from './common';
import { MotherboardFormFactor } from './motherboard';
import { PsuFormFactor } from './psu';

export const MountPosition = z.enum(['front', 'top', 'rear', 'bottom', 'side', 'psu-shroud']);
export type MountPosition = z.infer<typeof MountPosition>;

export const RadiatorSize = z.union([
  z.literal(120),
  z.literal(140),
  z.literal(240),
  z.literal(280),
  z.literal(360),
  z.literal(420),
]);

/**
 * A clearance limit and the condition it applies under, as the maker words it
 * (e.g. "with front radiator"). `condition: null` is the default, unconditional limit.
 */
export const GpuClearance = z.strictObject({ maxLengthMm: PosNum, condition: z.string().min(1).nullable() });
export const CoolerClearance = z.strictObject({ maxHeightMm: PosNum, condition: z.string().min(1).nullable() });
/** A PSU length limit and the configuration it applies under (e.g. "with 2 HDD trays"). */
export const PsuClearance = z.strictObject({ maxLengthMm: PosNum, condition: z.string().min(1).nullable() });

/**
 * One published position of a movable motherboard plate ("spine"). Each position trades CPU cooler
 * height for GPU thickness; a build fits when any single position fits both the cooler and the GPU.
 */
export const LayoutPosition = z.strictObject({
  position: z.string().min(1),
  coolerMaxHeightMm: PosNum,
  gpuMaxThicknessMm: PosNum,
  /** A tighter thickness limit for GPUs taller than `aboveGpuHeightMm`, when the maker publishes one. */
  tallGpuLimit: z.strictObject({ aboveGpuHeightMm: PosNum, maxThicknessMm: PosNum }).nullable(),
  /**
   * The thickest radiator plus its fan that fits at this position, as the maker gives it (the
   * Fractal Terra: 49 to 79 mm). `null` plus a note when the maker gives none.
   */
  radiatorFanMaxThicknessMm: PosNum.nullable(),
});
export type LayoutPosition = z.infer<typeof LayoutPosition>;

export const CaseSize = z.enum(['full-tower', 'mid-tower', 'mini-tower', 'small-form-factor']);
export type CaseSize = z.infer<typeof CaseSize>;

/**
 * The size class rule (README, "Case size"): by the largest supported board. ATX or E-ATX is a
 * mid-tower, or a full tower when the maker's own class says so; Micro-ATX is a mini-tower; Mini-ITX
 * only is small form factor.
 */
export function deriveCaseSize(boards: readonly MotherboardFormFactor[], makerSizeClass: string | null): CaseSize {
  if (boards.includes('E-ATX') || boards.includes('ATX')) {
    return makerSizeClass !== null && /full[\s-]?tower/i.test(makerSizeClass) ? 'full-tower' : 'mid-tower';
  }
  return boards.includes('Micro-ATX') ? 'mini-tower' : 'small-form-factor';
}

export const Case = z.strictObject({
  ...specRecordBase,
  category: z.literal('case'),
  partNumber: z.string().min(1).nullable(),
  /** Derived by `deriveCaseSize`, not sourced. The validator checks it; the maker's wording is below. */
  size: CaseSize,
  /**
   * The maker's own size class, word for word (Fractal "Regular" or "Small", DeepCool "mid-tower").
   * Makers' classes don't map one to one onto `size`. `null` plus a note when the maker gives none.
   */
  makerSizeClass: z.string().min(1).nullable(),
  supportedBoards: z.array(MotherboardFormFactor).min(1),
  /** GPU length limits. One row per published condition (e.g. "with front radiator"). */
  gpuClearance: z.array(GpuClearance).min(1),
  gpuMaxThicknessMm: PosNum.nullable(),
  /**
   * Tallest GPU (bracket to top edge; some makers call it "width") that fits. `null` means the maker
   * publishes no height limit, as is usual for towers.
   */
  gpuMaxHeightMm: PosNum.nullable(),
  /** CPU cooler height limits, one row per published condition. */
  coolerClearance: z.array(CoolerClearance).min(1),
  /**
   * Only for cases with a movable motherboard plate. When present, it supersedes the single
   * cooler-height and GPU-thickness limits above for fit checks.
   */
  layoutPositions: z.array(LayoutPosition).min(1).optional(),
  radiatorSupport: z.array(
    z.strictObject({
      position: MountPosition,
      sizesMm: z.array(RadiatorSize).min(1),
      maxThicknessMm: PosNum.nullable(),
    }),
  ),
  fanMounts: z.array(z.strictObject({ position: MountPosition, sizeMm: PosInt, count: PosInt })).min(1),
  includedFans: z.array(
    z.strictObject({
      position: MountPosition,
      sizeMm: PosInt,
      count: PosInt,
      /** Fan model name. `null` means the maker does not name it. */
      model: z.string().min(1).nullable(),
    }),
  ),
  psu: z.strictObject({
    formFactors: z.array(PsuFormFactor).min(1),
    /**
     * PSU length limits, one row per published configuration. At most one row is unconditional: a
     * maker that only gives per-configuration limits (e.g. per HDD tray fitted) gets no unconditional
     * row. `null` plus a note when the maker publishes no limit.
     */
    clearance: z.array(PsuClearance).min(1).nullable(),
  }),
  driveBays: z.strictObject({
    /** Bays or mounts that take a 3.5-inch drive (many also take 2.5-inch). */
    bays35: Count,
    /** Mounts that take only 2.5-inch drives. */
    bays25: Count,
  }),
  expansionSlots: PosInt,
  frontIo: z.strictObject({
    /**
     * Front USB-C ports, labelled as the maker words them. Each needs a front USB-C header on the
     * motherboard. `speedGbps: null` plus a note when the maker gives no speed. `[]` means none.
     */
    usbC: z.array(z.strictObject({ label: z.string().min(1), speedGbps: PosNum.nullable(), count: PosInt })),
    usbA: z.array(z.strictObject({ speedGbps: PosNum, count: PosInt })),
    audioJack: z.boolean(),
  }),
  /** `null` plus a note when the maker says nothing about vertical GPU mounting. */
  verticalGpuMount: z.enum(['included', 'optional', 'none']).nullable(),
  /** The main (window) side panel as the maker lists it, e.g. "Tempered glass", "Ventilated mesh". */
  sidePanel: z.string().min(1),
  colors: z.array(z.string().min(1)).min(1),
  dimensionsMm: z.strictObject({ height: PosNum, width: PosNum, depth: PosNum }).nullable(),
});
export type Case = z.infer<typeof Case>;
