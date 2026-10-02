import { describe, expect, it } from 'vitest';
import { estimate } from './estimate';

describe('estimate', () => {
  it('returns the range and confidence it was given', () => {
    expect(estimate(142, 158, 'medium')).toEqual({ low: 142, high: 158, confidence: 'medium' });
  });

  it('accepts a zero-width range', () => {
    expect(estimate(60, 60, 'high')).toEqual({ low: 60, high: 60, confidence: 'high' });
  });

  it.each([
    [Number.NaN, 10],
    [10, Number.NaN],
    [Number.NEGATIVE_INFINITY, 10],
    [10, Number.POSITIVE_INFINITY],
  ])('rejects the non-finite bounds %s and %s', (low, high) => {
    expect(() => estimate(low, high, 'low')).toThrow(
      new RangeError('Estimate bounds must be finite numbers.'),
    );
  });

  it('rejects a low bound above the high bound', () => {
    expect(() => estimate(158, 142, 'low')).toThrow(
      new RangeError('Estimate low bound (158) must not be above the high bound (142).'),
    );
  });
});
