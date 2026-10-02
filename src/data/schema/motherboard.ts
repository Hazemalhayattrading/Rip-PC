import * as z from 'zod';
import { Count, Id, LocalId, PosInt, PosNum, specRecordBase } from './common';
import { CpuFamily, CpuSocket, MemoryType, type CpuSocket as CpuSocketT } from './cpu';

export const MOTHERBOARD_FORM_FACTORS = ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX'] as const;
export const MotherboardFormFactor = z.enum(MOTHERBOARD_FORM_FACTORS);
export type MotherboardFormFactor = z.infer<typeof MotherboardFormFactor>;

export const CHIPSETS_BY_SOCKET = {
  AM5: ['X870E', 'X870', 'B850', 'B840', 'X670E', 'X670', 'B650E', 'B650', 'A620'],
  AM4: ['X570', 'B550', 'A520', 'X470', 'B450'],
  LGA1851: ['Z890', 'B860', 'H810'],
  LGA1700: ['Z790', 'H770', 'B760', 'Z690', 'H670', 'B660', 'H610'],
} as const satisfies Record<CpuSocketT, readonly string[]>;

export const CHIPSETS = [
  ...CHIPSETS_BY_SOCKET.AM5,
  ...CHIPSETS_BY_SOCKET.AM4,
  ...CHIPSETS_BY_SOCKET.LGA1851,
  ...CHIPSETS_BY_SOCKET.LGA1700,
] as const;
export const Chipset = z.enum(CHIPSETS);
export type Chipset = z.infer<typeof Chipset>;

/** Whether a slot's lanes come from the CPU or the chipset. */
export const LaneSource = z.enum(['cpu', 'chipset']);

export const M2_SIZES = ['2230', '2242', '2260', '2280', '22110', '25110'] as const;
export const M2Size = z.enum(M2_SIZES);

export const M2Slot = z.strictObject({
  /** Local slot ID, unique in this board, e.g. `m2-1`. Lane-sharing rules point at it. */
  id: LocalId,
  /** The slot's name in the manual, e.g. "M.2_1", "M2_2". */
  label: z.string().min(1),
  pcieGen: z.int().min(3).max(5),
  lanes: z.int().min(1).max(4),
  source: LaneSource,
  sizes: z.array(M2Size).min(1),
  /** Accepts M.2 SATA drives. */
  sataSupport: z.boolean(),
});
export type M2Slot = z.infer<typeof M2Slot>;

export const PcieSlot = z.strictObject({
  id: LocalId,
  label: z.string().min(1),
  gen: z.int().min(1).max(5),
  electricalLanes: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8), z.literal(16)]),
  physicalSize: z.enum(['x1', 'x4', 'x8', 'x16']),
  source: LaneSource,
});
export type PcieSlot = z.infer<typeof PcieSlot>;

export const SataPort = z.strictObject({
  id: LocalId,
  label: z.string().min(1),
});

export const LaneSharingEffect = z.discriminatedUnion('type', [
  /** The listed slots or ports stop working. */
  z.strictObject({ type: z.literal('disables'), slots: z.array(LocalId).min(1) }),
  /** The slot keeps working with fewer lanes. */
  z.strictObject({ type: z.literal('reduces'), slot: LocalId, lanes: PosInt }),
]);

/**
 * A lane-sharing rule from the board manual: when `trigger.slot` is populated (with the device type,
 * if the manual distinguishes SATA from NVMe), the effects apply.
 */
export const LaneSharingRule = z.strictObject({
  id: LocalId,
  trigger: z.strictObject({
    slot: LocalId,
    deviceType: z.enum(['any', 'nvme', 'sata']),
  }),
  effects: z.array(LaneSharingEffect).min(1),
  /** Page number as printed in the manual, e.g. "1-6" or "12". */
  manualPage: z.string().min(1),
  /** The rule in the manual's own words (short quote). */
  text: z.string().min(1),
});
export type LaneSharingRule = z.infer<typeof LaneSharingRule>;

export const FanHeaderRole = z.enum(['cpu', 'cpu-opt', 'pump', 'cpu-or-pump', 'chassis', 'chassis-or-pump']);

/** Minimum BIOS for a CPU family on this board. */
export const BiosFamilyRow = z.strictObject({
  family: CpuFamily,
  /** Earliest BIOS version that supports the family. `null` means the board's first BIOS already did. */
  minBiosVersion: z.string().min(1).nullable(),
  /** The maker's own words behind the value: a CPU support list cell or a BIOS release note, verbatim. */
  statement: z.string().min(1),
});
export type BiosFamilyRow = z.infer<typeof BiosFamilyRow>;

/** How the maker's CPU support list lists one catalogue CPU. */
export const BiosCpuRow = z.strictObject({
  cpuId: Id,
  /** `all`: validated with every BIOS. `since`: from `minBiosVersion` on. `not-listed`: not on the list. */
  listing: z.enum(['all', 'since', 'not-listed']),
  /** Set exactly when `listing` is `since`. */
  minBiosVersion: z.string().min(1).nullable(),
  /** The support list's cell text for this CPU, verbatim (all rows, if the CPU is listed twice). */
  asListed: z.string().min(1),
});
export type BiosCpuRow = z.infer<typeof BiosCpuRow>;

export const Motherboard = z.strictObject({
  ...specRecordBase,
  category: z.literal('motherboard'),
  socket: CpuSocket,
  chipset: Chipset,
  formFactor: MotherboardFormFactor,
  biosSupport: z.strictObject({
    /** One row per CPU family the catalogue has on this socket (CPU support list or BIOS release notes). */
    families: z.array(BiosFamilyRow).min(1),
    /** One row per catalogue CPU on this socket, from the CPU support list. */
    cpus: z.array(BiosCpuRow),
  }),
  biosFlashback: z.strictObject({
    supported: z.boolean(),
    /** The maker's name for it, e.g. "BIOS FlashBack", "Flash BIOS Button". `null` when unsupported. */
    name: z.string().min(1).nullable(),
  }),
  memory: z.strictObject({
    type: MemoryType,
    slots: PosInt,
    maxCapacityGb: PosInt,
    /** Highest speed the spec page lists, including overclocked speeds. */
    maxSpeedMtps: PosInt,
    /** The spec page's memory-speed text, verbatim. */
    speedsAsPublished: z.string().min(1),
  }),
  m2Slots: z.array(M2Slot),
  pcieSlots: z.array(PcieSlot),
  sataPorts: z.array(SataPort),
  /** Rules from the manual. `[]` only when the manual states the board shares no lanes. */
  laneSharing: z.array(LaneSharingRule),
  /** Rear I/O lines as published, e.g. "1 x USB 20Gbps port (1 x USB Type-C)". */
  rearIo: z.array(z.string().min(1)).min(1),
  /** e.g. "Wi-Fi 7". `null` means no Wi-Fi. */
  wifi: z.string().min(1).nullable(),
  /** e.g. "5.4". `null` means no Bluetooth. */
  bluetooth: z.string().min(1).nullable(),
  /** e.g. "Realtek 2.5Gb Ethernet". `null` means no wired LAN. */
  lan: z.string().min(1).nullable(),
  headers: z.strictObject({
    /** Front-panel USB-C headers (Key-A / Type-E). `[]` means none. */
    usbCFront: z.array(z.strictObject({ label: z.string().min(1), speedGbps: PosNum, count: PosInt })),
    /** 19-pin USB 3.2 Gen 1 headers (two ports each). */
    usb3Gen1: Count,
    /** 9-pin USB 2.0 headers (two ports each). */
    usb2: Count,
    /** Addressable 5 V 3-pin RGB headers. */
    argb5v3pin: Count,
    /** 12 V 4-pin RGB headers. */
    rgb12v4pin: Count,
    fans: z
      .array(z.strictObject({ label: z.string().min(1), count: PosInt, role: FanHeaderRole }))
      .min(1),
  }),
});
export type Motherboard = z.infer<typeof Motherboard>;
