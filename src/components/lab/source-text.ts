/**
 * The words of a source link (lab-spec §5, copy guide §12): the document's type in English, plus
 * a manual's page. Never the source's own title: some titles are German (ComputerBase), and
 * showing one would need `lang` on it (WCAG 3.1.2).
 */
import type { DocType, SourceRef } from '../../data/schema';

/** Copy guide §12's document names. The last four name the games list's sources. */
const DOCUMENT_NAMES: Readonly<Record<DocType, string>> = {
  'spec-page': 'spec page',
  'product-page': 'product page',
  manual: 'user manual',
  datasheet: 'datasheet',
  'cpu-support-list': 'CPU support list',
  'bios-release-notes': 'BIOS release notes',
  'support-article': 'support article',
  'press-release': 'press release',
  review: 'review',
  'benchmark-database': 'benchmark results',
  'tracker-page': 'tracker page',
  'store-page': 'store page',
  'news-article': 'news article',
  'api-response': 'API response',
};

/**
 * "spec page", "user manual, p. vii, Storage". A manual's page comes from where the source says
 * the values are (`locator`), as data-lead wrote it: the data holds no page number of its own,
 * and makers number pages "1-8", so the text isn't parsed.
 */
export function documentName(source: Pick<SourceRef, 'docType' | 'locator' | 'title'>): string {
  const name = DOCUMENT_NAMES[source.docType];
  return source.docType === 'manual' && source.locator !== undefined
    ? `${name}, ${source.locator}`
    : name;
}
