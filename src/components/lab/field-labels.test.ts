import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../../scripts/catalogue/catalogue';
import { SPEC_CATEGORIES } from '../../data/schema';
import { nullMeansNone } from '../../data/semantics';
import { utcToday } from '../../data/validate';
import { specLeaves } from '../../engine/evidence';
import { EXPLICIT_FIELD_PATTERNS, PART_ROLES, fieldLabel, nodeLabel } from './field-labels';

const { catalogue } = buildCatalogue(
  readDataFiles(resolve(import.meta.dirname, '../../..')),
  utcToday(),
);

/** Every spec leaf path of every catalogue part, by category. */
const leafPaths = SPEC_CATEGORIES.flatMap((category) =>
  catalogue.parts[category].flatMap((record) =>
    specLeaves(category, record, nullMeansNone(record)).map((leaf) => ({
      category,
      path: leaf.field,
    })),
  ),
);

describe('fieldLabel', () => {
  it('labels the specs the rules read in the words of the lab spec and the copy guide', () => {
    expect(fieldLabel('gpu-card', 'lengthMm')).toBe('Graphics card: length');
    expect(fieldLabel('case', 'gpuClearance.1.maxLengthMm')).toBe('Case: graphics card limit');
    expect(fieldLabel('case', 'psu.clearance.0.maxLengthMm')).toBe('Case: power supply limit');
    expect(fieldLabel('cpu', 'socket')).toBe('CPU: socket');
    expect(fieldLabel('motherboard', 'biosSupport.cpus.3.minBiosVersion')).toBe(
      'Motherboard: BIOS for this CPU',
    );
    expect(fieldLabel('motherboard', 'biosFlashback.supported')).toBe(
      'Motherboard: BIOS FlashBack',
    );
    expect(fieldLabel('ram', 'speedMtps')).toBe('Memory: rated speed');
    expect(fieldLabel('ram', 'heightMm')).toBe('Memory: height');
    expect(fieldLabel('cooler', 'ramClearanceMm')).toBe('Cooler: memory clearance');
    expect(fieldLabel('psu', 'lengthMm')).toBe('Power supply: length');
  });

  it('reads any other field from its name: words, no unit suffix, the part role first', () => {
    expect(fieldLabel('case-fan', 'staticPressureMmH2O')).toBe('Case fan: static pressure');
    expect(fieldLabel('storage', 'seqReadMBps')).toBe('Drive: sequential read');
    expect(fieldLabel('gpu-chip', 'vram.busWidthBits')).toBe('GPU chip: VRAM, bus width');
  });

  it('numbers a row of a list from 1, after the list’s name', () => {
    expect(fieldLabel('motherboard', 'm2Slots.0.lanes')).toBe('Motherboard: M.2 slots 1, lanes');
    expect(fieldLabel('motherboard', 'headers.fans.2.count')).toBe(
      'Motherboard: headers, fans 3, count',
    );
  });

  it('still reads a field the map has never seen', () => {
    expect(fieldLabel('cpu', 'someNewFieldMhz')).toBe('CPU: some new field');
    expect(fieldLabel('cpu', 'x')).toBe('CPU: x');
  });

  it('gives every spec of every catalogue part a label that starts with its part role', () => {
    expect(leafPaths.length).toBeGreaterThan(1000);
    const unlabelled = leafPaths.filter(({ category, path }) => {
      const label = fieldLabel(category, path);
      const spec = label.slice(`${PART_ROLES[category]}: `.length);
      return !label.startsWith(`${PART_ROLES[category]}: `) || spec.trim() === '';
    });
    expect(unlabelled).toEqual([]);
  });

  it('names only fields the catalogue has, so a typo in the map can’t hide', () => {
    const patterns = new Set(
      leafPaths.map(({ category, path }) => `${category} ${path.replace(/\.\d+(?=\.|$)/g, '.*')}`),
    );
    expect(EXPLICIT_FIELD_PATTERNS.filter((pattern) => !patterns.has(pattern))).toEqual([]);
  });
});

describe('nodeLabel', () => {
  it('names one level of a spec, for the indented rows of the parts table', () => {
    expect(nodeLabel('cpu', 'memory')).toBe('Memory');
    expect(nodeLabel('cpu', 'memory.speeds.0.speedMtps')).toBe('Speed');
    expect(nodeLabel('motherboard', 'm2Slots')).toBe('M.2 slots');
    expect(nodeLabel('motherboard', 'm2Slots.1')).toBe('2');
    expect(nodeLabel('cpu', 'l3CacheMb')).toBe('L3 cache');
  });

  it('names every level of every spec in the catalogue', () => {
    const unnamed = leafPaths.flatMap(({ category, path }) => {
      const segments = path.split('.');
      return segments
        .map((_, i) => segments.slice(0, i + 1).join('.'))
        .filter((prefix) => nodeLabel(category, prefix).trim() === '')
        .map((prefix) => `${category} ${prefix}`);
    });
    expect(unnamed).toEqual([]);
  });
});
