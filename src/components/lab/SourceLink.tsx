/**
 * The source link (lab-spec §5): the publisher's name and the document's type in English, a link
 * that opens a new tab and says so, then the date in words. Every lab page uses it, and Phase 2's
 * popover reuses it unchanged.
 */
import { Fragment } from 'react';
import { DateTime } from './DateTime';

export interface SourceDate {
  /** "read" for specs and support lists, "published" for reviews, "as of" for prices. */
  readonly verb: 'read' | 'published' | 'as of';
  /** An ISO date, as the data holds it. */
  readonly date: string;
}

export interface SourceLinkProps {
  /** The page the link opens. */
  readonly url: string;
  /** The publisher's name, from `data/publishers.json`. */
  readonly publisher: string;
  /** The document's type in English, plus a manual's page: `documentName()`. */
  readonly document: string;
  /** The dates after the link, in order. None when a table column already gives the date. */
  readonly dates?: readonly SourceDate[];
  /** A snapshot of the page, shown as a second link, "archived copy". */
  readonly archiveUrl?: string | undefined;
}

/**
 * Said in words for screen readers, and shown by the 14 px arrow, whose colour sits on its wrapper
 * so it follows forced colours (lab-spec §3).
 */
function OpensInNewTab() {
  return (
    <>
      <span className="sr-only"> (opens in a new tab)</span>
      <span className="ml-0.5 inline-block align-[-0.125em] text-ink-3" aria-hidden="true">
        <svg
          className="size-3.5"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7.5 4.5h6v6" />
          <path d="M13.5 4.5l-9 9" />
        </svg>
      </span>
    </>
  );
}

/**
 * Each date phrase is one unbreakable piece, so a date never breaks across lines; a line may break
 * between two phrases ("published 6 May 2026," / "read 30 Sep 2026").
 */
function Dates({ dates }: { readonly dates: readonly SourceDate[] }) {
  return dates.map((entry, index) => (
    <Fragment key={`${entry.verb} ${entry.date}`}>
      {index === 0 ? null : ' '}
      <span className="whitespace-nowrap text-ink-3">
        {index === 0 ? ', ' : ''}
        {entry.verb} <DateTime value={entry.date} />
        {index < dates.length - 1 ? ',' : ''}
      </span>
    </Fragment>
  ));
}

export function SourceLink({ url, publisher, document, dates = [], archiveUrl }: SourceLinkProps) {
  return (
    <>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-ink-2">
        <span translate="no">{publisher}</span>, {document}
        <OpensInNewTab />
      </a>
      <Dates dates={dates} />
      {archiveUrl === undefined ? null : (
        <>
          <span className="text-ink-3">, </span>
          <a href={archiveUrl} target="_blank" rel="noopener noreferrer" className="text-ink-2">
            archived copy
            <OpensInNewTab />
          </a>
        </>
      )}
    </>
  );
}
