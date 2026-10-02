import { describe, expect, it } from 'vitest';
import { SPEC_CATEGORIES } from '../data/schema';
import * as engine from './index';
import { RULE_SPECS, ruleSpec } from './rules';
import { RULE_IDS, RULE_STATUSES, type BuildCategory, type RuleId } from './types';

/** The categories a build picks from, in build order (`BuildParts`). GPU chips are not sold. */
const BUILD_CATEGORIES: readonly string[] = SPEC_CATEGORIES.filter((c) => c !== 'gpu-chip');

/** The categories a rule reads, `?` marking an optional one. */
const readsOf = (id: RuleId): string[] =>
  ruleSpec(id).reads.map(({ category, optional }) => `${category}${optional ? '?' : ''}`);

describe('RULE_SPECS', () => {
  it('has exactly one spec per rule id, in RULE_IDS order', () => {
    expect(RULE_SPECS.map((spec) => spec.id)).toEqual(RULE_IDS);
    expect(new Set(RULE_SPECS.map((spec) => spec.id)).size).toBe(RULE_SPECS.length);
  });

  it('gives every rule a unique, non-empty title and a one-line check', () => {
    for (const { id, title, checks } of RULE_SPECS) {
      expect(title.trim(), id).not.toBe('');
      expect(title, id).toBe(title.trim());
      expect(checks.trim(), id).not.toBe('');
      expect(checks, id).not.toMatch(/\n/);
    }
    expect(new Set(RULE_SPECS.map((spec) => spec.title.toLowerCase())).size).toBe(RULE_IDS.length);
  });

  it('lists outcomes from RULE_STATUSES, best first, without duplicates', () => {
    for (const { id, outcomes } of RULE_SPECS) {
      expect(outcomes, id).toEqual(RULE_STATUSES.filter((status) => outcomes.includes(status)));
      expect(outcomes, id).toContain('ok');
      expect(outcomes.length, id).toBeGreaterThan(1);
    }
  });

  it('reads build categories only, in build order, without duplicates', () => {
    for (const { id, reads } of RULE_SPECS) {
      const categories: readonly BuildCategory[] = reads.map((read) => read.category);
      expect(categories, id).toEqual(
        BUILD_CATEGORIES.filter((c) => reads.some((r) => r.category === c)),
      );
      expect(new Set(categories).size, id).toBe(categories.length);
    }
  });

  it('reads at least two parts, one of them required, so every combination concerns a pick', () => {
    for (const { id, reads } of RULE_SPECS) {
      expect(reads.length, id).toBeGreaterThanOrEqual(2);
      expect(
        reads.some((read) => !read.optional),
        id,
      ).toBe(true);
    }
  });
});

describe('RULE_SPECS: the decisions of plan §3 and §6', () => {
  it('lets every rule that reads a field a maker may leave unpublished say "can\'t verify" (warn)', () => {
    // Fields that are null with a note, or lists that can be empty (Director, 2026-10-02):
    // card thickness, RAM height and cooler RAM clearance, radiator thickness limits, the case's
    // PSU length rows, card power, the 16-pin standard, M.2 slots and lane sharing, front USB-C.
    const readsUnpublishable: readonly RuleId[] = [
      'gpu-thickness',
      'ram-cooler-clearance',
      'radiator-fit',
      'psu-length',
      'psu-wattage',
      'gpu-power-connector',
      'm2-lanes',
      'usb-c-header',
    ];
    for (const id of readsUnpublishable) expect(ruleSpec(id).outcomes, id).toContain('warn');
  });

  it('keeps the unknown-data warn of test plan §9.2 for the per-layout case limits', () => {
    for (const id of ['gpu-length', 'cooler-height', 'psu-length'] as const) {
      expect(ruleSpec(id).outcomes, id).toEqual(['ok', 'warn', 'block']);
    }
  });

  it('never blocks on the BIOS: an update without FlashBack is a warn (Hazem, plan §6)', () => {
    expect(ruleSpec('bios-version').outcomes).toEqual(['ok', 'warn']);
  });

  it('gives the two added rules the outcomes build-lead set', () => {
    expect(ruleSpec('cooler-socket').outcomes).toEqual(['ok', 'warn', 'block']);
    expect(ruleSpec('display-output').outcomes).toEqual(['ok', 'block']);
  });

  it('checks display output with and without a graphics card', () => {
    expect(readsOf('display-output')).toEqual(['cpu', 'gpu-card?']);
  });

  it('reads the cooler, optionally, where a front radiator changes a case limit', () => {
    expect(readsOf('gpu-length')).toEqual(['gpu-card', 'cooler?', 'case']);
    expect(readsOf('psu-length')).toEqual(['psu', 'cooler?', 'case']);
  });

  it('pairs the Fractal Terra spine limits: card thickness with the cooler, and back', () => {
    expect(readsOf('gpu-thickness')).toEqual(['motherboard', 'gpu-card', 'cooler?', 'case']);
    expect(readsOf('cooler-height')).toEqual(['gpu-card?', 'cooler', 'case']);
  });

  it('reads the CPU, the graphics card and the PSU for wattage until WP-E2 refines it', () => {
    expect(readsOf('psu-wattage')).toEqual(['cpu', 'gpu-card?', 'psu']);
  });

  it('marks the rules with a numeric limit, which need boundary tests (test plan §9.1)', () => {
    expect(RULE_SPECS.filter((spec) => spec.numeric).map((spec) => spec.id)).toEqual([
      'ram-slots',
      'ram-speed',
      'gpu-length',
      'gpu-thickness',
      'cooler-height',
      'ram-cooler-clearance',
      'radiator-fit',
      'psu-length',
      'psu-wattage',
      'gpu-power-connector',
      'm2-lanes',
    ]);
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
