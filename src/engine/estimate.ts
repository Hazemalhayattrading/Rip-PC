import type { Confidence, Estimate } from './types';

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
