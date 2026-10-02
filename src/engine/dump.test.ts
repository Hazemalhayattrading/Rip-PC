import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../scripts/catalogue/catalogue';
import { SPEC_CATEGORIES } from '../data/schema';
import { utcToday } from '../data/validate';
import type { RuleEvaluator } from './compat/check';
import {
  dumpColumns,
  dumpRule,
  dumpSummary,
  partsOfRow,
  sweepRows,
  type DumpCell,
  type DumpColumn,
  type DumpRow,
  type PowerExtremes,
} from './dump';
import * as engine from './index';
import { RULE_SPECS, ruleSpec } from './rules';
import type { BuildCategory, BuildParts, RuleNotRun, RuleResult, RuleSpec } from './types';

const { catalogue } = buildCatalogue(
  readDataFiles(resolve(import.meta.dirname, '../..')),
  utcToday(),
);

/** The part ids of one category, in catalogue order. */
const idsOf = (category: BuildCategory): string[] =>
  catalogue.parts[category].map((part) => part.id);

/** How many choices one read gives a product sweep: every part, plus "not picked" when optional. */
const choices = (read: RuleSpec['reads'][number]): number =>
  catalogue.parts[read.category].length + (read.optional ? 1 : 0);

/** The positions a case takes for a cooler's radiator, without repeats: none for an air cooler. */
function radiatorPositions(coolerId: string | null, caseId: string): string[] {
  const cooler = catalogue.parts.cooler.find((part) => part.id === coolerId);
  const pcCase = catalogue.parts.case.find((part) => part.id === caseId);
  if (cooler?.type !== 'aio' || pcCase === undefined) return [];
  const fits = pcCase.radiatorSupport.filter((mount) =>
    mount.sizesMm.includes(cooler.radiatorSizeMm),
  );
  return [...new Set(fits.map((mount) => mount.position))];
}

/** The binomial coefficient C(n, k). */
function binomial(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return result;
}

/** One column's cells, from a rule's rows. */
const column = (columns: readonly DumpColumn[], rows: readonly DumpRow[], name: DumpColumn) =>
  rows.map((row) => row[columns.indexOf(name)]);

const NORTH = 'fractal-north-charcoal-black-tg-light';
const POP_AIR = 'fractal-pop-air-rgb-black-tg-clear-tint';
const AIO_360 = 'arctic-liquid-freezer-iii-pro-360';
const AIO_240 = 'nzxt-kraken-plus-240';
const AIR = 'deepcool-ak620';

describe('dumpColumns', () => {
  it('lists the read categories in reads order', () => {
    expect(dumpColumns(ruleSpec('cpu-socket'))).toEqual(['cpu', 'motherboard']);
    expect(dumpColumns(ruleSpec('m2-lanes'))).toEqual(['motherboard', 'storage']);
  });

  it('adds the radiator position for a layout-dependent rule', () => {
    expect(dumpColumns(ruleSpec('gpu-length'))).toEqual([
      'gpu-card',
      'psu',
      'cooler',
      'case',
      'radiatorPosition',
    ]);
  });
});

describe('sweepRows: product', () => {
  it('gives every combination of the read categories, in catalogue order, the first varying slowest', () => {
    const spec = ruleSpec('ram-speed');
    const { rows, complete } = sweepRows(spec, catalogue);
    expect(complete).toBe(true);
    expect(rows).toHaveLength(spec.reads.map(choices).reduce((a, b) => a * b, 1));
    expect(rows).toEqual(
      idsOf('cpu').flatMap((cpu) =>
        idsOf('motherboard').flatMap((board) => idsOf('ram').map((kit) => [cpu, board, kit])),
      ),
    );
  });

  it('adds "not picked" (null) last for an optional category', () => {
    const cards = [...idsOf('gpu-card'), null];
    const { rows } = sweepRows(ruleSpec('display-output'), catalogue);
    expect(rows).toEqual(idsOf('cpu').flatMap((cpu) => cards.map((card) => [cpu, card])));
  });

  it('gives no rows when a required category has no parts', () => {
    const empty = { ...catalogue, parts: { ...catalogue.parts, motherboard: [] } };
    expect(sweepRows(ruleSpec('cpu-socket'), empty).rows).toEqual([]);
  });

  it.each(RULE_SPECS.filter((spec) => spec.layoutDependent).map((spec) => spec.id))(
    'expands the radiator position of %s: unset, then each position the case takes',
    (id) => {
      const spec = ruleSpec(id);
      const others = spec.reads.filter((read) => !['cooler', 'case'].includes(read.category));
      const cooler = spec.reads.find((read) => read.category === 'cooler');
      const coolers = [...idsOf('cooler'), ...(cooler?.optional === true ? [null] : [])];
      const perCoolerAndCase = coolers
        .flatMap((coolerId) =>
          idsOf('case').map((caseId) => 1 + radiatorPositions(coolerId, caseId).length),
        )
        .reduce((a, b) => a + b, 0);
      const { rows } = sweepRows(spec, catalogue);
      expect(rows).toHaveLength(others.map(choices).reduce((a, b) => a * b, 1) * perCoolerAndCase);
    },
  );

  it('puts a real liquid cooler in each position the case takes for its radiator size', () => {
    const spec = ruleSpec('radiator-fit');
    const columns = dumpColumns(spec);
    const { rows } = sweepRows(spec, catalogue);
    const positions = (coolerId: string, caseId: string) =>
      rows
        .filter((row) => {
          const parts = partsOfRow(columns, row);
          return (
            parts.cooler === coolerId &&
            parts.case === caseId &&
            parts['gpu-card'] === null &&
            parts.psu === null
          );
        })
        .map((row) => partsOfRow(columns, row).radiatorPosition);
    // The North takes a 240 mm radiator at the front and the top, and a 360 mm one only at the
    // front; the Pop Air takes no 360 mm radiator; an air cooler has no radiator.
    expect(positions(AIO_240, NORTH)).toEqual([null, 'front', 'top']);
    expect(positions(AIO_360, NORTH)).toEqual([null, 'front']);
    expect(positions(AIO_360, POP_AIR)).toEqual([null]);
    expect(positions(AIR, NORTH)).toEqual([null]);
  });

  it('gives a rule that reads no cooler and no case no radiator position', () => {
    const { rows } = sweepRows(ruleSpec('cpu-socket'), catalogue);
    expect(rows.every((row) => row.length === 2)).toBe(true);
  });
});

describe('sweepRows: drive-lists', () => {
  const spec = ruleSpec('m2-lanes');
  const { rows, complete } = sweepRows(spec, catalogue);
  const drives = idsOf('storage');
  const maxDrives = spec.sweep.kind === 'drive-lists' ? spec.sweep.maxDrives : 0;
  /** C(n+k−1, k) multisets of k drives, for k = 1 to maxDrives. */
  const multisets = Array.from({ length: maxDrives }, (_, i) => i + 1)
    .map((k) => binomial(drives.length + k - 1, k))
    .reduce((a, b) => a + b, 0);

  it('gives every board every multiset of 1 to maxDrives catalogue drives', () => {
    expect(complete).toBe(true);
    expect(maxDrives).toBeGreaterThan(1);
    expect(rows).toHaveLength(idsOf('motherboard').length * multisets);
  });

  it("lists one board's drive lists smallest first, in catalogue order, with repeats", () => {
    const [board] = idsOf('motherboard');
    const lists = rows.filter((row) => row[0] === board).map((row) => row[1]);
    expect(lists).toHaveLength(multisets);
    expect(lists.slice(0, drives.length)).toEqual(drives.map((drive) => [drive]));
    expect(lists[drives.length]).toEqual([drives[0], drives[0]]);
    expect(lists.at(-1)).toEqual(Array.from({ length: maxDrives }, () => drives.at(-1)));
    const keys = lists.map((list) => JSON.stringify(list));
    expect(new Set(keys).size).toBe(keys.length);
    for (const list of lists) {
      const order = (list as readonly string[]).map((drive) => drives.indexOf(drive));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });
});

describe('sweepRows: power-extremes', () => {
  const spec = ruleSpec('psu-wattage');
  const columns = dumpColumns(spec);
  const bases = idsOf('cpu').length * (idsOf('gpu-card').length + 1) * idsOf('psu').length;
  const ENUMERATED = new Set(['cpu', 'gpu-card', 'psu']);
  const others = spec.reads.map((read) => read.category).filter((c) => !ENUMERATED.has(c));

  /** A stand-in for WP-E2's power draws: the first part is the lowest, the last the highest. */
  const extremes: PowerExtremes = (category) => {
    const ids = idsOf(category);
    return { lowest: ids[0] ?? '', highest: ids.at(-1) ?? '' };
  };

  it('without the power draws (WP-E0), gives every CPU, card (and none) and PSU, the rest unpicked', () => {
    const { rows, complete } = sweepRows(spec, catalogue);
    expect(complete).toBe(false);
    expect(rows).toHaveLength(bases);
    for (const row of rows) {
      const parts = partsOfRow(columns, row);
      expect([parts.motherboard, parts.ram, parts.cooler, parts.case, parts['case-fan']]).toEqual([
        null,
        null,
        null,
        null,
        null,
      ]);
      expect(parts.storage).toEqual([]);
    }
    expect(column(columns, rows, 'gpu-card')).toContain(null);
  });

  it('with the power draws, adds every other category at its lowest and then its highest part', () => {
    const { rows, complete } = sweepRows(spec, catalogue, extremes);
    expect(complete).toBe(true);
    expect(rows).toHaveLength(2 * bases);
    const [low, high] = [partsOfRow(columns, rows[0] ?? []), partsOfRow(columns, rows[1] ?? [])];
    for (const category of others) {
      const { lowest, highest } = extremes(category);
      const cell = (parts: BuildParts): DumpCell =>
        category === 'storage'
          ? parts.storage
          : category === 'case-fan'
            ? (parts['case-fan']?.partId ?? null)
            : parts[category];
      expect(cell(low), category).toEqual(category === 'storage' ? [lowest] : lowest);
      expect(cell(high), category).toEqual(category === 'storage' ? [highest] : highest);
    }
    expect(low.cpu).toBe(high.cpu);
    expect(low['case-fan']).toEqual({ partId: extremes('case-fan').lowest, packs: 1 });
  });

  it('rejects power draws that name a part the catalogue does not have', () => {
    const wrong: PowerExtremes = (category) =>
      category === 'ram' ? { lowest: 'no-such-kit', highest: 'no-such-kit' } : extremes(category);
    expect(() => sweepRows(spec, catalogue, wrong)).toThrow(
      new RangeError('The power extremes name no-such-kit, which is not a ram part.'),
    );
  });
});

describe('partsOfRow', () => {
  it('turns a row back into the build it stands for', () => {
    const columns: DumpColumn[] = ['cpu', 'storage', 'case-fan', 'case', 'radiatorPosition'];
    expect(
      partsOfRow(columns, ['cpu-a', ['drive-b', 'drive-b'], 'fan-c', 'case-d', 'top']),
    ).toEqual({
      cpu: 'cpu-a',
      motherboard: null,
      ram: null,
      'gpu-card': null,
      storage: ['drive-b', 'drive-b'],
      psu: null,
      cooler: null,
      case: 'case-d',
      'case-fan': { partId: 'fan-c', packs: 1 },
      radiatorPosition: 'top',
    } satisfies BuildParts);
  });

  it('reads null, an empty drive list and a missing column as not picked', () => {
    const parts = partsOfRow(['cpu', 'storage', 'case-fan', 'radiatorPosition'], [null, [], null]);
    expect(parts).toMatchObject({
      cpu: null,
      storage: [],
      'case-fan': null,
      radiatorPosition: null,
    });
  });
});

/** A stand-in rule: it checks nothing, but writes the build it saw into its reason. */
const echo: RuleEvaluator = (build): RuleResult | RuleNotRun => {
  if (build['gpu-card'] === null) {
    return { ruleId: 'display-output', why: 'needs-parts', needs: ['gpu-card'], reason: 'x.' };
  }
  return {
    ruleId: 'display-output',
    status: 'ok',
    cantVerify: false,
    parts: [{ category: 'gpu-card', partId: build['gpu-card'] }],
    reason: `${build.cpu ?? 'none'} + ${build['gpu-card']}.`,
    action: null,
    steps: null,
    evidence: [],
    layoutId: null,
  };
};

describe('dumpRule', () => {
  it('writes the spec, then the sweep: columns, rows, and a null result for each before WP-E1', () => {
    const spec = ruleSpec('cpu-socket');
    const dump = dumpRule(spec, catalogue);
    const { rows } = sweepRows(spec, catalogue);
    expect(dump).toStrictEqual({
      ...spec,
      implemented: false,
      complete: true,
      combinationCount: rows.length,
      columns: dumpColumns(spec),
      rows,
      results: rows.map(() => null),
    });
  });

  it('puts each result next to the row it was evaluated on', () => {
    const spec = ruleSpec('display-output');
    const seen: BuildParts[] = [];
    const dump = dumpRule(spec, catalogue, {
      evaluate: (build, given) => {
        expect(given).toBe(catalogue);
        seen.push(build);
        return echo(build, given);
      },
    });
    expect(dump.implemented).toBe(true);
    expect(seen).toEqual(dump.rows.map((row) => partsOfRow(dump.columns, row)));
    dump.rows.forEach(([cpu, card], i) => {
      expect(dump.results[i]?.reason).toBe(
        card === null ? 'x.' : `${String(cpu)} + ${String(card)}.`,
      );
    });
  });

  it('passes the power draws to the sweep', () => {
    const extremes: PowerExtremes = (category) => {
      const [first = ''] = idsOf(category);
      return { lowest: first, highest: first };
    };
    const spec = ruleSpec('psu-wattage');
    expect(dumpRule(spec, catalogue).complete).toBe(false);
    const dump = dumpRule(spec, catalogue, { extremes });
    expect(dump.complete).toBe(true);
    expect(dump.combinationCount).toBe(sweepRows(spec, catalogue, extremes).rows.length);
  });

  it('writes plain JSON, the same every run', () => {
    const dumps = RULE_SPECS.map((spec) => dumpRule(spec, catalogue));
    const json = JSON.stringify(dumps);
    expect(JSON.parse(json)).toStrictEqual(dumps);
    expect(JSON.stringify(RULE_SPECS.map((spec) => dumpRule(spec, catalogue)))).toBe(json);
    const implemented = dumpRule(ruleSpec('display-output'), catalogue, { evaluate: echo });
    expect(JSON.parse(JSON.stringify(implemented))).toStrictEqual(implemented);
  });
});

describe('dumpSummary', () => {
  const dumps = [
    dumpRule(ruleSpec('cpu-socket'), catalogue),
    dumpRule(ruleSpec('psu-wattage'), catalogue),
    dumpRule(ruleSpec('display-output'), catalogue, { evaluate: echo }),
  ];
  const summary = dumpSummary(catalogue, dumps);

  it('counts the parts in every catalogue category, in data-lead order', () => {
    expect(Object.keys(summary.parts)).toEqual(SPEC_CATEGORIES);
    for (const category of SPEC_CATEGORIES) {
      expect(summary.parts[category], category).toBe(catalogue.parts[category].length);
    }
  });

  it('counts the price observations and gaps in each market, and the anchors', () => {
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
    expect(summary.anchors).toStrictEqual({
      game: catalogue.gameBenchmarks.length,
      creator: catalogue.creatorBenchmarks.length,
    });
  });

  it('lists each dumped rule: implemented, complete, and its combination count', () => {
    expect(summary.rules).toStrictEqual(
      dumps.map(({ id, implemented, complete, combinationCount }) => ({
        id,
        implemented,
        complete,
        combinationCount,
      })),
    );
    expect(summary.rules.map((rule) => [rule.implemented, rule.complete])).toEqual([
      [false, true],
      [false, false],
      [true, true],
    ]);
  });

  it('carries the spec of all 20 rules, and is plain JSON', () => {
    expect(summary.specs).toBe(RULE_SPECS);
    expect(JSON.parse(JSON.stringify(summary))).toStrictEqual(summary);
  });
});

describe('the engine entry module', () => {
  it('exports the dump', () => {
    expect(engine.dumpColumns).toBe(dumpColumns);
    expect(engine.sweepRows).toBe(sweepRows);
    expect(engine.partsOfRow).toBe(partsOfRow);
    expect(engine.dumpRule).toBe(dumpRule);
    expect(engine.dumpSummary).toBe(dumpSummary);
  });
});
