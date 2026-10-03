import { Suspense, use, type ReactNode } from 'react';
import type { Catalogue } from '../../engine/types';
import { ErrorBoundary } from '../ErrorBoundary';
import { loadCatalogue } from './load-catalogue';

/** The catalogue's state, as a lab page draws it. */
export type CatalogueState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | { readonly status: 'ready'; readonly catalogue: Catalogue };

export interface CatalogueGateProps {
  /**
   * Draws the page in each state. The loading and failed pages keep the loaded page's layout, so
   * nothing moves when the catalogue arrives: the picker's selects are there, disabled, and the
   * results area says what is happening (lab-spec §7).
   */
  readonly children: (state: CatalogueState) => ReactNode;
}

/** The part of a lab page that reads the catalogue, through React 19's `use()`. */
export function CatalogueGate({ children }: CatalogueGateProps) {
  return (
    <ErrorBoundary fallback={() => children({ status: 'failed' })}>
      <Suspense fallback={children({ status: 'loading' })}>
        <CatalogueReader>{children}</CatalogueReader>
      </Suspense>
    </ErrorBoundary>
  );
}

function CatalogueReader({ children }: CatalogueGateProps) {
  // loadCatalogue() returns the same promise on every call, as use() needs.
  return children({ status: 'ready', catalogue: use(loadCatalogue()) });
}

/** The results area while the catalogue loads (lab-spec §7). No spinner. */
export function CatalogueLoading() {
  return <p className="type-body text-ink-2">Loading the catalogue.</p>;
}

/** The results area when the catalogue failed to load, with the way out (lab-spec §7). */
export function CatalogueFailed() {
  return (
    <div>
      <p role="alert" className="max-w-measure type-body text-ink-2">
        The catalogue didn’t load, so the lab can’t show results. Reload the page to try again.
      </p>
      <button
        type="button"
        onClick={() => {
          window.location.reload();
        }}
        className="mt-4 min-h-11 rounded-pill border border-ink-3 px-5 type-control text-ink"
      >
        Reload
      </button>
    </div>
  );
}
