import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../scripts/catalogue/catalogue';
import { SPEC_CATEGORIES } from '../data/schema';
import { utcToday } from '../data/validate';
import * as engine from './index';
import { MAX_DUMP_DRIVES, RULE_SPECS, ruleSpec } from './rules';
import { RULE_IDS, RULE_STATUSES, type BuildCategory, type RuleId } from './types';

const { catalogue } = buildCatalogue(
  readDataFiles(resolve(import.meta.dirname, '../..')),
  utcToday(),
);

/** The categories a build picks from, in build order (`BuildParts`). GPU chips are not sold. */
const BUILD_CATEGORIES: readonly string[] = SPEC_CATEGORIES.filter((c) => c !== 'gpu-chip');

/** The categories a rule reads, `?` marking an optional one. */
const readsOf = (id: RuleId): string[] =>
  ruleSpec(id).reads.map(({ category, optional }) => `${category}${optional ? '?' : ''}`);

/**
 * QA's record, tests/audit/compat-rules.json (test plan v4 §9.2), copied here as
 * [outcomes, numeric, unknownData]. compat-trace compares the dump's registry with that file, so
 * a change on either side shows up there too.
 */
const QA_RECORD: Readonly<Record<RuleId, readonly [readonly string[], boolean, boolean]>> = {
  'cpu-socket': [['ok', 'block'], false, false],
  'cpu-chipset': [['ok', 'block'], false, false],
  'bios-version': [['ok', 'warn'], false, true],
  'ram-type': [['ok', 'block'], false, false],
  'ram-slots': [['ok', 'block'], true, false],
  'ram-speed': [['ok', 'warn'], true, true],
  'gpu-length': [['ok', 'block'], true, true],
  'gpu-thickness': [['ok', 'warn', 'block'], true, true],
  'cooler-height': [['ok', 'block'], true, false],
  'ram-cooler-clearance': [['ok', 'warn', 'block'], true, true],
  'radiator-fit': [['ok', 'block'], true, true],
  'psu-form-factor': [['ok', 'warn', 'block'], false, true],
  'psu-length': [['ok', 'block'], true, true],
  'psu-wattage': [['ok', 'warn', 'block'], true, true],
  'gpu-power-connector': [['ok', 'warn', 'block'], true, true],
  'm2-lanes': [['ok', 'warn', 'block'], true, false],
  'board-form-factor': [['ok', 'block'], false, false],
  'usb-c-header': [['ok', 'warn'], false, false],
  'cooler-socket': [['ok', 'block'], false, false],
  'display-output': [['ok', 'block'], false, false],
};

describe('RULE_SPECS', () => {
  it('has exactly one spec per rule id, in RULE_IDS order', () => {
    expect(RULE_SPECS.map((spec) => spec.id)).toEqual(RULE_IDS);
    expect(new Set(RULE_SPECS.map((spec) => spec.id)).size).toBe(RULE_SPECS.length);
  });

  it("uses copy guide §6's rule names", () => {
    expect(RULE_SPECS.map((spec) => spec.title)).toEqual([
      'CPU socket',
      'CPU support list',
      'BIOS version',
      'Memory type',
      'Memory slots',
      'Memory speed',
      'Graphics card length',
      'Graphics card thickness',
      'Cooler height',
      'Memory under the cooler',
      'Radiator fit',
      'Power supply form factor',
      'Power supply length',
      'Power supply wattage',
      'Graphics card power cables',
      'M.2 slots and shared lanes',
      'Motherboard form factor',
      'Front USB-C port',
      'Cooler mounting',
      'Display output',
    ]);
  });

  it('gives every rule a one-line check', () => {
    for (const { id, checks } of RULE_SPECS) {
      expect(checks.trim(), id).not.toBe('');
      expect(checks, id).not.toMatch(/\n/);
    }
  });

  it.each(RULE_IDS)("matches QA's outcomes, numeric and unknownData for %s", (id) => {
    const [outcomes, numeric, unknownData] = QA_RECORD[id];
    const spec = ruleSpec(id);
    expect([spec.outcomes, spec.numeric, spec.unknownData]).toEqual([
      outcomes,
      numeric,
      unknownData,
    ]);
  });

  it('lists outcomes from RULE_STATUSES, best first, ok and at least one other', () => {
    for (const { id, outcomes } of RULE_SPECS) {
      expect(outcomes, id).toEqual(RULE_STATUSES.filter((status) => outcomes.includes(status)));
      expect(outcomes, id).toContain('ok');
      expect(outcomes.length, id).toBeGreaterThan(1);
    }
  });

  it('never blocks on the BIOS: an update without FlashBack is a warn (Hazem, plan §6)', () => {
    expect(ruleSpec('bios-version').outcomes).not.toContain('block');
  });

  it('reads build categories only, in build order, without duplicates, at least one required', () => {
    for (const { id, reads } of RULE_SPECS) {
      const categories: readonly BuildCategory[] = reads.map((read) => read.category);
      expect(categories, id).toEqual(
        BUILD_CATEGORIES.filter((c) => reads.some((r) => r.category === c)),
      );
      expect(new Set(categories).size, id).toBe(categories.length);
      expect(
        reads.some((read) => !read.optional),
        id,
      ).toBe(true);
    }
  });
});

describe('RULE_SPECS: the layout search and the sweeps', () => {
  const LAYOUT_RULES = [
    'gpu-length',
    'gpu-thickness',
    'cooler-height',
    'radiator-fit',
    'psu-length',
  ];

  it('marks the five case-layout rules as layout-dependent', () => {
    expect(RULE_SPECS.filter((spec) => spec.layoutDependent).map((spec) => spec.id)).toEqual(
      LAYOUT_RULES,
    );
  });

  it('makes every layout-dependent rule read every input of the layout search (QA C5)', () => {
    for (const id of LAYOUT_RULES as RuleId[]) {
      const read = ruleSpec(id).reads.map((r) => r.category);
      for (const input of ['gpu-card', 'psu', 'cooler', 'case'] as const) {
        expect(read, `${id} reads ${input}`).toContain(input);
      }
    }
  });

  it('makes cooler-height read the memory that can raise the cooler (QA follow-up 2)', () => {
    expect(readsOf('cooler-height')).toEqual(['ram?', 'gpu-card?', 'psu?', 'cooler', 'case']);
  });

  it('checks the cooler against the CPU socket, or the board socket before a CPU is picked', () => {
    expect(readsOf('cooler-socket')).toEqual(['cpu?', 'motherboard?', 'cooler']);
  });

  it('pins the reads of the rules whose parts are not layout inputs', () => {
    expect(readsOf('display-output')).toEqual(['cpu', 'gpu-card?']);
    expect(readsOf('ram-cooler-clearance')).toEqual(['ram', 'cooler']);
    expect(readsOf('gpu-thickness')).toEqual([
      'motherboard',
      'gpu-card',
      'psu?',
      'cooler?',
      'case',
    ]);
    expect(readsOf('m2-lanes')).toEqual(['motherboard', 'storage']);
  });

  it('reads every part that draws power for psu-wattage, swept at the power extremes', () => {
    expect(readsOf('psu-wattage')).toEqual([
      'cpu',
      'motherboard?',
      'ram?',
      'gpu-card?',
      'storage?',
      'psu',
      'cooler?',
      'case?',
      'case-fan?',
    ]);
    expect(ruleSpec('psu-wattage').sweep).toEqual({ kind: 'power-extremes' });
  });

  it('sweeps m2-lanes with drive lists that overfill every catalogue board', () => {
    expect(ruleSpec('m2-lanes').sweep).toEqual({ kind: 'drive-lists', maxDrives: MAX_DUMP_DRIVES });
    const mostSlots = Math.max(...catalogue.parts.motherboard.map((board) => board.m2Slots.length));
    expect(MAX_DUMP_DRIVES, 'raise MAX_DUMP_DRIVES: a board has more M.2 slots').toBeGreaterThan(
      mostSlots,
    );
  });

  it('sweeps every other rule as a full product', () => {
    for (const spec of RULE_SPECS) {
      if (spec.id === 'psu-wattage' || spec.id === 'm2-lanes') continue;
      expect(spec.sweep, spec.id).toEqual({ kind: 'product' });
    }
  });
});

describe('ruleSpec', () => {
  it.each(RULE_IDS)('returns the spec of %s', (id) => {
    expect(ruleSpec(id)).toBe(RULE_SPECS[RULE_IDS.indexOf(id)]);
  });

  it('throws on an id that is not a rule', () => {
    expect(() => ruleSpec('cpu-sockets' as RuleId)).toThrow(
      new RangeError('No compatibility rule has the id "cpu-sockets".'),
    );
  });

  it('is exported from the engine entry module', () => {
    expect(engine.ruleSpec).toBe(ruleSpec);
    expect(engine.RULE_SPECS).toBe(RULE_SPECS);
  });
});
