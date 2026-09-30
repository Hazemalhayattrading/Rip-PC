import * as z from 'zod';
import { PosInt, specRecordBase } from './common';

const storageBase = {
  ...specRecordBase,
  category: z.literal('storage'),
  /** Part number of this capacity (and heatsink variant). */
  partNumber: z.string().min(1),
  /** Capacity in decimal gigabytes, as marketed (1 TB = 1000). */
  capacityGb: PosInt,
  seqReadMBps: PosInt,
  seqWriteMBps: PosInt,
  /**
   * Cache design as the maker states it. `dram`: dedicated DRAM cache. `hmb`: DRAM-less, uses the
   * Host Memory Buffer. `dram-less`: DRAM-less, and the maker does not say whether it uses HMB.
   * `null` plus a note when the maker publishes nothing about it.
   */
  cache: z.enum(['dram', 'hmb', 'dram-less']).nullable(),
  nandType: z.enum(['SLC', 'MLC', 'TLC', 'QLC']).nullable(),
  /** Rated endurance in terabytes written. */
  enduranceTbw: PosInt.nullable(),
  /** This SKU ships with a heatsink. */
  heatsink: z.boolean(),
  warrantyYears: PosInt.nullable(),
};

export const Storage = z.discriminatedUnion('interface', [
  z.strictObject({
    ...storageBase,
    interface: z.literal('NVMe'),
    formFactor: z.enum(['M.2 2230', 'M.2 2242', 'M.2 2280']),
    pcieGen: z.int().min(3).max(5),
    pcieLanes: z.union([z.literal(2), z.literal(4)]),
  }),
  z.strictObject({
    ...storageBase,
    interface: z.literal('SATA'),
    formFactor: z.enum(['2.5-inch', 'M.2 2280']),
  }),
]);
export type Storage = z.infer<typeof Storage>;
