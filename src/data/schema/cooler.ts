import * as z from 'zod';
import { PosInt, PosNum, specRecordBase } from './common';
import { CpuSocket } from './cpu';

const coolerBase = {
  ...specRecordBase,
  category: z.literal('cooler'),
  partNumber: z.string().min(1),
  sockets: z.array(CpuSocket).min(1),
  fanSizeMm: PosInt,
  fanCount: PosInt,
  /**
   * The maker's TDP rating in watts. `null` plus a note when none is published. Never derived:
   * Noctua publishes NSPR instead, which goes in `nsprRating`.
   */
  tdpW: PosInt.nullable(),
  /** Noctua Standardised Performance Rating. `null` for every other maker. */
  nsprRating: PosInt.nullable(),
  rgb: z.boolean(),
};

export const Cooler = z.discriminatedUnion('type', [
  z.strictObject({
    ...coolerBase,
    type: z.literal('air'),
    /** Total height from the CPU surface, including the fan. */
    heightMm: PosNum,
    /** Tallest RAM that fits under the fan (or the clearance under it), as published. */
    ramClearanceMm: PosNum.nullable(),
  }),
  z.strictObject({
    ...coolerBase,
    type: z.literal('aio'),
    radiatorSizeMm: z.union([z.literal(120), z.literal(140), z.literal(240), z.literal(280), z.literal(360), z.literal(420)]),
    radiatorLengthMm: PosNum.nullable(),
    radiatorWidthMm: PosNum.nullable(),
    radiatorThicknessMm: PosNum,
    tubeLengthMm: PosNum.nullable(),
  }),
]);
export type Cooler = z.infer<typeof Cooler>;
