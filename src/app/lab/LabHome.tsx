import { useId } from 'react';
import type { Catalogue } from '../../engine/types';
import { AppLink } from '../AppLink';
import { pathOf } from '../routes';
import { summariseCatalogue, type CatalogueSummary } from './catalogue-summary';
import { LAB_PAGE_LABELS, LAB_PAGE_SUMMARIES, LATER_LAB_PAGES } from './lab-pages';
import { CATEGORY_LABELS, MARKET_NAMES } from './lab-text';
import { LabTable, TD, TD_NUMBER, TH, TH_ROW } from './TableRegion';
import { WithCatalogue } from './WithCatalogue';

/** `/lab/`: what each lab page does, then what the catalogue holds. */
export function LabHome() {
  const pagesId = useId();
  const laterId = useId();
  return (
    <>
      <section aria-labelledby={pagesId} className="mt-10 max-w-prose">
        <h2 id={pagesId}>The lab pages</h2>
        <ul role="list" className="mt-3 space-y-4">
          {(['parts', 'accuracy'] as const).map((page) => (
            <li key={page}>
              <AppLink to={pathOf({ name: 'lab', page })} className="type-label">
                {LAB_PAGE_LABELS[page]}
              </AppLink>
              <p className="mt-1 text-ink-2">{LAB_PAGE_SUMMARIES[page]}</p>
            </li>
          ))}
        </ul>
        <h3 id={laterId} className="mt-8">
          Later pages
        </h3>
        <ul role="list" aria-labelledby={laterId} className="mt-3 space-y-4">
          {LATER_LAB_PAGES.map((later) => (
            <li key={later.path}>
              <p className="type-label">
                <code>{later.path}</code>: arrives with {later.arrivesWith}
              </p>
              <p className="mt-1 text-ink-2">{later.summary}</p>
            </li>
          ))}
        </ul>
      </section>
      <WithCatalogue>{(catalogue) => <CatalogueHoldings catalogue={catalogue} />}</WithCatalogue>
    </>
  );
}

function CatalogueHoldings({ catalogue }: { readonly catalogue: Catalogue }) {
  const headingId = useId();
  const summary = summariseCatalogue(catalogue);
  return (
    <section aria-labelledby={headingId} className="mt-12">
      <h2 id={headingId}>What the catalogue holds</h2>
      <p className="mt-2 max-w-prose">
        Data <code>{summary.dataHashShort}</code>: the first 12 hex digits of the SHA-256 of the
        data files this catalogue was built from.
      </p>
      <div className="flex flex-wrap gap-x-16">
        <PartsPerCategory summary={summary} />
        <Anchors summary={summary} />
      </div>
      <PricesPerMarket summary={summary} />
      <Publishers catalogue={catalogue} />
    </section>
  );
}

function PartsPerCategory({ summary }: { readonly summary: CatalogueSummary }) {
  return (
    <LabTable caption="Parts per category" className="min-w-64">
      <thead>
        <tr>
          <th scope="col" className={TH}>
            Category
          </th>
          <th scope="col" className={`${TH} text-right`}>
            Parts
          </th>
        </tr>
      </thead>
      <tbody>
        {summary.parts.map((row) => (
          <tr key={row.category}>
            <th scope="row" className={TH_ROW}>
              {CATEGORY_LABELS[row.category]}
            </th>
            <td className={TD_NUMBER}>{row.count}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" className={TH}>
            Total
          </th>
          <td className={`${TD_NUMBER} font-semibold`}>{summary.partsTotal}</td>
        </tr>
      </tfoot>
    </LabTable>
  );
}

function Anchors({ summary }: { readonly summary: CatalogueSummary }) {
  const rows = [
    ['Game anchors', summary.anchors.game],
    ['Creator anchors', summary.anchors.creator],
  ] as const;
  return (
    <div className="max-w-sm">
      <LabTable caption="Benchmark anchors" className="min-w-64">
        <thead>
          <tr>
            <th scope="col" className={TH}>
              Kind
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Rows
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, count]) => (
            <tr key={label}>
              <th scope="row" className={TH_ROW}>
                {label}
              </th>
              <td className={TD_NUMBER}>{count}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className={TH}>
              Total
            </th>
            <td className={`${TD_NUMBER} font-semibold`}>{summary.anchors.total}</td>
          </tr>
        </tfoot>
      </LabTable>
      <p className="mt-3 type-small text-ink-2">
        Every anchor is listed with its source on the{' '}
        <AppLink to={pathOf({ name: 'lab', page: 'accuracy' })}>Accuracy page</AppLink>. The
        catalogue also lists {summary.games} games and {summary.publishers} publishers.
      </p>
    </div>
  );
}

function PricesPerMarket({ summary }: { readonly summary: CatalogueSummary }) {
  return (
    <div className="mt-4">
      <LabTable caption="Prices per market" className="min-w-xl">
        <thead>
          <tr>
            <th scope="col" className={TH}>
              Market
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Observations
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Gaps
            </th>
            <th scope="col" className={TH}>
              Batch
            </th>
            <th scope="col" className={TH}>
              Window
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.markets.map((row) => (
            <tr key={row.market}>
              <th scope="row" className={TH_ROW}>
                {MARKET_NAMES[row.market]} ({row.currency})
              </th>
              <td className={TD_NUMBER}>{row.observations}</td>
              <td className={TD_NUMBER}>{row.gaps}</td>
              <td className={TD}>
                <code>{row.batchId}</code>
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                {row.windowStart} to {row.windowEnd}
              </td>
            </tr>
          ))}
        </tbody>
      </LabTable>
      <dl className="mt-4 max-w-prose space-y-3 type-small">
        {summary.markets.map((row) => (
          <div key={row.market}>
            <dt className="font-semibold">Price basis in {MARKET_NAMES[row.market]}</dt>
            <dd className="text-ink-2">{row.priceBasis}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 max-w-prose type-small text-ink-2">
        A gap is a part the price batch tried and found no price for. No price is ever converted
        from another currency.
      </p>
    </div>
  );
}

function Publishers({ catalogue }: { readonly catalogue: Catalogue }) {
  return (
    <div className="mt-4">
      <LabTable
        caption={`Publishers (${String(catalogue.publishers.length)})`}
        className="w-full min-w-2xl"
      >
        <thead>
          <tr>
            <th scope="col" className={TH}>
              Publisher
            </th>
            <th scope="col" className={TH}>
              Kind
            </th>
            <th scope="col" className={TH}>
              Domains
            </th>
            <th scope="col" className={TH}>
              Markets
            </th>
            <th scope="col" className={TH}>
              Notes
            </th>
          </tr>
        </thead>
        <tbody>
          {catalogue.publishers.map((publisher) => (
            <tr key={publisher.id}>
              <th scope="row" className={TH_ROW}>
                {publisher.name}
                <code className="mt-1 block text-ink-2">{publisher.id}</code>
              </th>
              <td className={TD}>{publisher.kind}</td>
              <td className={TD}>{publisher.domains.join(', ')}</td>
              <td className={TD}>{publisher.markets?.join(', ') ?? ''}</td>
              <td className={TD}>{publisher.notes ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </LabTable>
    </div>
  );
}
