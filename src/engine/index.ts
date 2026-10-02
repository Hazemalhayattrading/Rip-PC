/**
 * Rig Lab engine: compatibility, power, performance and bottleneck analysis (BUILD_PROMPT §5).
 *
 * Phase 0 placeholder. Phase 1 fills this in. Rules for everything under `src/engine/`:
 * - pure functions only: no DOM, no React, no I/O;
 * - 100% line, branch, function and statement coverage (enforced in `vitest.config.ts`);
 * - estimates are ranges with a confidence level, never single numbers (CLAUDE.md rule 2).
 */

export type Confidence = 'low' | 'medium' | 'high';

/** An estimated quantity, such as an FPS figure or a render time, with its uncertainty. */
export interface Estimate {
  readonly low: number;
  readonly high: number;
  readonly confidence: Confidence;
}

/**
 * Builds an estimate range.
 * @throws {RangeError} when a bound is not a finite number, or `low` is above `high`.
 */
export function estimate(low: number, high: number, confidence: Confidence): Estimate {
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    throw new RangeError('Estimate bounds must be finite numbers.');
  }
  if (low > high) {
    throw new RangeError(
      `Estimate low bound (${String(low)}) must not be above the high bound (${String(high)}).`,
    );
  }
  return { low, high, confidence };
}
