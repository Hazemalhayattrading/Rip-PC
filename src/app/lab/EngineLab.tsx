/**
 * The Engine lab: the whole frame of a lab page (lab-spec §1). `App.tsx` loads this module with
 * `React.lazy` and draws nothing until it arrives, so the frame appears at once and nothing moves
 * (CLS 0), and no lab UI, engine helper or catalogue loader reaches the product pages' initial JS
 * (plan §1).
 *
 * One `<main>` and one `<h1>` per page (QA's smoke test). `<main>` holds at least a screen's height,
 * so the footer starts below the fold and nothing it holds moves when the catalogue arrives.
 */
import type { MouseEvent } from 'react';
import { useBuild } from '../build-hooks';
import { metaOf, type LabPage } from '../routes';
import { LabAccuracy } from './LabAccuracy';
import { LabHeader } from './LabHeader';
import { LabHome } from './LabHome';
import { LAB_PAGE_SENTENCES } from './lab-pages';
import { LabParts } from './LabParts';

export default function EngineLab({ page }: { readonly page: LabPage }) {
  const meta = metaOf({ name: 'lab', page });
  return (
    <>
      <SkipLink />
      <LabHeader current={page} />
      <main
        id="main"
        tabIndex={-1}
        className="min-h-screen px-inset pt-6 pb-16 focus-visible:outline-none"
      >
        <DecodeNotice />
        <h1 tabIndex={-1}>{meta.heading}</h1>
        <p className="mt-2 max-w-measure type-body text-ink-2">{LAB_PAGE_SENTENCES[page]}</p>
        <div className="mt-8">
          <LabPageBody page={page} />
        </div>
      </main>
      <footer className="px-inset pb-8">
        <p className="max-w-measure type-small text-ink-3">
          These pages show the catalogue and the engine for review. They are not part of the
          builder.
        </p>
      </footer>
    </>
  );
}

/**
 * The first focusable element: visible only while it has focus. It moves focus to `<main>`
 * without adding `#main` to the address, which is the share link (components.md §5).
 */
function SkipLink() {
  function skip(event: MouseEvent<HTMLAnchorElement>): void {
    const main = document.getElementById('main');
    if (main === null) return;
    event.preventDefault();
    main.focus();
  }
  return (
    <a
      href="#main"
      onClick={skip}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-toast focus:rounded-pill focus:bg-surface focus:px-4 focus:py-2 focus:type-control"
    >
      Skip to main content
    </a>
  );
}

/** The codec's notice for a build the link holds but can't be read: there from the first frame. */
function DecodeNotice() {
  const decodeError = useBuild((state) => state.decodeError);
  return decodeError === null ? null : (
    <p role="status" className="mb-4 max-w-measure type-body text-ink">
      The build in this link could not be read, so you are starting with an empty build.
    </p>
  );
}

function LabPageBody({ page }: { readonly page: LabPage }) {
  switch (page) {
    case 'index':
      return <LabHome />;
    case 'parts':
      return <LabParts />;
    case 'accuracy':
      return <LabAccuracy />;
  }
}
