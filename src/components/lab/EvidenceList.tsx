/**
 * The evidence list (lab-spec §5): every spec a result used, with its value and its sources,
 * next to the sentence (golden rule 1). In the lab it is always open. It sits in a row body that
 * is a size container (`@container`): from 42rem wide the specs, values and sources line up in
 * three columns down the list; narrower, a spec and its value share a line and the sources follow.
 * Phase 2 reuses it unchanged.
 */
import type { SpecEvidence } from '../../engine/types';
import { fieldLabel } from './field-labels';
import { SpecSources, SpecValue } from './SpecValue';
import { valueTone, valueWraps } from './value-style';

export interface EvidenceItem {
  readonly evidence: SpecEvidence;
  /** The maker's own words for the value's condition, when it has one. */
  readonly asPublished?: string | null;
}

export interface EvidenceListProps {
  readonly items: readonly EvidenceItem[];
  /** A publisher's name by its id (`data/publishers.json`). */
  readonly publisherName: (id: string) => string;
}

export function EvidenceList({ items, publisherName }: EvidenceListProps) {
  return (
    <div>
      <p className="mb-1 type-caption text-ink-3">Sources</p>
      <dl className="grid gap-y-2 type-small @2xl:grid-cols-[minmax(0,13rem)_auto_minmax(0,1fr)] @2xl:gap-x-4">
        {items.map(({ evidence, asPublished = null }) => (
          <div
            key={`${evidence.partId} ${evidence.field}`}
            className="flex flex-wrap gap-x-2 @2xl:col-span-3 @2xl:grid @2xl:grid-cols-subgrid"
          >
            <dt className="text-ink-2">{fieldLabel(evidence.category, evidence.field)}</dt>
            <dd
              className={
                valueWraps(evidence)
                  ? valueTone(evidence)
                  : `whitespace-nowrap ${valueTone(evidence)}`
              }
            >
              <SpecValue evidence={evidence} asPublished={asPublished} />
            </dd>
            <dd className="w-full @2xl:w-auto">
              <SpecSources evidence={evidence} publisherName={publisherName} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
