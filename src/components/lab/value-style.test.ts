import { describe, expect, it } from 'vitest';
import type { SpecEvidence } from '../../engine/types';
import { valueTone, valueWraps } from './value-style';

function evidence(fields: Partial<SpecEvidence>): SpecEvidence {
  return {
    partId: 'part',
    category: 'cpu',
    field: 'socket',
    value: 'AM5',
    unit: null,
    availability: 'published',
    condition: null,
    note: null,
    sources: [],
    ...fields,
  };
}

describe('valueTone', () => {
  it('says a withheld value in the second ink tier, and every other value in the first', () => {
    expect(valueTone(evidence({ value: null, availability: 'not-published' }))).toBe('text-ink-2');
    expect(valueTone(evidence({ value: null, availability: 'none' }))).toBe('text-ink');
    expect(valueTone(evidence({}))).toBe('text-ink');
  });
});

describe('valueWraps', () => {
  it('keeps a number with its unit, a short name and a yes or no on one line', () => {
    expect(valueWraps(evidence({ value: 320, unit: 'mm' }))).toBe(false);
    expect(valueWraps(evidence({ value: 'Granite Ridge' }))).toBe(false);
    expect(valueWraps(evidence({ value: true }))).toBe(false);
  });

  it('lets words wrap: a condition, a long text as published, a list', () => {
    expect(
      valueWraps(evidence({ value: 300, unit: 'mm', condition: 'with a 360 mm front radiator' })),
    ).toBe(true);
    expect(
      valueWraps(evidence({ value: 'PCIe 5.0; Native PCIe Lanes (Total/Usable): 28 / 24' })),
    ).toBe(true);
    expect(valueWraps(evidence({ value: ['ATX', 'Micro-ATX', 'Mini-ITX'] }))).toBe(true);
  });
});
