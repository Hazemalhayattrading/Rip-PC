import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../../scripts/catalogue/catalogue';
import { utcToday } from '../../data/validate';
import * as engine from '../index';
import { compatReportProblems } from '../invariants';
import { ruleSpec } from '../rules';
import {
  RULE_IDS,
  type BuildParts,
  type Catalogue,
  type RuleId,
  type RuleNotRun,
  type RuleResult,
  type SpecEvidence,
} from '../types';
import { COMPAT_RULES, checkCompatibility, type CompatRule, type RuleEvaluator } from './check';

const { catalogue } = buildCatalogue(
  readDataFiles(resolve(import.meta.dirname, '../../..')),
  utcToday(),
);

const BUILD: BuildParts = {
  cpu: 'amd-ryzen-7-9800x3d',
  motherboard: 'asus-tuf-gaming-z890-plus-wifi',
  ram: null,
  'gpu-card': null,
  storage: [],
  psu: null,
  cooler: null,
  case: null,
  'case-fan': null,
  radiatorPosition: null,
};

const published: SpecEvidence = {
  partId: 'amd-ryzen-7-9800x3d',
  category: 'cpu',
  field: 'socket',
  value: 'AM5',
  unit: null,
  availability: 'published',
  condition: null,
  note: null,
  sources: [],
};
const unpublished: SpecEvidence = {
  ...published,
  field: 'unlocked',
  value: null,
  availability: 'not-published',
  note: 'The maker does not say.',
};

/** A stand-in result: every field the contract needs, with the status asked for. */
function result(ruleId: RuleId, status: 'ok' | 'block'): RuleResult;
function result(ruleId: RuleId, status: 'warn', cantVerify: boolean): RuleResult;
function result(ruleId: RuleId, status: RuleResult['status'], cantVerify = false): RuleResult {
  const fields = {
    ruleId,
    parts: [{ category: 'cpu' as const, partId: 'amd-ryzen-7-9800x3d' }],
    reason: `A stand-in reason for ${ruleId}.`,
    action: null,
    steps: null,
    evidence: cantVerify ? [published, unpublished] : [published],
    layoutId: null,
  };
  return status === 'warn'
    ? { ...fields, status, cantVerify }
    : { ...fields, status, cantVerify: false };
}

const notRun = (ruleId: RuleId): RuleNotRun => ({
  ruleId,
  why: 'needs-parts',
  needs: ['case'],
  reason: 'Pick a case to check this.',
});

/** A stand-in rule that always gives `outcome`. */
const rule = (outcome: RuleResult | RuleNotRun): CompatRule => ({
  spec: ruleSpec(outcome.ruleId),
  evaluate: () => outcome,
});

describe('COMPAT_RULES', () => {
  it('holds each implemented rule once, in RULE_IDS order, with its registry spec (WP-E1 fills it)', () => {
    const ids = COMPAT_RULES.map((compatRule) => compatRule.spec.id);
    expect(ids).toEqual(RULE_IDS.filter((id) => ids.includes(id)));
    expect(new Set(ids).size).toBe(ids.length);
    for (const compatRule of COMPAT_RULES) {
      expect(compatRule.spec).toBe(ruleSpec(compatRule.spec.id));
    }
  });
});

describe('checkCompatibility', () => {
  it('with no rules, gives an empty report: no worst status, no layout, no drive slots, no power', () => {
    const report = checkCompatibility(BUILD, catalogue, []);
    expect(report).toStrictEqual({
      results: [],
      notRun: [],
      worst: null,
      layout: null,
      driveSlots: null,
      power: null,
    });
    expect(compatReportProblems(report, [])).toEqual([]);
  });

  it('runs COMPAT_RULES by default', () => {
    const report = checkCompatibility(BUILD, catalogue);
    expect(report.results.length + report.notRun.length).toBe(COMPAT_RULES.length);
    expect(
      compatReportProblems(
        report,
        COMPAT_RULES.map((r) => r.spec.id),
      ),
    ).toEqual([]);
  });

  it('runs every rule, and lists results and rules that did not run in RULE_IDS order', () => {
    const rules = [
      rule(result('display-output', 'block')),
      rule(notRun('gpu-length')),
      rule(result('cpu-socket', 'ok')),
      rule(notRun('cpu-chipset')),
      rule(result('ram-speed', 'warn', false)),
    ];
    const report = checkCompatibility(BUILD, catalogue, rules);
    expect(report.results.map((entry) => entry.ruleId)).toEqual([
      'cpu-socket',
      'ram-speed',
      'display-output',
    ]);
    expect(report.notRun.map((entry) => entry.ruleId)).toEqual(['cpu-chipset', 'gpu-length']);
    expect(report.worst).toBe('block');
    expect(
      compatReportProblems(
        report,
        rules.map((r) => r.spec.id),
      ),
    ).toEqual([]);
  });

  it.each([
    ['ok', [result('cpu-socket', 'ok'), result('ram-type', 'ok')]],
    [
      "warn, from a can't-verify result",
      [result('cpu-socket', 'ok'), result('ram-speed', 'warn', true)],
    ],
    ['block', [result('ram-speed', 'warn', false), result('board-form-factor', 'block')]],
  ] as const)('gives the worst status of the results: %s', (worst, outcomes) => {
    const rules = outcomes.map(rule);
    const report = checkCompatibility(BUILD, catalogue, rules);
    expect(report.worst).toBe(worst.split(',')[0]);
    expect(
      compatReportProblems(
        report,
        rules.map((r) => r.spec.id),
      ),
    ).toEqual([]);
  });

  it('gives no worst status when no rule ran', () => {
    const rules = [rule(notRun('cpu-socket')), rule(notRun('psu-length'))];
    const report = checkCompatibility(BUILD, catalogue, rules);
    expect(report.worst).toBeNull();
    expect(
      compatReportProblems(
        report,
        rules.map((r) => r.spec.id),
      ),
    ).toEqual([]);
  });

  it('passes each rule the build and the catalogue', () => {
    const seen: [BuildParts, Catalogue][] = [];
    const evaluate: RuleEvaluator = (build, given) => {
      seen.push([build, given]);
      return result('cpu-socket', 'ok');
    };
    checkCompatibility(BUILD, catalogue, [{ spec: ruleSpec('cpu-socket'), evaluate }]);
    expect(seen).toEqual([[BUILD, catalogue]]);
    expect(seen[0]?.[1]).toBe(catalogue);
  });

  it('throws when a rule answers for another rule', () => {
    const wrong: CompatRule = { spec: ruleSpec('cpu-socket'), evaluate: () => notRun('ram-type') };
    expect(() => checkCompatibility(BUILD, catalogue, [wrong])).toThrow(
      new Error('The cpu-socket rule answered for ram-type.'),
    );
  });

  it('is exported from the engine entry module', () => {
    expect(engine.checkCompatibility).toBe(checkCompatibility);
    expect(engine.COMPAT_RULES).toBe(COMPAT_RULES);
  });
});
