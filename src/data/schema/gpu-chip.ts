import * as z from 'zod';
import { PosInt, PosNum, PublishedDate, specRecordBase } from './common';

export const GpuVendor = z.enum(['NVIDIA', 'AMD', 'Intel']);
export type GpuVendor = z.infer<typeof GpuVendor>;

export const VramType = z.enum(['GDDR7', 'GDDR6X', 'GDDR6']);

/**
 * A GPU chip: the performance identity shared by every card built on it (architecture call 4.2).
 * Benchmarks reference chips. VRAM size is part of the identity, so an 8 GB and a 16 GB variant are
 * two chips.
 */
export const GpuChip = z.strictObject({
  ...specRecordBase,
  category: z.literal('gpu-chip'),
  brand: GpuVendor,
  architecture: z.string().min(1),
  /** Shader count with the vendor's own unit name ("CUDA Cores", "Stream Processors", "Xe-cores"). */
  shaders: z.strictObject({ count: PosInt, unit: z.string().min(1) }),
  /** Reference clocks. Vendors publish different sets, so each is nullable with a note. */
  clocks: z.strictObject({
    baseMhz: PosInt.nullable(),
    /** AMD "Game Frequency". */
    gameMhz: PosInt.nullable(),
    boostMhz: PosInt.nullable(),
  }),
  vram: z.strictObject({
    sizeGb: PosInt,
    type: VramType,
    busWidthBits: PosInt,
    /** Per-pin data rate, e.g. 28 Gbps. */
    speedGbps: PosNum.nullable(),
    bandwidthGBps: PosNum.nullable(),
  }),
  /** Reference total board / graphics power. */
  referenceTbpW: PosInt,
  /** Vendor's recommended (or required) system power for the reference design. */
  referencePsuW: PosInt.nullable(),
  pcie: z.strictObject({
    gen: z.int().min(3).max(5),
    /** Electrical lanes the chip uses. x8 chips lose bandwidth on PCIe 3.0/4.0 boards. */
    lanes: z.union([z.literal(4), z.literal(8), z.literal(16)]),
  }),
  /** Upscalers as the vendor names them, e.g. "DLSS 4", "AMD FSR 4". */
  upscaling: z.array(z.string().min(1)),
  /** Frame generation technologies as the vendor names them. Never mixed into native numbers. */
  frameGeneration: z.array(z.string().min(1)),
  launchDate: PublishedDate,
});
export type GpuChip = z.infer<typeof GpuChip>;
