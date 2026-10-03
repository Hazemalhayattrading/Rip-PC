import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, formatNumber, valueText } from './format';

const NBSP = '\u00A0';

describe('formatNumber', () => {
  it.each([
    [5200, '5,200'],
    [2.5, '2.5'],
    [3.125, '3.125'],
    [805311.49, '805,311.49'],
    [0, '0'],
  ])('writes %d with English grouping and every published decimal: %s', (value, text) => {
    expect(formatNumber(value)).toBe(text);
  });
});

describe('formatMoney', () => {
  it('puts the currency code first, then a no-break space (copy guide §3)', () => {
    expect(formatMoney(1899, 'SAR')).toBe(`SAR${NBSP}1,899`);
    expect(formatMoney(2349.99, 'USD')).toBe(`USD${NBSP}2,349.99`);
  });

  it('shows no cents for a whole amount and two otherwise, and never rounds a published one', () => {
    expect(formatMoney(9412, 'SAR')).toBe(`SAR${NBSP}9,412`);
    expect(formatMoney(82.5, 'SAR')).toBe(`SAR${NBSP}82.50`);
    expect(formatMoney(19.995, 'USD')).toBe(`USD${NBSP}19.995`);
  });
});

describe('formatDate', () => {
  it('writes a day as "30 Sep 2026", in UTC, with its machine-readable form', () => {
    expect(formatDate('2026-09-30')).toEqual({ text: '30 Sep 2026', dateTime: '2026-09-30' });
    // Midnight UTC: a local time zone west of UTC must not move it to 31 Dec.
    expect(formatDate('2027-01-01')).toEqual({ text: '1 Jan 2027', dateTime: '2027-01-01' });
  });

  it('keeps a published month, quarter or year exactly as precise as it was published', () => {
    expect(formatDate('2025-02')).toEqual({ text: 'Feb 2025', dateTime: '2025-02' });
    expect(formatDate('2024-Q4')).toEqual({ text: 'Q4 2024', dateTime: null });
    expect(formatDate('2025')).toEqual({ text: '2025', dateTime: '2025' });
  });

  it('passes anything that is not a date through as it is', () => {
    expect(formatDate('soon')).toEqual({ text: 'soon', dateTime: null });
  });
});

describe('valueText', () => {
  it('writes numbers the Rig Lab way, and strings exactly as stored', () => {
    expect(valueText(6000)).toBe('6,000');
    expect(valueText('DDR5-6000 (OC)')).toBe('DDR5-6000 (OC)');
    expect(valueText('1205')).toBe('1205');
  });

  it('writes yes or no for a boolean', () => {
    expect(valueText(true)).toBe('Yes');
    expect(valueText(false)).toBe('No');
  });

  it('lists a list of plain values, and calls an empty list "None"', () => {
    expect(valueText(['ATX', 'Micro-ATX'])).toBe('ATX, Micro-ATX');
    expect(valueText([240, 360])).toBe('240, 360');
    expect(valueText([])).toBe('None');
  });
});
