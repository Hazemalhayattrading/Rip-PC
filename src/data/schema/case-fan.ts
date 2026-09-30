import * as z from 'zod';
import { PosInt, PosNum, specRecordBase } from './common';

export const CaseFan = z.strictObject({
  ...specRecordBase,
  category: z.literal('case-fan'),
  partNumber: z.string().min(1),
  sizeMm: PosInt,
  thicknessMm: PosNum,
  maxRpm: PosInt,
  minRpm: PosInt.nullable(),
  airflowCfm: PosNum,
  staticPressureMmH2O: PosNum,
  /**
   * Maximum noise in the unit the maker publishes. Sone and dB(A) do not convert exactly, so the
   * value is never converted.
   */
  noise: z.strictObject({ value: PosNum, unit: z.enum(['dBA', 'sone']) }),
  connector: z.enum(['4-pin PWM', '3-pin DC']),
  lighting: z.enum(['none', 'argb-5v-3pin', 'rgb-12v-4pin']),
  /** Fans in one retail box. */
  packSize: PosInt,
  bearing: z.string().min(1).nullable(),
});
export type CaseFan = z.infer<typeof CaseFan>;
