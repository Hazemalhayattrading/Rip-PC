/**
 * How a spec's value cell is set (lab-spec §5): its ink, and whether it may wrap. Shared by the
 * evidence list and the parts table.
 */
import type { SpecEvidence } from '../../engine/types';

/** The value's ink: a value the maker withholds is said in the second tier. */
export function valueTone(evidence: SpecEvidence): 'text-ink' | 'text-ink-2' {
  return evidence.availability === 'not-published' ? 'text-ink-2' : 'text-ink';
}

/** Longer than this, a text value is words, as the maker published them, and may wrap. */
const SHORT_TEXT = 24;

/**
 * Whether the value may wrap. A number with its unit, a short name or a yes or no stays on one
 * line (lab-spec §5); a condition, a list or a long text as published is words, and wraps rather
 * than stretch its table past the screen.
 */
export function valueWraps(evidence: SpecEvidence): boolean {
  const { value } = evidence;
  if (value === null) return false;
  if (evidence.condition !== null || Array.isArray(value)) return true;
  return typeof value === 'string' && value.length > SHORT_TEXT;
}
