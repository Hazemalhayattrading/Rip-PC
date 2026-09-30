import * as z from 'zod';
import { PosInt, PosNum, PublishedDate, specRecordBase } from './common';

export const CPU_SOCKETS = ['AM5', 'AM4', 'LGA1851', 'LGA1700'] as const;
export const CpuSocket = z.enum(CPU_SOCKETS);
export type CpuSocket = z.infer<typeof CpuSocket>;

export const MEMORY_TYPES = ['DDR5', 'DDR4'] as const;
export const MemoryType = z.enum(MEMORY_TYPES);
export type MemoryType = z.infer<typeof MemoryType>;

/**
 * CPU families as motherboard CPU support lists group them. Motherboards state a minimum BIOS
 * version per family, and per catalogue CPU.
 */
export const CPU_FAMILY_IDS = [
  'ryzen-3000',
  'ryzen-4000',
  'ryzen-5000',
  'ryzen-7000',
  'ryzen-8000',
  'ryzen-9000',
  'core-12th-gen',
  'core-13th-gen',
  'core-14th-gen',
  'core-ultra-200s',
] as const;
export const CpuFamily = z.enum(CPU_FAMILY_IDS);
export type CpuFamily = z.infer<typeof CpuFamily>;

export const CPU_FAMILIES: Readonly<Record<CpuFamily, { socket: CpuSocket; label: string }>> = {
  'ryzen-3000': { socket: 'AM4', label: 'AMD Ryzen 3000 Series' },
  'ryzen-4000': { socket: 'AM4', label: 'AMD Ryzen 4000 Series' },
  'ryzen-5000': { socket: 'AM4', label: 'AMD Ryzen 5000 Series' },
  'ryzen-7000': { socket: 'AM5', label: 'AMD Ryzen 7000 Series' },
  'ryzen-8000': { socket: 'AM5', label: 'AMD Ryzen 8000 Series' },
  'ryzen-9000': { socket: 'AM5', label: 'AMD Ryzen 9000 Series' },
  'core-12th-gen': { socket: 'LGA1700', label: '12th Gen Intel Core' },
  'core-13th-gen': { socket: 'LGA1700', label: '13th Gen Intel Core' },
  'core-14th-gen': { socket: 'LGA1700', label: '14th Gen Intel Core' },
  'core-ultra-200s': { socket: 'LGA1851', label: 'Intel Core Ultra 200S Series' },
};

/** Memory types each socket takes. Used by sanity rules for CPUs and boards. */
export const SOCKET_MEMORY: Readonly<Record<CpuSocket, readonly MemoryType[]>> = {
  AM5: ['DDR5'],
  AM4: ['DDR4'],
  LGA1851: ['DDR5'],
  LGA1700: ['DDR5', 'DDR4'],
};

/** Intel hybrid core layout. `null` on the CPU means a uniform (non-hybrid) design. */
export const CpuHybrid = z.strictObject({
  performanceCores: PosInt,
  efficiencyCores: PosInt,
  pCoreBaseClockMhz: PosInt,
  pCoreBoostClockMhz: PosInt,
  eCoreBaseClockMhz: PosInt,
  eCoreBoostClockMhz: PosInt,
});

/** Power exactly as each vendor publishes it: AMD TDP and PPT, Intel base and max turbo power. */
export const CpuPower = z.discriminatedUnion('scheme', [
  z.strictObject({
    scheme: z.literal('amd'),
    tdpW: PosInt,
    /** Package Power Tracking limit. `null` plus a note when AMD does not publish it for the SKU. */
    pptW: PosInt.nullable(),
  }),
  z.strictObject({
    scheme: z.literal('intel'),
    processorBasePowerW: PosInt,
    maxTurboPowerW: PosInt,
  }),
]);

export const CpuMemorySpeed = z.strictObject({
  type: MemoryType,
  speedMtps: PosInt,
  /**
   * The population the speed applies to, as the manufacturer writes it (e.g. "2x1R", "1DPC").
   * `null` means the manufacturer states one speed with no population condition.
   */
  config: z.string().min(1).nullable(),
});

export const Cpu = z.strictObject({
  ...specRecordBase,
  category: z.literal('cpu'),
  brand: z.enum(['AMD', 'Intel']),
  family: CpuFamily,
  /** Manufacturer codename, e.g. "Granite Ridge", "Arrow Lake". */
  codename: z.string().min(1).nullable(),
  socket: CpuSocket,
  cores: PosInt,
  threads: PosInt,
  /** `null` means every core is the same type. */
  hybrid: CpuHybrid.nullable(),
  /** AMD base clock; Intel P-core base frequency. */
  baseClockMhz: PosInt,
  /** AMD max boost clock; Intel max turbo frequency. */
  boostClockMhz: PosInt,
  l2CacheMb: PosNum,
  l3CacheMb: PosNum,
  has3dVCache: z.boolean(),
  power: CpuPower,
  memory: z.strictObject({
    types: z.array(MemoryType).min(1),
    speeds: z.array(CpuMemorySpeed).min(1),
    /** The manufacturer's memory-speed text, verbatim. */
    asPublished: z.string().min(1),
    maxCapacityGb: PosInt,
    channels: PosInt,
  }),
  /** `null` means no integrated graphics (e.g. Intel F SKUs). */
  igpu: z.strictObject({ model: z.string().min(1) }).nullable(),
  pcie: z.strictObject({
    maxGen: z.int().min(3).max(5),
    /** Lanes usable by devices (AMD "usable"; Intel "Max # of PCI Express Lanes"). */
    usableLanes: PosInt,
    /** The manufacturer's PCIe text, verbatim (e.g. "28 / 24", "Up to 1x16+4, 2x8+4"). */
    asPublished: z.string().min(1),
  }),
  launchDate: PublishedDate,
  unlocked: z.boolean(),
  /** Cooler in the retail box. `null` means no cooler is included. */
  boxCooler: z.string().min(1).nullable(),
});
export type Cpu = z.infer<typeof Cpu>;
