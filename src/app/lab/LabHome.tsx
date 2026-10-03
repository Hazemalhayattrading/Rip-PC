import { useId } from 'react';
import { DateTime } from '../../components/lab/DateTime';
import { formatNumber } from '../../components/lab/format';
import type { Catalogue } from '../../engine/types';
import { AppLink } from '../AppLink';
import { LAB_PAGES, pathOf } from '../routes';
import { CatalogueFailed, CatalogueGate, CatalogueLoading } from './CatalogueGate';
import {
  anchorsBreakdown,
  gapsBreakdown,
  partsBreakdown,
  priceWindow,
  pricesBreakdown,
  summariseCatalogue,
} from './catalogue-summary';
import { LAB_PAGE_LABELS, LAB_PAGE_SENTENCES } from './lab-pages';

const PANEL = 'rounded-panel border border-line bg-surface p-5';

/**
 * `/lab/` (lab-spec §8): the lab's other pages, each a link with its sentence, and the
 * catalogue's counts as a `<dl>`, read from the loaded catalogue, never typed in.
 */
export function LabHome() {
  const pagesId = useId();
  const catalogueId = useId();
  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <section aria-labelledby={pagesId} className={PANEL}>
        <h2 id={pagesId}>Pages</h2>
        <ul role="list" className="mt-4 space-y-4">
          {LAB_PAGES.filter((page) => page !== 'index').map((page) => (
            <li key={page}>
              <AppLink
                to={pathOf({ name: 'lab', page })}
                className="inline-flex min-h-6 items-center type-label text-ink pointer-coarse:min-h-11"
              >
                {LAB_PAGE_LABELS[page]}
              </AppLink>
              <p className="max-w-measure type-body text-ink-2">{LAB_PAGE_SENTENCES[page]}</p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby={catalogueId} className={PANEL}>
        <h2 id={catalogueId}>Catalogue</h2>
        <div className="mt-4">
          <CatalogueGate>
            {(state) =>
              state.status === 'ready' ? (
                <CatalogueCounts catalogue={state.catalogue} />
              ) : state.status === 'loading' ? (
                <CatalogueLoading />
              ) : (
                <CatalogueFailed />
              )
            }
          </CatalogueGate>
        </div>
      </section>
    </div>
  );
}

function CatalogueCounts({ catalogue }: { readonly catalogue: Catalogue }) {
  const summary = summariseCatalogue(catalogue);
  const observations = summary.markets.reduce((sum, row) => sum + row.observations, 0);
  const window = priceWindow(summary);
  const gaps = gapsBreakdown(summary);
  return (
    <>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-4">
        <dt className="type-small text-ink-2">Parts</dt>
        <dd>
          <span className="type-name text-ink">{formatNumber(summary.partsTotal)}</span>
          <span className="block max-w-measure type-small text-ink-2">
            {partsBreakdown(summary)}.
          </span>
        </dd>
        <dt className="type-small text-ink-2">Prices</dt>
        <dd>
          <span className="type-name text-ink">{formatNumber(observations)}</span>
          <span className="block max-w-measure type-small text-ink-2">
            {pricesBreakdown(summary)},{' '}
            {window.start === window.end ? (
              <>
                observed on <DateTime value={window.start} />.
              </>
            ) : (
              <>
                observed between <DateTime value={window.start} /> and{' '}
                <DateTime value={window.end} />.
              </>
            )}
            {gaps === null ? null : ` No price found for ${gaps}.`}
          </span>
        </dd>
        <dt className="type-small text-ink-2">Benchmark anchors</dt>
        <dd>
          <span className="type-name text-ink">{formatNumber(summary.anchors.total)}</span>
          <span className="block max-w-measure type-small text-ink-2">
            {anchorsBreakdown(summary)}.
          </span>
        </dd>
      </dl>
      <p className="mt-4 type-caption text-ink-3">
        Catalogue data <span translate="no">{summary.dataHashShort}</span>, the start of its
        SHA-256.
      </p>
    </>
  );
}
