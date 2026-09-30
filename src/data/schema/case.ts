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
});
export type LayoutPosition = z.infer<typeof LayoutPosition>;

export const Case = z.strictObject({
  ...specRecordBase,
  category: z.literal('case'),
  partNumber: z.string().min(1).nullable(),
  size: z.enum(['full-tower', 'mid-tower', 'mini-tower', 'small-form-factor']),
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
    maxLengthMm: PosNum.nullable(),
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
