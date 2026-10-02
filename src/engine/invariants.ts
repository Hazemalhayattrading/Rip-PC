/**
 * The contract's invariants that types can't express (`./types`). Each check returns one
 * sentence per problem, and an empty list when the value is sound. Every rule's tests, the
 * engine dump and QA's sweep run them, so a result that breaks the contract never ships.
 */
import { ruleSpec } from './rules';
import {
  RULE_IDS,
  RULE_STATUSES,
  type CompatReport,
  type PsuRange,
  type RebalancedBuild,
  type RuleId,
  type RuleNotRun,
  type RuleResult,
  type RuleStatus,
} from './types';

/** True for one non-empty sentence that ends with a full stop (copy guide §2, rule 10). */
function isSentence(text: string): boolean {
  return text.trim() === text && text.length > 1 && text.endsWith('.');
}

/** Problems with one rule result (QA's C3 included). */
export function ruleResultProblems(result: RuleResult): string[] {
  const problems: string[] = [];
  const at = `${result.ruleId}:`;
  if (result.parts.length === 0) problems.push(`${at} the result names no part.`);
  if (result.evidence.length === 0) problems.push(`${at} the result has no evidence.`);
  if (!isSentence(result.reason)) {
    problems.push(`${at} the reason must be one sentence that ends with a full stop.`);
  }
  if (result.action !== null && !isSentence(result.action)) {
    problems.push(`${at} the action must be one sentence that ends with a full stop.`);
  }
  if (result.steps !== null) {
    const { title, items, sources } = result.steps;
    if (title.trim() === '' || items.length === 0 || sources.length === 0) {
      problems.push(`${at} steps need a title, at least one item and a source.`);
    }
    if (!items.every(isSentence)) {
      problems.push(`${at} every step must be one sentence that ends with a full stop.`);
    }
  }
  const unpublished = result.evidence.filter((item) => item.availability === 'not-published');
  if (result.status === 'ok' && unpublished.length > 0) {
    const fields = unpublished.map((item) => `${item.partId} ${item.field}`).join(', ');
    problems.push(`${at} ok rests on values that are not published: ${fields}.`);
  }
  if (result.cantVerify && unpublished.length === 0) {
    problems.push(`${at} "can't verify" needs an evidence item that is not published.`);
  }
  return problems;
}

function notRunProblems(entry: RuleNotRun): string[] {
  const at = `${entry.ruleId}:`;
  const problems: string[] = [];
  if (!isSentence(entry.reason)) {
    problems.push(`${at} the reason must be one sentence that ends with a full stop.`);
  }
  if (entry.why === 'needs-parts' && entry.needs.length === 0) {
    problems.push(`${at} "needs-parts" must name the parts to pick.`);
  }
  if (entry.why === 'not-applicable' && entry.needs.length > 0) {
    problems.push(`${at} "not-applicable" names no parts to pick.`);
  }
  return problems;
}

/** True when `ids` follows `RULE_IDS` order. */
function inRuleOrder(ids: readonly RuleId[]): boolean {
  const positions = ids.map((id) => RULE_IDS.indexOf(id));
  return positions.join() === [...positions].sort((a, b) => a - b).join();
}

/** The worst status of a list, or `null` for an empty list. */
export function worstStatus(statuses: readonly RuleStatus[]): RuleStatus | null {
  return statuses.reduce<RuleStatus | null>(
    (worst, status) =>
      worst === null || RULE_STATUSES.indexOf(status) > RULE_STATUSES.indexOf(worst)
        ? status
        : worst,
    null,
  );
}

/**
 * Problems with a whole compatibility report.
 * @param ruleIds the rules the engine implements: each must appear exactly once, in
 *   `results` or in `notRun` (all 20 once WP-E1 is done)
 */
export function compatReportProblems(
  report: CompatReport,
  ruleIds: readonly RuleId[] = RULE_IDS,
): string[] {
  const problems: string[] = [];
  const ran = report.results.map((result) => result.ruleId);
  const skipped = report.notRun.map((entry) => entry.ruleId);
  const named = [...ran, ...skipped];

  for (const id of ruleIds) {
    const count = named.filter((name) => name === id).length;
    if (count !== 1) problems.push(`${id}: the report names it ${String(count)} times, not once.`);
  }
  for (const id of new Set(named)) {
    if (!ruleIds.includes(id))
      problems.push(`${id}: the report names a rule that isn't implemented.`);
  }
  if (!inRuleOrder(ran)) problems.push('The results are not in RULE_IDS order.');
  if (!inRuleOrder(skipped)) problems.push('The rules that did not run are not in RULE_IDS order.');

  const worst = worstStatus(report.results.map((result) => result.status));
  if (report.worst !== worst) {
    problems.push(
      `The report's worst status is ${String(report.worst)}, but its results give ${String(worst)}.`,
    );
  }

  problems.push(
    ...report.results.flatMap(ruleResultProblems),
    ...report.notRun.flatMap(notRunProblems),
  );

  // The layout search (QA's C4): one layout for every layout-dependent rule, and a block when
  // none fits.
  const { layout } = report;
  const checkedUnder = layout === null ? null : layout.fits ? layout.layout.id : layout.closest.id;
  for (const result of report.results) {
    const dependent = ruleSpec(result.ruleId).layoutDependent;
    if (!dependent && result.layoutId !== null) {
      problems.push(`${result.ruleId}: only a layout-dependent rule names a layout.`);
    }
    if (dependent && result.layoutId !== checkedUnder) {
      problems.push(
        `${result.ruleId}: checked under layout ${String(result.layoutId)}, but the report's layout is ${String(checkedUnder)}.`,
      );
    }
  }
  if (layout !== null && !layout.fits) {
    const blocks = report.results.some(
      (result) => ruleSpec(result.ruleId).layoutDependent && result.status === 'block',
    );
    if (!blocks) problems.push('No layout fits, but no layout-dependent rule blocks.');
  }

  for (const slot of report.driveSlots ?? []) {
    if ((slot.slotId === null) !== (slot.label === null)) {
      problems.push(`${slot.partId}: a drive slot has an id and a label, or neither.`);
    }
  }
  if (report.power !== null) problems.push(...psuRangeProblems(report.power.recommended));
  return problems;
}

/** Problems with a recommended power supply range: a range, never one number. */
export function psuRangeProblems(range: PsuRange): string[] {
  const problems: string[] = [];
  const { minW, maxW } = range;
  if (!Number.isFinite(minW) || !Number.isFinite(maxW) || minW <= 0) {
    problems.push('The power supply range needs two positive, finite wattages.');
  } else if (minW >= maxW) {
    problems.push(
      `The power supply range ${String(minW)}–${String(maxW)} W is not a range: its minimum must be below its maximum.`,
    );
  }
  if (!isSentence(range.explanation)) {
    problems.push('The power supply range needs a one-sentence explanation.');
  }
  return problems;
}

/** Problems with a rebalanced build: the price limit (plan §6) and the rules (plan WP-E5). */
export function rebalancedBuildProblems(build: RebalancedBuild): string[] {
  const problems: string[] = [];
  if (!(Math.abs(build.totalDeltaPct) <= 5)) {
    problems.push(
      `The rebalanced build's total is ${String(build.totalDeltaPct)}% from the original; the limit is ±5%.`,
    );
  }
  if (build.changes.length === 0) problems.push('A rebalanced build changes at least one part.');
  for (const warning of build.warnings) {
    if (warning.status !== 'warn') {
      problems.push(
        `${warning.ruleId}: a rebalanced build lists only warnings, not ${warning.status}.`,
      );
    }
  }
  return problems;
}
