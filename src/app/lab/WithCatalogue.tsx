import { Suspense, use, type ReactNode } from 'react';
import type { Catalogue } from '../../engine/types';
import { ErrorBoundary } from '../ErrorBoundary';
import { catalogueFailure } from './lab-text';
import { loadCatalogue } from './load-catalogue';

export interface WithCatalogueProps {
  /** The part of the page that reads the catalogue. */
  readonly children: (catalogue: Catalogue) => ReactNode;
}

/**
 * The part of a lab page that needs the catalogue. Its box holds at least a screen's height while
 * the catalogue loads and after, so the footer never jumps into view and back (no layout shift).
 * The box is a flow root, so its first child's top margin stays inside it: otherwise the margin
 * would collapse through, and the box would move when the loading line (`mt-8`) gives way to
 * content with a different margin (measured: 8 px, CLS 0.003 on a slow network).
 * If the catalogue can't be loaded, it says what failed and offers to try again: the loader
 * doesn't keep a failed attempt, so a second try fetches afresh.
 */
export function WithCatalogue({ children }: WithCatalogueProps) {
  return (
    <div className="flow-root min-h-screen">
      <ErrorBoundary fallback={(error, retry) => <CatalogueFailed error={error} retry={retry} />}>
        <Suspense fallback={<p className="mt-8 text-ink-2">Loading the catalogue…</p>}>
          <CatalogueReader>{children}</CatalogueReader>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function CatalogueReader({ children }: WithCatalogueProps) {
  // loadCatalogue() returns the same promise on every call, as use() needs.
  return children(use(loadCatalogue()));
}

function CatalogueFailed({
  error,
  retry,
}: {
  readonly error: unknown;
  readonly retry: () => void;
}) {
  return (
    <div className="mt-8 max-w-prose">
      <p role="alert">{catalogueFailure(error)}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-3 min-h-6 rounded-pill border border-ink-3 px-4 py-1 type-control"
      >
        Try again
      </button>
    </div>
  );
}
