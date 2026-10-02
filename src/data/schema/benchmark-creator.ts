import * as z from 'zod';
import { Id, IsoDate, Notes, PosInt, PosNum, Sources } from './common';

export const CreatorApp = z.enum(['blender', 'cinebench-2024']);
export type CreatorApp = z.infer<typeof CreatorApp>;

/**
 * One measured creator-workload result: Blender (Open Data) or Cinebench 2024 (a.k.a. R24).
 * `publishedAt` is the review's publish date; for a live benchmark database it is the date the
 * aggregate was read, because the database has no publication date.
 */
export const CreatorBenchmark = z.strictObject({
  id: Id,
  app: CreatorApp,
  /** e.g. "4.5.0" for Blender, "2024.1.0" for Cinebench. */
  appVersion: z.string().min(1),
  /** Blender scene ("monster", "junkshop", "classroom") or Cinebench test ("multi-core", "single-core"). */
  test: z.string().min(1),
  device: z.enum(['cpu', 'gpu']),
  /** Blender compute backend ("OptiX", "HIP", "oneAPI", "CPU"). `null` for Cinebench. */
  backend: z.string().min(1).nullable(),
  subject: z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('cpu'), cpuId: Id }),
    z.strictObject({ type: z.literal('gpu'), chipId: Id }),
  ]),
  score: PosNum,
  unit: z.enum(['samples-per-minute', 'points']),
  /** Set for database aggregates (Blender Open Data median). `null` for a single review result. */
  aggregate: z.strictObject({ statistic: z.literal('median'), sampleSize: PosInt }).nullable(),
  /** The review's test bench. `null` for a database aggregate across many submitted systems. */
  testSystem: z
    .strictObject({
      cpu: z.string().min(1),
      gpu: z.string().min(1).nullable(),
      ram: z.string().min(1).nullable(),
      os: z.string().min(1).nullable(),
    })
    .nullable(),
  publishedAt: IsoDate,
  sources: Sources,
  notes: Notes,
});
export type CreatorBenchmark = z.infer<typeof CreatorBenchmark>;

export const CreatorBenchmarkFile = z.strictObject({
  schemaVersion: z.literal(1),
  items: z.array(CreatorBenchmark),
});
