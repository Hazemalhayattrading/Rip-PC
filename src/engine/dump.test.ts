import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../scripts/catalogue/catalogue';
import { SPEC_CATEGORIES } from '../data/schema';
import { utcToday } from '../data/validate';
import {
  buildPartsOf,
  combinationsOf,
  dumpRule,
  dumpSummary,
  type Combination,
  type RuleEvaluator,
} from './dump';
import * as engine from './index';
import { RULE_SPECS, ruleSpec } from './rules';
import type { BuildCategory, BuildParts, Catalogue, RuleNotRun, RuleResult } from './types';

const { catalogue } = buildCatalogue(
  readDataFiles(resolve(import.meta.dirname, '../..')),
  utcToday(),
);

/** The part ids of one category, in catalogue order. */
const idsOf = (category: BuildCategory): string[] =>
  catalogue.parts[category].map((part) => part.id);

/** The catalogue with one category emptied. */
const without = (category: BuildCategory): Catalogue => ({
  ...catalogue,
  parts: { ...catalogue.parts, [category]: [] },
});

describe('combinationsOf', () => {
  it('gives every CPU and board pair, in catalogue order, the first category varying slowest', () => {
    const cpus = idsOf('cpu');
    const boards = idsOf('motherboard');
    const combinations = combinationsOf(catalogue, ruleSpec('cpu-socket').reads);
    expect(combinations).toHaveLength(cpus.length * boards.length);
    expect(combinations).toEqual(
      cpus.flatMap((cpu) => boards.map((motherboard) => ({ cpu, motherboard }))),
    );
  });

  it('adds "not picked" (null) last for an optional category', () => {
    const cpus = idsOf('cpu');
    const cards = [...idsOf('gpu-card'), null];
    const combinations = combinationsOf(catalogue, ruleSpec('display-output').reads);
    expect(combinations).toHaveLength(cpus.length * cards.length);
    expect(combinations).toEqual(
      cpus.flatMap((cpu) => cards.map((card) => ({ cpu, 'gpu-card': card }))),
    );
    expect(combinations[cards.length - 1]).toEqual({ cpu: cpus[0], 'gpu-card': null });
  });

  it('keys each combination by the read categories, in the order of reads', () => {
    const { reads } = ruleSpec('gpu-thickness');
    const combinations = combinationsOf(catalogue, reads);
    expect(combinations).toHaveLength(
      idsOf('motherboard').length *
        idsOf('gpu-card').length *
        (idsOf('cooler').length + 1) *
        idsOf('case').length,
    );
    for (const combination of combinations) {
      expect(Object.keys(combination)).toEqual(reads.map((read) => read.category));
    }
  });

  it('gives one empty combination when a rule reads nothing', () => {
    expect(combinationsOf(catalogue, [])).toEqual([{}]);
  });

  it('gives none when a required category has no parts, and only "not picked" for an optional one', () => {
    expect(combinationsOf(without('motherboard'), ruleSpec('cpu-socket').reads)).toEqual([]);
    expect(combinationsOf(without('gpu-card'), ruleSpec('display-output').reads)).toEqual(
      idsOf('cpu').map((cpu) => ({ cpu, 'gpu-card': null })),
    );
  });
});

describe('buildPartsOf', () => {
  it('leaves every category the combination does not name unpicked', () => {
    expect(buildPartsOf({})).toStrictEqual({
      cpu: null,
      motherboard: null,
      ram: null,
      'gpu-card': null,
      storage: [],
      psu: null,
      cooler: null,
      case: null,
      'case-fan': null,
    });
  });

  it('fills in every category it names: one drive, and one pack of case fans', () => {
    const combination: Combination = {
      cpu: 'cpu-a',
      motherboard: 'board-b',
      ram: 'ram-c',
      'gpu-card': 'card-d',
      storage: 'drive-e',
      psu: 'psu-f',
      cooler: 'cooler-g',
      case: 'case-h',
      'case-fan': 'fan-i',
    };
    expect(buildPartsOf(combination)).toStrictEqual({
      cpu: 'cpu-a',
      motherboard: 'board-b',
      ram: 'ram-c',
      'gpu-card': 'card-d',
      storage: ['drive-e'],
      psu: 'psu-f',
      cooler: 'cooler-g',
      case: 'case-h',
      'case-fan': { partId: 'fan-i', packs: 1 },
    });
  });

  it('reads an optional "not picked" as unpicked', () => {
    const build = buildPartsOf({ cpu: 'cpu-a', 'gpu-card': null, storage: null, 'case-fan': null });
    expect(build['gpu-card']).toBeNull();
    expect(build.storage).toEqual([]);
    expect(build['case-fan']).toBeNull();
  });
});

/** A stand-in rule: it checks nothing, but writes the build it saw into its reason. */
const echo: RuleEvaluator = (build: BuildParts): RuleResult | RuleNotRun => {
  const cpu = build.cpu ?? 'none';
  if (build['gpu-card'] === null) {
    return { ruleId: 'display-output', why: 'needs-parts', needs: ['gpu-card'], reason: cpu };
  }
  return {
    ruleId: 'display-output',
    status: 'ok',
    cantVerify: false,
    parts: [{ category: 'gpu-card', partId: build['gpu-card'] }],
    reason: `${cpu} + ${build['gpu-card']}`,
    advice: [],
    evidence: [],
    layoutId: null,
  };
};

describe('dumpRule', () => {
  it('writes the rule metadata, and every combination with a null result before WP-E1', () => {
    const spec = ruleSpec('cpu-socket');
    const dump = dumpRule(spec, catalogue);
    expect(dump).toMatchObject({
      id: spec.id,
      title: spec.title,
      reads: spec.reads,
      numeric: spec.numeric,
      outcomes: spec.outcomes,
      implemented: false,
    });
    expect(Object.keys(dump)).toEqual([
      'id',
      'title',
      'reads',
      'numeric',
      'outcomes',
      'implemented',
      'combinationCount',
      'combinations',
    ]);
    const combinations = combinationsOf(catalogue, spec.reads);
    expect(dump.combinationCount).toBe(combinations.length);
    expect(dump.combinations).toEqual(combinations.map((parts) => ({ parts, result: null })));
  });

  it('puts each result next to the combination it was evaluated on', () => {
    const seen: BuildParts[] = [];
    const dump = dumpRule(ruleSpec('display-output'), catalogue, (build, given) => {
      expect(given).toBe(catalogue);
      seen.push(build);
      return echo(build, given);
    });
    expect(dump.implemented).toBe(true);
    expect(seen).toEqual(dump.combinations.map(({ parts }) => buildPartsOf(parts)));
    for (const { parts, result } of dump.combinations) {
      const cpu = parts.cpu ?? 'none';
      const card = parts['gpu-card'] ?? null;
      expect(result?.reason).toBe(card === null ? cpu : `${cpu} + ${card}`);
    }
  });

  it('writes plain JSON, the same every run', () => {
    const dumps = RULE_SPECS.map((spec) => dumpRule(spec, catalogue));
    const json = JSON.stringify(dumps);
    expect(JSON.parse(json)).toStrictEqual(dumps);
    expect(JSON.stringify(RULE_SPECS.map((spec) => dumpRule(spec, catalogue)))).toBe(json);
    const implemented = dumpRule(ruleSpec('display-output'), catalogue, echo);
    expect(JSON.parse(JSON.stringify(implemented))).toStrictEqual(implemented);
  });
});

describe('dumpSummary', () => {
  const dumps = [
    dumpRule(ruleSpec('cpu-socket'), catalogue),
    dumpRule(ruleSpec('display-output'), catalogue, echo),
  ];
  const summary = dumpSummary(catalogue, dumps);

  it('names the data the dump was built from', () => {
    expect(summary.dataHash).toBe(catalogue.dataHash);
  });

  it('counts the parts in every catalogue category, in data-lead order', () => {
    expect(Object.keys(summary.parts)).toEqual(SPEC_CATEGORIES);
    for (const category of SPEC_CATEGORIES) {
      expect(summary.parts[category], category).toBe(catalogue.parts[category].length);
    }
  });

  it('counts the price observations and gaps in each market', () => {
    expect(summary.prices).toStrictEqual({
      SA: {
        observations: catalogue.prices.SA.observations.length,
        gaps: catalogue.prices.SA.gaps.length,
      },
      US: {
        observations: catalogue.prices.US.observations.length,
        gaps: catalogue.prices.US.gaps.length,
      },
    });
  });

  it('counts the game and creator anchors', () => {
    expect(summary.anchors).toStrictEqual({
      game: catalogue.gameBenchmarks.length,
      creator: catalogue.creatorBenchmarks.length,
    });
  });

  it('lists each dumped rule with whether it is implemented and its combination count', () => {
    expect(summary.rules).toStrictEqual([
      { id: 'cpu-socket', implemented: false, combinationCount: dumps[0]?.combinationCount },
      { id: 'display-output', implemented: true, combinationCount: dumps[1]?.combinationCount },
    ]);
  });

  it('is plain JSON', () => {
    expect(JSON.parse(JSON.stringify(summary))).toStrictEqual(summary);
  });
});

describe('the engine entry module', () => {
  it('exports the dump', () => {
    expect(engine.combinationsOf).toBe(combinationsOf);
    expect(engine.buildPartsOf).toBe(buildPartsOf);
    expect(engine.dumpRule).toBe(dumpRule);
    expect(engine.dumpSummary).toBe(dumpSummary);
  });
});
