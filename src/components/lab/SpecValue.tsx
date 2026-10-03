/**
 * One spec's value and its sources, as the evidence list and the parts table show them
 * (lab-spec §5): the value exactly as stored with its unit, a limit's condition and the maker's
 * own words, "None" or "Not published", then every source and the data's note.
 */
import type { SpecEvidence } from '../../engine/types';
import { DateTime } from './DateTime';
import { valueText } from './format';
import { SourceLink } from './SourceLink';
import { documentName } from './source-text';

const NBSP = '\u00A0';

const PUBLISHED_DATE = /^\d{4}(-\d{2}(-\d{2})?|-Q[1-4])?$/;

/** A field that holds a date, such as `launchDate`, is written as a date ("23 Jan 2025"). */
function isDate(evidence: SpecEvidence): boolean {
  const name = evidence.field.slice(evidence.field.lastIndexOf('.') + 1);
  return (
    name.endsWith('Date') &&
    typeof evidence.value === 'string' &&
    PUBLISHED_DATE.test(evidence.value)
  );
}

export interface SpecValueProps {
  readonly evidence: SpecEvidence;
  /** The maker's own words for the value's condition (`conditionAsPublished`), when it has one. */
  readonly asPublished?: string | null;
}

export function SpecValue({ evidence, asPublished = null }: SpecValueProps) {
  const { value, unit, condition } = evidence;
  if (value === null) return evidence.availability === 'none' ? 'None' : 'Not published';
  if (typeof value === 'boolean') return valueText(value);
  if (isDate(evidence) && typeof value === 'string') return <DateTime value={value} />;
  const text = unit === null ? valueText(value) : `${valueText(value)}${NBSP}${unit}`;
  return (
    <>
      <span translate="no">{text}</span>
      {condition === null ? null : ` ${condition}`}
      {asPublished === null ? null : (
        <span className="block type-caption text-ink-3">“{asPublished}”</span>
      )}
    </>
  );
}

export interface SpecSourcesProps {
  readonly evidence: SpecEvidence;
  /**
   * The note to show under the sources, when the caller places notes itself (the parts table
   * shows a group's note once, on the group's row). Defaults to the evidence's note.
   */
  readonly note?: string | null;
  /** A publisher's name by its id (`data/publishers.json`). */
  readonly publisherName: (id: string) => string;
}

/** Each source on its own line, read on its date, then the data's note: the reason, if withheld. */
export function SpecSources({ evidence, note = evidence.note, publisherName }: SpecSourcesProps) {
  return (
    <>
      {evidence.sources.map((source) => (
        <span key={source.url} className="block">
          <SourceLink
            url={source.url}
            publisher={publisherName(source.publisher)}
            document={documentName(source)}
            dates={[{ verb: 'read', date: source.retrievedAt }]}
            archiveUrl={source.archiveUrl}
          />
        </span>
      ))}
      {note === null ? null : <span className="block type-caption text-ink-3">{note}</span>}
    </>
  );
}
