import type { SourceRef } from '../../data/schema';
import type { Catalogue } from '../../engine/types';
import { docTypeLabel } from './lab-text';
import { publisherName } from './parts-model';

export interface SourceRefsProps {
  readonly catalogue: Catalogue;
  readonly sources: readonly SourceRef[];
}

/**
 * The sources behind one value or one row. Each names its publisher, links to the page, gives the
 * date it was read, and, when the source has them, its archived copy, its title and where in the
 * document the value is.
 */
export function SourceRefs({ catalogue, sources }: SourceRefsProps) {
  if (sources.length === 0) return <span className="text-ink-2">No source</span>;
  return (
    <ul role="list" className="space-y-2">
      {sources.map((source, index) => (
        <li key={`${String(index)} ${source.url}`}>
          {publisherName(catalogue, source.publisher)}:{' '}
          <a href={source.url}>{source.title ?? docTypeLabel(source.docType)}</a>
          <span className="block text-ink-2">
            Retrieved {source.retrievedAt}
            {source.archiveUrl === undefined ? null : (
              <>
                {' · '}
                <a href={source.archiveUrl}>archived copy</a>
              </>
            )}
          </span>
          {source.locator === undefined ? null : (
            <span className="block text-ink-2">{source.locator}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
