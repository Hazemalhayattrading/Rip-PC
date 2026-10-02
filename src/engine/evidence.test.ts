import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../scripts/catalogue/catalogue';
import type { SourceRef } from '../data/schema';
import { utcToday } from '../data/validate';
import {
  conditionOf,
  evidenceFor,
  noteFor,
  pathCovers,
  pathsOverlap,
  sourcesFor,
  specLeaves,
  unitOfField,
  valueAt,
} from './evidence';

const { catalogue } = buildCatalogue(
  readDataFiles(resolve(import.meta.dirname, '../..')),
  utcToday(),
);

function source(url: string, fields?: string[]): SourceRef {
  return {
    url,
    publisher: 'amd',
    retrievedAt: '2026-09-30',
    docType: 'spec-page',
    ...(fields === undefined ? {} : { fields }),
  };
}

describe('pathCovers', () => {
  it.each([
    ['lengthMm', 'lengthMm', true],
    ['memory', 'memory.speeds.0.type', true],
    ['memory.speeds', 'memory.speeds.1', true],
    ['gpuClearance.*.maxLengthMm', 'gpuClearance.2.maxLengthMm', true],
    ['gpuClearance.1', 'gpuClearance.1.condition', true],
    ['gpuClearance.1', 'gpuClearance.2.condition', false],
    ['memory.speeds', 'memory', false],
    ['memory', 'memoryType', false],
    ['gpuClearance.*', 'gpuClearance.x', false],
    ['gpuClearance.*', 'gpuClearance', false],
  ])('%s covers %s: %s', (cover, path, expected) => {
    expect(pathCovers(cover, path)).toBe(expected);
  });
});

describe('pathsOverlap', () => {
  it('is true when either path covers the other', () => {
    expect(pathsOverlap('gpuClearance', 'gpuClearance.1.maxLengthMm')).toBe(true);
    expect(pathsOverlap('gpuClearance.1.maxLengthMm', 'gpuClearance')).toBe(true);
    expect(pathsOverlap('gpuClearance.*.condition', 'gpuClearance.1')).toBe(true);
  });

  it('is false for sibling paths', () => {
    expect(pathsOverlap('lengthMm', 'heightMm')).toBe(false);
    expect(pathsOverlap('gpuClearance.0', 'gpuClearance.1')).toBe(false);
  });
});

describe('sourcesFor', () => {
  const whole = source('https://www.amd.com/a');
  const clocks = source('https://www.amd.com/b', ['baseClockMhz', 'boostClockMhz']);
  const memory = source('https://www.amd.com/c', ['memory']);
  const record = { sources: [whole, clocks, memory] };

  it('gives the sources that back the path, plus those that back the whole record', () => {
    expect(sourcesFor(record, 'boostClockMhz')).toEqual([whole, clocks]);
    expect(sourcesFor(record, 'memory.speeds.0.speedMtps')).toEqual([whole, memory]);
    expect(sourcesFor(record, 'socket')).toEqual([whole]);
  });

  it('gives a source for a sub-path to its parent too', () => {
    const row = source('https://www.amd.com/d', ['gpuClearance.1.maxLengthMm']);
    expect(sourcesFor({ sources: [row] }, 'gpuClearance')).toEqual([row]);
  });
});

describe('noteFor', () => {
  const record = {
    notes: [
      { text: 'A record note with no field.' },
      { field: 'layoutPositions', text: 'Fractal publishes four positions.' },
      {
        field: 'layoutPositions.*.radiatorFanMaxThicknessMm',
        text: 'Not published for position 1.',
      },
      { field: 'power.pptW', text: 'AMD does not publish the PPT.' },
    ],
  };

  it('gives the most specific note that covers the path, then the broader ones', () => {
    expect(noteFor(record, 'layoutPositions.0.radiatorFanMaxThicknessMm')).toBe(
      'Not published for position 1. Fractal publishes four positions.',
    );
    expect(noteFor(record, 'power.pptW')).toBe('AMD does not publish the PPT.');
  });

  it('gives null when no note covers the path, or the record has no notes', () => {
    expect(noteFor(record, 'socket')).toBeNull();
    expect(noteFor({}, 'socket')).toBeNull();
  });
});

describe('unitOfField', () => {
  it.each([
    ['lengthMm', 'mm'],
    ['gpuClearance.1.maxLengthMm', 'mm'],
    ['dimensionsMm.height', 'mm'],
    ['radiatorSupport.0.sizesMm', 'mm'],
    ['cardPowerW', 'W'],
    ['power.pptW', 'W'],
    ['voltageV', 'V'],
    ['clocks.boostMhz', 'MHz'],
    ['memory.speeds.0.speedMtps', 'MT/s'],
    ['l3CacheMb', 'MB'],
    ['vram.sizeGb', 'GB'],
    ['vram.speedGbps', 'Gbps'],
    ['vram.bandwidthGBps', 'GB/s'],
    ['seqReadMBps', 'MB/s'],
    ['enduranceTbw', 'TBW'],
    ['vram.busWidthBits', 'bits'],
    ['maxRpm', 'RPM'],
    ['airflowCfm', 'CFM'],
    ['staticPressureMmH2O', 'mmH2O'],
    ['warrantyYears', 'years'],
    ['slots', 'slots'],
    ['expansionSlots', 'slots'],
    ['memory.slots', 'slots'],
    ['pcie.usableLanes', 'lanes'],
    ['m2Slots.0.lanes', 'lanes'],
  ])('%s is in %s', (path, unit) => {
    expect(unitOfField(path)).toBe(unit);
  });

  it.each([
    ['socket'],
    ['cores'],
    ['hybrid.performanceCores'],
    ['shaders.count'],
    ['timings.cl'],
    ['pcieGen'],
    ['m2Slots.0'],
  ])('%s has no unit', (path) => {
    expect(unitOfField(path)).toBeNull();
  });

  it('reads the unit a record states for its own value, such as fan noise', () => {
    expect(unitOfField('noise.value', { noise: { value: 22.6, unit: 'dBA' } })).toBe('dBA');
    expect(unitOfField('noise.value', { noise: { value: 0.3, unit: 'sone' } })).toBe('sone');
    expect(unitOfField('noise.value')).toBeNull();
    expect(unitOfField('noise.value', { noise: { value: 1, unit: 'loud' } })).toBeNull();
  });
});

describe('valueAt', () => {
  const record = { a: { b: [{ c: 1 }, { c: null }] }, d: ['x', 'y'] };

  it('reads a dot path through objects and arrays', () => {
    expect(valueAt(record, 'a.b.0.c')).toBe(1);
    expect(valueAt(record, 'a.b.1.c')).toBeNull();
    expect(valueAt(record, 'd')).toEqual(['x', 'y']);
    expect(valueAt(record, 'd.1')).toBe('y');
  });

  it('gives undefined for a path that is not in the record', () => {
    expect(valueAt(record, 'a.b.2.c')).toBeUndefined();
    expect(valueAt(record, 'a.x')).toBeUndefined();
    expect(valueAt(record, 'a.b.c')).toBeUndefined();
    expect(valueAt(record, 'd.0.e')).toBeUndefined();
  });
});

describe('evidenceFor, on real catalogue records', () => {
  const card = catalogue.parts['gpu-card'].find(
    (c) => c.id === 'sapphire-pulse-radeon-rx-9070-xt-16gb',
  );
  const i5 = catalogue.parts.cpu.find((c) => c.id === 'intel-core-i5-12400f');

  it('reads a published spec with its unit and sources', () => {
    if (card === undefined)
      throw new Error('The Sapphire Pulse RX 9070 XT is not in the catalogue.');
    const evidence = evidenceFor('gpu-card', card, 'lengthMm', []);
    expect(evidence).toMatchObject({
      partId: 'sapphire-pulse-radeon-rx-9070-xt-16gb',
      category: 'gpu-card',
      field: 'lengthMm',
      value: 320,
      unit: 'mm',
      availability: 'published',
    });
    expect(evidence.sources.length).toBeGreaterThan(0);
    expect(evidence.sources).toEqual(sourcesFor(card, 'lengthMm'));
  });

  it('marks a null that means "none" as none, and any other null as not published', () => {
    if (i5 === undefined) throw new Error('The Core i5-12400F is not in the catalogue.');
    expect(evidenceFor('cpu', i5, 'igpu', ['igpu']).availability).toBe('none');
    expect(evidenceFor('cpu', i5, 'igpu', []).availability).toBe('not-published');
    expect(evidenceFor('cpu', i5, 'igpu', ['igpu']).note).not.toBeNull();
  });

  it('matches "none" patterns with a * for any index', () => {
    const north = catalogue.parts.case.find(
      (c) => c.id === 'fractal-north-charcoal-black-tg-light',
    );
    if (north === undefined) throw new Error('The Fractal North is not in the catalogue.');
    const row = north.gpuClearance.findIndex((c) => c.condition === null);
    expect(
      evidenceFor('case', north, `gpuClearance.${String(row)}.condition`, [
        'gpuClearance.*.condition',
      ]).availability,
    ).toBe('none');
  });

  it('refuses a path that is not in the record', () => {
    if (card === undefined)
      throw new Error('The Sapphire Pulse RX 9070 XT is not in the catalogue.');
    expect(() => evidenceFor('gpu-card', card, 'widthMm', [])).toThrow(
      'sapphire-pulse-radeon-rx-9070-xt-16gb has no spec at widthMm.',
    );
  });

  it('refuses a path to an object, which is not a single value', () => {
    if (card === undefined)
      throw new Error('The Sapphire Pulse RX 9070 XT is not in the catalogue.');
    expect(() => evidenceFor('gpu-card', card, 'powerConnectors.0', [])).toThrow(
      'sapphire-pulse-radeon-rx-9070-xt-16gb has no single value at powerConnectors.0: it is a group of specs.',
    );
  });
});

describe('conditionOf (design-lead S2)', () => {
  const north = catalogue.parts.case.find((c) => c.id === 'fractal-north-charcoal-black-tg-light');

  it('gives a conditional limit the condition of its row, and an unconditional one none', () => {
    if (north === undefined) throw new Error('The Fractal North is not in the catalogue.');
    const row = north.gpuClearance.findIndex((c) => c.condition !== null);
    const free = north.gpuClearance.findIndex((c) => c.condition === null);
    expect(conditionOf(north, `gpuClearance.${String(row)}.maxLengthMm`)).toBe(
      'with a 360 mm front radiator',
    );
    expect(conditionOf(north, `gpuClearance.${String(free)}.maxLengthMm`)).toBeNull();
    expect(
      evidenceFor('case', north, `gpuClearance.${String(row)}.maxLengthMm`, []).condition,
    ).toBe('with a 360 mm front radiator');
  });

  it("reads a structured condition's maker wording (WP-D1)", () => {
    const structured = {
      gpuClearance: [
        { maxLengthMm: 300, condition: { kind: 'radiator', asPublished: 'with front radiator' } },
        { maxLengthMm: 280, condition: { kind: 'radiator' } },
      ],
    };
    expect(conditionOf(structured, 'gpuClearance.0.maxLengthMm')).toBe('with front radiator');
    expect(conditionOf(structured, 'gpuClearance.1.maxLengthMm')).toBeNull();
  });

  it('gives none for top-level specs and for the condition itself', () => {
    if (north === undefined) throw new Error('The Fractal North is not in the catalogue.');
    expect(conditionOf(north, 'expansionSlots')).toBeNull();
    expect(conditionOf(north, 'gpuClearance.1.condition')).toBeNull();
  });
});

describe('specLeaves', () => {
  it('lists every spec of every catalogue record, and every published one has a source', () => {
    for (const category of Object.keys(catalogue.parts) as (keyof typeof catalogue.parts)[]) {
      for (const record of catalogue.parts[category]) {
        const leaves = specLeaves(category, record, []);
        expect(leaves.length, record.id).toBeGreaterThan(0);
        for (const leaf of leaves.filter((l) => l.availability === 'published')) {
          expect(leaf.sources.length, `${record.id} ${leaf.field}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('leaves out the identity fields, sources and notes, and keeps lists of values whole', () => {
    const north = catalogue.parts.case.find(
      (c) => c.id === 'fractal-north-charcoal-black-tg-light',
    );
    if (north === undefined) throw new Error('The Fractal North is not in the catalogue.');
    const fields = specLeaves('case', north, []).map((leaf) => leaf.field);
    for (const skipped of ['id', 'category', 'manufacturer', 'sources', 'notes']) {
      expect(fields).not.toContain(skipped);
    }
    expect(fields).toContain('name');
    expect(fields).toContain('supportedBoards');
    expect(fields).toContain('gpuClearance.0.maxLengthMm');
    expect(fields).toContain('radiatorSupport.0.sizesMm');
    expect(fields.some((field) => field.startsWith('supportedBoards.'))).toBe(false);
  });

  it('keeps an empty list as one value, so "none" still shows', () => {
    const tiny = { id: 'x', frontIo: { usbC: [] }, sources: [source('https://a.b/c')] };
    const fields = specLeaves('case', tiny, []);
    expect(fields).toEqual([
      expect.objectContaining({ field: 'frontIo.usbC', value: [], availability: 'published' }),
    ]);
  });
});
