/** Types for audit-sample.mjs. */
export const RULE: string;
export function mulberry32(seed: number): () => number;
export function drawSample(
  batches: Readonly<Record<string, readonly string[]>>,
  seed: number,
): Record<string, { population: number; size: number; ids: string[] }>;
