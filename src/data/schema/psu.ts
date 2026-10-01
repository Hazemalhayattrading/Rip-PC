import * as z from 'zod';
import { Count, PosInt, PosNum, specRecordBase } from './common';

export const PSU_FORM_FACTORS = ['ATX', 'SFX', 'SFX-L', 'TFX'] as const;
export const PsuFormFactor = z.enum(PSU_FORM_FACTORS);
export type PsuFormFactor = z.infer<typeof PsuFormFactor>;

export const Psu = z.strictObject({
  ...specRecordBase,
  category: z.literal('psu'),
  partNumber: z.string().min(1),
  wattageW: PosInt,
  efficiency80Plus: z.enum(['White', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Titanium']).nullable(),
  /** Cybenetics ratings, if the maker publishes them. `null` plus a note otherwise. */
  cybenetics: z
    .strictObject({
      efficiency: z.enum(['Bronze', 'Silver', 'Gold', 'Platinum', 'Titanium', 'Diamond']).nullable(),
      noise: z.enum(['A++', 'A+', 'A', 'A-', 'Standard++', 'Standard+', 'Standard']).nullable(),
    })
    .nullable(),
  /** ATX (ATX12V) design guide version as published, e.g. "3.1". */
  atxVersion: z.string().regex(/^[23]\.\d{1,2}$/).nullable(),
  formFactor: PsuFormFactor,
  lengthMm: PosNum,
  modularity: z.enum(['full', 'semi', 'none']),
  fanSizeMm: PosInt.nullable(),
  connectors: z.strictObject({
    /** Native 16-pin 12V-2x6 / 12VHPWR cables. */
    pcie16pin: Count,
    /** Which 16-pin standard the maker names. `null` when there is no 16-pin cable. */
    pcie16pinStandard: z.enum(['12V-2x6', '12VHPWR']).nullable(),
    /** PCIe 8-pin (6+2) connectors. */
    pcie8pin: Count,
    /** CPU EPS 8-pin (4+4) connectors. */
    eps8pin: Count,
    sata: Count,
    molex: Count,
  }),
});
export type Psu = z.infer<typeof Psu>;
