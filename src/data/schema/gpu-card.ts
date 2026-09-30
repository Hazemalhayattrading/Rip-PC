import * as z from 'zod';
import { Id, PosInt, PosNum, specRecordBase } from './common';

export const GpuPowerConnector = z.strictObject({
  /** `16-pin` is the 12V-2x6 / 12VHPWR plug; `standard` says which one the maker names. */
  type: z.enum(['16-pin', '8-pin', '6-pin']),
  /** For `16-pin`: "12V-2x6" or "12VHPWR" as published. `null` when the maker only says "16-pin". */
  standard: z.enum(['12V-2x6', '12VHPWR']).nullable(),
  count: PosInt,
});
export type GpuPowerConnector = z.infer<typeof GpuPowerConnector>;

/**
 * A retail graphics card (architecture call 4.2): everything physical. Clearance and power checks
 * use cards; performance comes from the chip it references.
 */
export const GpuCard = z.strictObject({
  ...specRecordBase,
  category: z.literal('gpu-card'),
  /** The GPU chip this card is built on (`data/parts/gpu-chip.json`). */
  chipId: Id,
  partNumber: z.string().min(1),
  lengthMm: PosNum,
  /** Card height (bracket to top edge), as the maker lists it. */
  heightMm: PosNum,
  thicknessMm: PosNum.nullable(),
  /** Expansion slots the card occupies, as published (2, 2.5, 3.125...). */
  slots: PosNum,
  /** `[]` means the card is powered by the slot alone. */
  powerConnectors: z.array(GpuPowerConnector),
  /** Card power as the maker lists it. `null` plus a note when not published. */
  cardPowerW: PosInt.nullable(),
  recommendedPsuW: PosInt.nullable(),
  /** Display outputs as published, e.g. { type: "DisplayPort 2.1b", count: 3 }. */
  outputs: z.array(z.strictObject({ type: z.string().min(1), count: PosInt })).min(1),
  /** Factory boost clock in the card's default mode. */
  boostClockMhz: PosInt.nullable(),
  /** Boost clock in the maker's optional OC mode. `null` means the card has no separate OC mode. */
  ocModeBoostClockMhz: PosInt.nullable(),
});
export type GpuCard = z.infer<typeof GpuCard>;
