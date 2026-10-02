import { describe, expect, it } from 'vitest';
import {
  compatReportProblems,
  psuRangeProblems,
  rebalancedBuildProblems,
  ruleResultProblems,
  worstStatus,
} from './invariants';
import type {
  CaseLayout,
  CompatReport,
  PowerEstimate,
  RebalancedBuild,
  RuleId,
  RuleNotRun,
  RuleResult,
  SpecEvidence,
} from './types';

const SOURCE = {
  url: 'https://www.fractal-design.com/products/cases/north/north/charcoal-black-tg-light/',
  publisher: 'fractal-design',
  retrievedAt: '2026-09-30',
  docType: 'spec-page',
} as const;

function evidence(over: Partial<SpecEvidence> = {}): SpecEvidence {
  return {
    partId: 'fractal-north-charcoal-black-tg-light',
    category: 'case',
    field: 'gpuClearance.0.maxLengthMm',
    value: 355,
    unit: 'mm',
    availability: 'published',
    condition: null,
    note: null,
    sources: [SOURCE],
    ...over,
  };
}

const UNPUBLISHED = evidence({
  partId: 'deepcool-an400',
  category: 'cooler',
  field: 'ramClearanceMm',
  value: null,
  unit: 'mm',
  availability: 'not-published',
  note: 'DeepCool does not publish the RAM clearance.',
  sources: [],
});

function result(ruleId: RuleId, over: Partial<RuleResult> = {}): RuleResult {
  return {
    ruleId,
    status: 'ok',
    cantVerify: false,
    parts: [{ category: 'case', partId: 'fractal-north-charcoal-black-tg-light' }],
    reason: 'The card is 320 mm long, and the case takes cards up to 355 mm.',
    action: null,
    steps: null,
    evidence: [evidence()],
    layoutId: null,
    ...over,
  } as RuleResult;
}

const LAYOUT_A: CaseLayout = { id: 'trays-a', description: 'One HDD tray at A.', evidence: [] };
const LAYOUT_B: CaseLayout = { id: 'trays-b', description: 'Two HDD trays.', evidence: [] };

function report(over: Partial<CompatReport> = {}): CompatReport {
  return {
    results: [],
    notRun: [],
    worst: null,
    layout: null,
    driveSlots: null,
    power: null,
    ...over,
  };
}

const notRun = (ruleId: RuleId, over: Partial<RuleNotRun> = {}): RuleNotRun => ({
  ruleId,
  why: 'needs-parts',
  needs: ['case'],
  reason: "Pick a case to check the card's length.",
  ...over,
});

describe('ruleResultProblems', () => {
  it('passes a sound result', () => {
    expect(ruleResultProblems(result('gpu-length'))).toEqual([]);
  });

  it('rejects an ok that rests on an unpublished value (QA C3)', () => {
    expect(ruleResultProblems(result('ram-cooler-clearance', { evidence: [UNPUBLISHED] }))).toEqual(
      [
        'ram-cooler-clearance: ok rests on values that are not published: deepcool-an400 ramClearanceMm.',
      ],
    );
  });

  it('accepts "can\'t verify" with an unpublished value, and rejects it without one', () => {
    const cantVerify = { status: 'warn', cantVerify: true } as const;
    expect(
      ruleResultProblems(
        result('ram-cooler-clearance', { ...cantVerify, evidence: [UNPUBLISHED] }),
      ),
    ).toEqual([]);
    expect(ruleResultProblems(result('ram-cooler-clearance', cantVerify))).toEqual([
      'ram-cooler-clearance: "can\'t verify" needs an evidence item that is not published.',
    ]);
  });

  it('rejects a result with no parts, no evidence, or sentences without a full stop', () => {
    expect(
      ruleResultProblems(
        result('cpu-socket', { parts: [], evidence: [], reason: 'No stop', action: ' Ask.' }),
      ),
    ).toEqual([
      'cpu-socket: the result names no part.',
      'cpu-socket: the result has no evidence.',
      'cpu-socket: the reason must be one sentence that ends with a full stop.',
      'cpu-socket: the action must be one sentence that ends with a full stop.',
    ]);
  });

  it('checks the steps of a procedure: title, items, source, full stops', () => {
    const steps = { title: 'Update the BIOS', items: ['Download the BIOS.'], sources: [SOURCE] };
    expect(ruleResultProblems(result('bios-version', { steps }))).toEqual([]);
    expect(
      ruleResultProblems(result('bios-version', { steps: { ...steps, title: ' ', sources: [] } })),
    ).toEqual(['bios-version: steps need a title, at least one item and a source.']);
    expect(
      ruleResultProblems(result('bios-version', { steps: { ...steps, items: ['Download it'] } })),
    ).toEqual(['bios-version: every step must be one sentence that ends with a full stop.']);
  });
});

describe('worstStatus', () => {
  it('gives block over warn over ok, and null for nothing', () => {
    expect(worstStatus([])).toBeNull();
    expect(worstStatus(['ok', 'ok'])).toBe('ok');
    expect(worstStatus(['ok', 'warn', 'ok'])).toBe('warn');
    expect(worstStatus(['warn', 'block', 'ok'])).toBe('block');
  });
});

describe('compatReportProblems', () => {
  it('passes the empty report of an engine with no rules yet (WP-E0)', () => {
    expect(compatReportProblems(report(), [])).toEqual([]);
  });

  it('passes a sound report that names every implemented rule once, in order', () => {
    const sound = report({
      results: [result('cpu-socket'), result('ram-type', { status: 'block' })],
      notRun: [notRun('gpu-power-connector', { needs: ['gpu-card'], reason: 'Pick a card.' })],
      worst: 'block',
    });
    expect(compatReportProblems(sound, ['cpu-socket', 'ram-type', 'gpu-power-connector'])).toEqual(
      [],
    );
  });

  it('rejects a rule named twice, a rule left out and a rule that is not implemented', () => {
    const twice = report({
      results: [result('cpu-socket')],
      notRun: [notRun('cpu-socket'), notRun('display-output')],
      worst: 'ok',
    });
    expect(compatReportProblems(twice, ['cpu-socket', 'ram-type'])).toEqual([
      'cpu-socket: the report names it 2 times, not once.',
      'ram-type: the report names it 0 times, not once.',
      "display-output: the report names a rule that isn't implemented.",
    ]);
  });

  it('checks all 20 rules by default', () => {
    expect(compatReportProblems(report())).toHaveLength(20);
  });

  it('rejects results or skipped rules out of RULE_IDS order', () => {
    const shuffled = report({
      results: [result('ram-type'), result('cpu-socket')],
      notRun: [notRun('display-output'), notRun('gpu-length')],
      worst: 'ok',
    });
    expect(
      compatReportProblems(shuffled, ['cpu-socket', 'ram-type', 'gpu-length', 'display-output']),
    ).toEqual([
      'The results are not in RULE_IDS order.',
      'The rules that did not run are not in RULE_IDS order.',
    ]);
  });

  it('rejects a worst status that its results do not give', () => {
    expect(
      compatReportProblems(report({ results: [result('cpu-socket')], worst: 'warn' }), [
        'cpu-socket',
      ]),
    ).toEqual(["The report's worst status is warn, but its results give ok."]);
  });

  it('checks every result and every rule that did not run', () => {
    const bad = report({
      results: [result('cpu-socket', { reason: '' })],
      notRun: [
        notRun('ram-type', { needs: [] }),
        notRun('display-output', { why: 'not-applicable', needs: ['gpu-card'], reason: 'x' }),
      ],
      worst: 'ok',
    });
    expect(compatReportProblems(bad, ['cpu-socket', 'ram-type', 'display-output'])).toEqual([
      'cpu-socket: the reason must be one sentence that ends with a full stop.',
      'ram-type: "needs-parts" must name the parts to pick.',
      'display-output: the reason must be one sentence that ends with a full stop.',
      'display-output: "not-applicable" names no parts to pick.',
    ]);
  });

  describe('the layout search (QA C4)', () => {
    const fits = { fits: true, layout: LAYOUT_A, alsoFits: 1 } as const;
    const fitsNot = {
      fits: false,
      reason: 'No drive tray layout fits both the power supply and the radiator.',
      closest: LAYOUT_B,
      tried: [LAYOUT_A, LAYOUT_B],
    } as const;

    it('passes layout-dependent results checked under the layout that fits', () => {
      const sound = report({
        results: [
          result('gpu-length', { layoutId: 'trays-a' }),
          result('psu-length', { layoutId: 'trays-a' }),
        ],
        worst: 'ok',
        layout: fits,
      });
      expect(compatReportProblems(sound, ['gpu-length', 'psu-length'])).toEqual([]);
    });

    it('rejects a layout-dependent result checked under another layout, or none', () => {
      const split = report({
        results: [result('gpu-length', { layoutId: 'trays-b' }), result('psu-length')],
        worst: 'ok',
        layout: fits,
      });
      expect(compatReportProblems(split, ['gpu-length', 'psu-length'])).toEqual([
        "gpu-length: checked under layout trays-b, but the report's layout is trays-a.",
        "psu-length: checked under layout null, but the report's layout is trays-a.",
      ]);
    });

    it('rejects a layout on a rule that is not layout-dependent', () => {
      const wrong = report({
        results: [result('cpu-socket', { layoutId: 'trays-a' })],
        worst: 'ok',
        layout: fits,
      });
      expect(compatReportProblems(wrong, ['cpu-socket'])).toEqual([
        'cpu-socket: only a layout-dependent rule names a layout.',
      ]);
    });

    it('needs a block when no layout fits, under the closest layout', () => {
      const blocked = report({
        results: [
          result('gpu-length', { layoutId: 'trays-b' }),
          result('psu-length', { status: 'block', layoutId: 'trays-b' }),
        ],
        worst: 'block',
        layout: fitsNot,
      });
      expect(compatReportProblems(blocked, ['gpu-length', 'psu-length'])).toEqual([]);

      const falseNegative = report({
        results: [
          result('gpu-length', { layoutId: 'trays-b' }),
          result('psu-length', { layoutId: 'trays-b' }),
        ],
        worst: 'ok',
        layout: fitsNot,
      });
      expect(compatReportProblems(falseNegative, ['gpu-length', 'psu-length'])).toEqual([
        'No layout fits, but no layout-dependent rule blocks.',
      ]);
    });
  });

  it('checks the drive slots and the power range', () => {
    const power = {
      recommended: { minW: 850, maxW: 850, explanation: 'Too narrow.' },
    } as PowerEstimate;
    const odd = report({
      driveSlots: [
        { partId: 'samsung-990-pro-2tb', slotId: 'm2-1', label: 'M.2_1' },
        { partId: 'samsung-990-pro-2tb', slotId: null, label: 'M.2_2' },
      ],
      power,
    });
    expect(compatReportProblems(odd, [])).toEqual([
      'samsung-990-pro-2tb: a drive slot has an id and a label, or neither.',
      'The power supply range 850–850 W is not a range: its minimum must be below its maximum.',
    ]);
  });
});

describe('psuRangeProblems', () => {
  it('passes a range with an explanation', () => {
    expect(
      psuRangeProblems({ minW: 750, maxW: 850, explanation: 'Worst case plus headroom.' }),
    ).toEqual([]);
  });

  it.each([
    [0, 850],
    [Number.NaN, 850],
    [750, Number.POSITIVE_INFINITY],
  ])('rejects the wattages %s and %s', (minW, maxW) => {
    expect(psuRangeProblems({ minW, maxW, explanation: 'Worst case plus headroom.' })).toEqual([
      'The power supply range needs two positive, finite wattages.',
    ]);
  });

  it('rejects one number dressed as a range, and a missing explanation', () => {
    expect(psuRangeProblems({ minW: 900, maxW: 850, explanation: '' })).toEqual([
      'The power supply range 900–850 W is not a range: its minimum must be below its maximum.',
      'The power supply range needs a one-sentence explanation.',
    ]);
  });
});

describe('rebalancedBuildProblems', () => {
  const build = {
    changes: [{ category: 'gpu-card', from: 'a', to: 'b' }],
    totalDeltaPct: -5,
    warnings: [result('ram-speed', { status: 'warn', cantVerify: false })],
  } as unknown as RebalancedBuild;

  it('passes a build within 5% either way that only warns', () => {
    expect(rebalancedBuildProblems(build)).toEqual([]);
    expect(rebalancedBuildProblems({ ...build, totalDeltaPct: 5 })).toEqual([]);
  });

  it('rejects a total over 5% away, no change, and a listed result that is not a warning', () => {
    expect(
      rebalancedBuildProblems({
        ...build,
        totalDeltaPct: 5.1,
        changes: [],
        warnings: [result('cpu-socket', { status: 'block' })],
      }),
    ).toEqual([
      "The rebalanced build's total is 5.1% from the original; the limit is ±5%.",
      'A rebalanced build changes at least one part.',
      'cpu-socket: a rebalanced build lists only warnings, not block.',
    ]);
    expect(rebalancedBuildProblems({ ...build, totalDeltaPct: Number.NaN })).toHaveLength(1);
  });
});
