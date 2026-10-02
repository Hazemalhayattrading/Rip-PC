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
 * The power adapter in the box of a card with a 16-pin plug, for a PSU without a native 16-pin
 * cable (NVIDIA: "3x PCIe 8-pin cables (adapter)").
 */
export const GpuPowerAdapter = z.strictObject({
  /** PCIe 8-pin plugs the adapter takes. */
  pcie8pinInputs: PosInt,
  /**
   * The maker wants each plug on its own PSU cable (NVIDIA: "independent dedicated cables"), not a
   * daisy chain. `null` plus a note when the maker doesn't say.
   */
  separateCables: z.boolean().nullable(),
});
export type GpuPowerAdapter = z.infer<typeof GpuPowerAdapter>;

/**
 * A retail graphics card (architecture call 4.2): everything physical. Clearance and power checks
 * use cards; performance comes from the chip it references.
 */
export const GpuCard = z.strictObject({
  ...specRecordBase,
  category: z.literal('gpu-card'),
  /** The GPU chip this card is built on (`data/parts/gpu-chip.json`). */
  chipId: Id,
  /** The maker's SKU. `null` plus a note when none is published (e.g. NVIDIA Founders Editions). */
  partNumber: z.string().min(1).nullable(),
  lengthMm: PosNum,
  /** Card height (bracket to top edge), as the maker lists it. */
  heightMm: PosNum,
  thicknessMm: PosNum.nullable(),
  /** Expansion slots the card occupies, as published (2, 2.5, 3.125...). */
  slots: PosNum,
  /** `[]` means the card is powered by the slot alone. */
  powerConnectors: z.array(GpuPowerConnector),
  /**
   * The adapter in the box, on a card with a 16-pin plug. `null` on a card without one; on a 16-pin
   * card, `null` plus a note when the maker lists no adapter.
   */
  powerAdapter: GpuPowerAdapter.nullable(),
  /** Card power as the maker lists it. `null` plus a note when not published. */
  cardPowerW: PosInt.nullable(),
  /** The maker's power supply figure for the card; `recommendedPsuKind` says which kind it is. */
  recommendedPsuW: PosInt.nullable(),
  /**
   * What the maker calls that figure: `recommended` ("Recommended PSU", ASUS), `required` ("Required
   * System Power", NVIDIA) or `minimum` ("Minimum 750 Watt Power Supply", Sapphire; "Minimum Power
   * Supply Unit", Intel). `null` exactly when there is no figure.
   */
  recommendedPsuKind: z.enum(['recommended', 'required', 'minimum']).nullable(),
  /** Display outputs as published, e.g. { type: "DisplayPort 2.1b", count: 3 }. */
  outputs: z.array(z.strictObject({ type: z.string().min(1), count: PosInt })).min(1),
  /** Factory boost clock in the card's default mode. */
  boostClockMhz: PosInt.nullable(),
  /** Boost clock in the maker's optional OC mode. `null` means the card has no separate OC mode. */
  ocModeBoostClockMhz: PosInt.nullable(),
});
export type GpuCard = z.infer<typeof GpuCard>;
