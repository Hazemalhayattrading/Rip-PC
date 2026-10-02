import { describe, expect, it } from 'vitest';
import { DOC_TYPES, SPEC_CATEGORIES } from '../../data/schema';
import {
  CATEGORY_LABELS,
  catalogueFailure,
  docTypeLabel,
  formatAmount,
  formatSpecValue,
  partLabel,
  rayTracingLabel,
  resolutionLabel,
  upscalingLabel,
} from './lab-text';

const NBSP = ' ';

describe('partLabel', () => {
  it('puts the brand in front of a name that does not start with it', () => {
    expect(partLabel({ brand: 'ASUS', name: 'TUF GAMING B650-PLUS WIFI' })).toBe(
      'ASUS TUF GAMING B650-PLUS WIFI',
    );
    expect(partLabel({ brand: 'NVIDIA', name: 'GeForce RTX 5090' })).toBe(
      'NVIDIA GeForce RTX 5090',
    );
  });

  it('never repeats a brand the catalogue already wrote into the name', () => {
    expect(partLabel({ brand: 'AMD', name: 'AMD Ryzen 7 9800X3D' })).toBe('AMD Ryzen 7 9800X3D');
    expect(partLabel({ brand: 'WD_BLACK', name: 'WD_BLACK SN8100 NVMe SSD 2TB' })).toBe(
      'WD_BLACK SN8100 NVMe SSD 2TB',
    );
  });

  it('only drops a whole-word brand, so a name that merely begins with its letters keeps it', () => {
    expect(partLabel({ brand: 'NZXT', name: 'NZXTC850' })).toBe('NZXT NZXTC850');
    expect(partLabel({ brand: 'ARCTIC', name: 'Arctic P12' })).toBe('ARCTIC Arctic P12');
  });
});

describe('formatSpecValue', () => {
  it.each([
    [5200, '5,200'],
    [2.5, '2.5'],
    [805311.49, '805,311.49'],
    [0, '0'],
  ])(
    'writes the number %d with English grouping and every published decimal: %s',
    (value, text) => {
      expect(formatSpecValue(value)).toBe(text);
    },
  );

  it('writes yes or no for a boolean, and a string exactly as published', () => {
    expect(formatSpecValue(true)).toBe('Yes');
    expect(formatSpecValue(false)).toBe('No');
    expect(formatSpecValue('DDR5-6000 (OC)')).toBe('DDR5-6000 (OC)');
  });

  it('lists a list of plain values, and says so when the list is empty', () => {
    expect(formatSpecValue(['ATX', 'Micro-ATX'])).toBe('ATX, Micro-ATX');
    expect(formatSpecValue([2230, 2280])).toBe('2,230, 2,280');
    expect(formatSpecValue([])).toBe('Empty list');
  });
});

describe('formatAmount', () => {
  it('puts the currency code first, joined by a no-break space, as Rig Lab writes money', () => {
    expect(formatAmount(1899, 'SAR')).toBe(`SAR${NBSP}1,899`);
    expect(formatAmount(82.75, 'SAR')).toBe(`SAR${NBSP}82.75`);
    expect(formatAmount(2349.99, 'USD')).toBe(`USD${NBSP}2,349.99`);
  });

  it('shows cents as a shop does, and never rounds a published amount', () => {
    expect(formatAmount(82.5, 'SAR')).toBe(`SAR${NBSP}82.50`);
    expect(formatAmount(19.995, 'USD')).toBe(`USD${NBSP}19.995`);
  });
});

describe('catalogueFailure', () => {
  it('passes on the loader’s own sentence, which already says what failed', () => {
    expect(
      catalogueFailure(new Error('The catalogue could not be loaded: the server answered 404.')),
    ).toBe('The catalogue could not be loaded: the server answered 404.');
    expect(
      catalogueFailure(new Error('The catalogue file is not in the format this page expects.')),
    ).toBe('The catalogue file is not in the format this page expects.');
  });

  it('says the catalogue failed, and why, for any other error', () => {
    expect(catalogueFailure(new TypeError('Failed to fetch'))).toBe(
      'The catalogue could not be loaded: Failed to fetch.',
    );
    expect(catalogueFailure('offline.')).toBe('The catalogue could not be loaded: offline.');
  });
});

describe('labels', () => {
  it('names every spec category', () => {
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual([...SPEC_CATEGORIES].sort());
    expect(CATEGORY_LABELS['gpu-card']).toBe('Graphics card');
    expect(CATEGORY_LABELS['gpu-chip']).toBe('GPU chip');
  });

  it('names every document type in plain English, with acronyms in capitals', () => {
    for (const docType of DOC_TYPES) expect(docTypeLabel(docType)).toMatch(/^[A-Z]/);
    expect(docTypeLabel('cpu-support-list')).toBe('CPU support list');
    expect(docTypeLabel('bios-release-notes')).toBe('BIOS release notes');
    expect(docTypeLabel('spec-page')).toBe('Spec page');
  });

  it('writes a resolution with a multiplication sign', () => {
    expect(resolutionLabel('2560x1440')).toBe('2560 × 1440');
  });

  it('names ray tracing modes', () => {
    expect(rayTracingLabel('off')).toBe('Off');
    expect(rayTracingLabel('on')).toBe('On');
    expect(rayTracingLabel('path-tracing')).toBe('Path tracing');
  });

  it('writes upscaling with its mode and version, and native rendering as Native', () => {
    expect(upscalingLabel({ method: 'native', mode: null, version: null })).toBe('Native');
    expect(upscalingLabel({ method: 'DLSS', mode: 'Quality', version: 'DLSS 4' })).toBe(
      'DLSS Quality (DLSS 4)',
    );
    expect(upscalingLabel({ method: 'FSR', mode: 'Native', version: null })).toBe('FSR Native');
    expect(upscalingLabel({ method: 'XeSS', mode: null, version: null })).toBe('XeSS');
  });
});
