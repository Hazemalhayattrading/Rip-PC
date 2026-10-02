import * as z from 'zod';
import { Id, IsoDate, Notes, PosNum, Sources } from './common';

export const Resolution = z.enum(['1920x1080', '2560x1440', '3440x1440', '3840x2160']);
export type Resolution = z.infer<typeof Resolution>;

export const Upscaling = z.strictObject({
  /** `native` means no upscaler. */
  method: z.enum(['native', 'DLSS', 'FSR', 'XeSS', 'TSR']),
  /** e.g. "Quality", "Balanced", "DLAA". `null` when native. */
  mode: z.string().min(1).nullable(),
  /** e.g. "DLSS 4", "FSR 3.1". `null` when native or not stated (add a note). */
  version: z.string().min(1).nullable(),
});
export type Upscaling = z.infer<typeof Upscaling>;

/** The test bench, as the review states it. */
export const TestSystem = z.strictObject({
  cpu: z.strictObject({
    name: z.string().min(1),
    /** Catalogue CPU ID. `null` means the CPU is not in the catalogue. */
    catalogueId: Id.nullable(),
  }),
  gpu: z.strictObject({
    chipName: z.string().min(1),
    /** Catalogue chip ID. `null` means the chip is not in the catalogue. */
    chipId: Id.nullable(),
    /** The exact card tested, e.g. "NVIDIA GeForce RTX 5090 Founders Edition". */
    card: z.string().min(1),
    /** Catalogue card ID. `null` means the card is not in the catalogue. */
    cardId: Id.nullable(),
  }),
  /** Memory as stated, e.g. "32GB (2x16GB) DDR5-6000 CL30". */
  ram: z.string().min(1),
  motherboard: z.string().min(1).nullable(),
  os: z.string().min(1).nullable(),
  gpuDriver: z.string().min(1).nullable(),
});
export type TestSystem = z.infer<typeof TestSystem>;

/**
 * One measured game result from a published review: an anchor for the performance model.
 * Frame generation is always off here (architecture call 4.7); frame-gen results never enter this file.
 * `publishedAt` is the review's original publish date as the publisher shows it. A row read from an
 * archive keeps the review's own `url` and adds `archiveUrl` (Owner's rule 1, amended).
 */
export const GameBenchmark = z.strictObject({
  id: Id,
  gameId: Id,
  /** The component the publisher's test isolates: GPU-bound or CPU-bound conditions. */
  limiter: z.enum(['gpu', 'cpu']),
  testSystem: TestSystem,
  /** Game version or patch as the review states it. */
  gameVersion: z.string().min(1).nullable(),
  /** Test scene or pass, e.g. "built-in benchmark". */
  scene: z.string().min(1).nullable(),
  resolution: Resolution,
  /** Quality preset as published, e.g. "Ultra", "Very High". */
  preset: z.string().min(1),
  rayTracing: z.enum(['off', 'on', 'path-tracing']),
  upscaling: Upscaling,
  frameGeneration: z.literal('off'),
  avgFps: PosNum,
  onePercentLowFps: PosNum.nullable(),
  publishedAt: IsoDate,
  /** Rows from other publishers that differ from this one by more than 10% (kept, flagged). */
  conflictsWith: z.array(Id).min(1).optional(),
  sources: Sources,
  notes: Notes,
});
export type GameBenchmark = z.infer<typeof GameBenchmark>;

export const GameBenchmarkFile = z.strictObject({
  schemaVersion: z.literal(1),
  items: z.array(GameBenchmark),
});
