/**
 * The compatibility check (BUILD_PROMPT §5.1, plan WP-E1): every rule's verdict on one build,
 * gathered into one report. Each rule is a pure function of the build and the catalogue.
 *
 * WP-E1 fills `COMPAT_RULES`, in `RULE_IDS` order. The layout search, the drive slots and the
 * power estimate stay `null` until WP-E1 and WP-E2 add them.
 */
import { worstStatus } from '../invariants';
import {
  RULE_IDS,
  type BuildParts,
  type Catalogue,
  type CompatReport,
  type RuleNotRun,
  type RuleResult,
  type RuleSpec,
} from '../types';

/** A rule's evaluate function: its verdict on a build, or why it did not run. */
export type RuleEvaluator = (build: BuildParts, catalogue: Catalogue) => RuleResult | RuleNotRun;

/** One implemented rule: its registry spec (`RULE_SPECS`) and its evaluate function. */
export interface CompatRule {
  readonly spec: RuleSpec;
  readonly evaluate: RuleEvaluator;
}

/** The implemented rules, in `RULE_IDS` order. Empty until WP-E1. */
export const COMPAT_RULES: readonly CompatRule[] = [];

const ruleOrder = (rule: CompatRule): number => RULE_IDS.indexOf(rule.spec.id);

/**
 * Runs every rule on the build: results and rules that did not run, both in `RULE_IDS` order,
 * and the worst status of the results.
 * @param rules the rules to run; defaults to every implemented rule
 * @throws {Error} when a rule answers for another rule, which is a bug in that rule
 */
export function checkCompatibility(
  build: BuildParts,
  catalogue: Catalogue,
  rules: readonly CompatRule[] = COMPAT_RULES,
): CompatReport {
  const outcomes = [...rules]
    .sort((a, b) => ruleOrder(a) - ruleOrder(b))
    .map((rule) => {
      const outcome = rule.evaluate(build, catalogue);
      if (outcome.ruleId !== rule.spec.id) {
        throw new Error(`The ${rule.spec.id} rule answered for ${outcome.ruleId}.`);
      }
      return outcome;
    });
  const results = outcomes.filter((outcome): outcome is RuleResult => 'status' in outcome);
  const notRun = outcomes.filter((outcome): outcome is RuleNotRun => !('status' in outcome));
  return {
    results,
    notRun,
    worst: worstStatus(results.map((result) => result.status)),
    layout: null,
    driveSlots: null,
    power: null,
  };
}
