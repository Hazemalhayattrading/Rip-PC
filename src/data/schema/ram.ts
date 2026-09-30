import * as z from 'zod';
import { PosInt, PosNum, specRecordBase } from './common';
import { MemoryType } from './cpu';

export const RamFormFactor = z.enum(['UDIMM', 'CUDIMM', 'SO-DIMM']);
export type RamFormFactor = z.infer<typeof RamFormFactor>;

export const Ram = z.strictObject({
  ...specRecordBase,
  category: z.literal('ram'),
  /** The kit's part number as the manufacturer lists it. */
  partNumber: z.string().min(1),
  series: z.string().min(1),
  type: MemoryType,
  formFactor: RamFormFactor,
  moduleCapacityGb: PosInt,
  moduleCount: PosInt,
  speedMtps: PosInt,
  /** Primary timings as published (CL-tRCD-tRP-tRAS). */
  timings: z.strictObject({ cl: PosInt, trcd: PosInt, trp: PosInt, tras: PosInt }),
  voltageV: PosNum,
  profiles: z.strictObject({
    /** Intel XMP version. `null` means the kit has no XMP profile. */
    xmp: z.enum(['2.0', '3.0']).nullable(),
    /** AMD EXPO profile present. */
    expo: z.boolean(),
  }),
  /** Module height including heat spreader. Needed for air-cooler clearance. */
  heightMm: PosNum.nullable(),
  rgb: z.boolean(),
});
export type Ram = z.infer<typeof Ram>;
