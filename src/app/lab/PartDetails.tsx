import { useId, useMemo } from 'react';
import type { PriceGap, PriceObservation, SpecRecord } from '../../data/schema';
import { UNSOURCED_FIELDS, specLeaves, valueAt } from '../../engine/evidence';
import type { Catalogue, SpecEvidence } from '../../engine/types';
import { DotPath } from './DotPath';
import { partAnchorId } from './lab-links';
import {
  CATEGORY_LABELS,
  MARKET_NAMES,
  docTypeLabel,
  formatAmount,
  formatSpecValue,
  partLabel,
} from './lab-text';
import { NoteList } from './NoteList';
import { nullMeansNone } from './null-means-none';
import {
  findRecord,
  pricesOf,
  publisherName,
  type MarketPrices,
  type PartSection,
} from './parts-model';
import { SourceRefs } from './SourceRefs';
import { LabTable, TD, TH, TH_ROW } from './TableRegion';

export interface PartDetailsProps {
  readonly catalogue: Catalogue;
  readonly section: PartSection & { readonly record: SpecRecord };
}

const VIA: Readonly<Record<PartSection['via'], string>> = {
  build: 'Picked in this build.',
  card: 'The GPU chip of the picked graphics card.',
  link: 'The GPU chip picked on its own.',
};

/**
 * Everything the catalogue holds about one part (plan WP-E0, "every catalogue field"): its
 * identity, every spec with its unit, status and sources, the fields that have no source of their
 * own, its notes word for word, all its sources, and its prices in each market.
 */
export function PartDetails({ catalogue, section }: PartDetailsProps) {
  const { record } = section;
  const headingId = useId();
  const label = partLabel(record);
  return (
    <section
      id={partAnchorId(record.category, record.id)}
      aria-labelledby={headingId}
      className="mt-12 border-t border-line pt-6"
    >
      <h2 id={headingId}>{record.category === 'gpu-chip' ? `GPU chip: ${label}` : label}</h2>
      <p className="mt-1 type-small text-ink-2">{VIA[section.via]}</p>
      <PartIdentity catalogue={catalogue} record={record} />
      <SpecTable catalogue={catalogue} record={record} label={label} />
      <UnsourcedFields catalogue={catalogue} record={record} />
      <RecordNotes record={record} />
      <AllSources catalogue={catalogue} record={record} label={label} />
      {record.category === 'gpu-chip' ? (
        <p className="mt-6 max-w-prose text-ink-2">
          GPU chips are not sold on their own, so a chip has no prices: its cards do.
        </p>
      ) : (
        pricesOf(catalogue, record.id).map((prices) => (
          <MarketPricesView
            key={prices.market}
            catalogue={catalogue}
            prices={prices}
            label={label}
          />
        ))
      )}
    </section>
  );
}

interface RecordProps {
  readonly catalogue: Catalogue;
  readonly record: SpecRecord;
}

function PartIdentity({ catalogue, record }: RecordProps) {
  return (
    <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 type-small">
      <dt className="text-ink-2">Brand</dt>
      <dd>{record.brand}</dd>
      <dt className="text-ink-2">Name</dt>
      <dd>{record.name}</dd>
      <dt className="text-ink-2">Id</dt>
      <dd>
        <code>{record.id}</code>
      </dd>
      <dt className="text-ink-2">Category</dt>
      <dd>
        {CATEGORY_LABELS[record.category]} (<code>{record.category}</code>)
      </dd>
      <dt className="text-ink-2">Maker</dt>
      <dd>
        {publisherName(catalogue, record.manufacturer)} (<code>{record.manufacturer}</code>)
      </dd>
    </dl>
  );
}

const AVAILABILITY: Readonly<Record<SpecEvidence['availability'], string>> = {
  published: 'Published',
  none: 'None',
  'not-published': 'Not published',
};

function SpecTable({ catalogue, record, label }: RecordProps & { readonly label: string }) {
  const leaves = useMemo(
    () => specLeaves(record.category, record, nullMeansNone(record)),
    [record],
  );
  return (
    <LabTable caption={`Specs of ${label} (${String(leaves.length)})`} className="w-full min-w-2xl">
      <thead>
        <tr>
          <th scope="col" className={TH}>
            Field
          </th>
          <th scope="col" className={TH}>
            Value
          </th>
          <th scope="col" className={TH}>
            Unit
          </th>
          <th scope="col" className={TH}>
            Status
          </th>
          <th scope="col" className={`${TH} min-w-56`}>
            Sources
          </th>
        </tr>
      </thead>
      <tbody>
        {leaves.map((evidence) => (
          <SpecRow key={evidence.field} catalogue={catalogue} evidence={evidence} />
        ))}
      </tbody>
    </LabTable>
  );
}

function SpecRow({
  catalogue,
  evidence,
}: {
  readonly catalogue: Catalogue;
  readonly evidence: SpecEvidence;
}) {
  return (
    <tr>
      <th scope="row" className={TH_ROW}>
        <DotPath path={evidence.field} />
      </th>
      <td className={`${TD} wrap-break-word`}>
        {evidence.value === null ? <NoValue /> : formatSpecValue(evidence.value)}
      </td>
      <td className={`${TD} whitespace-nowrap`}>{evidence.unit ?? ''}</td>
      <td className={TD}>
        {AVAILABILITY[evidence.availability]}
        {evidence.note === null ? null : (
          <span className="mt-1 block text-ink-2">
            {evidence.availability === 'not-published' ? 'Reason: ' : 'Note: '}
            {evidence.note}
          </span>
        )}
      </td>
      <td className={TD}>
        <SourceRefs catalogue={catalogue} sources={evidence.sources} />
      </td>
    </tr>
  );
}

/** An empty value: a dash to the eye, words to a screen reader. */
function NoValue() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">No value</span>
    </>
  );
}

/** The fields `specLeaves` leaves out because no source backs them on their own. */
function UnsourcedFields({ catalogue, record }: RecordProps) {
  const headingId = useId();
  const fields = UNSOURCED_FIELDS[record.category] ?? [];
  if (fields.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="mt-8 max-w-prose">
      <h3 id={headingId}>Fields without a source of their own</h3>
      <dl className="mt-2 space-y-2">
        {fields.map((field) => (
          <div key={field}>
            <dt>
              <DotPath path={field} />
            </dt>
            <dd className="text-ink-2">
              <UnsourcedValue catalogue={catalogue} record={record} field={field} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function UnsourcedValue({ catalogue, record, field }: RecordProps & { readonly field: string }) {
  if (record.category === 'gpu-card' && field === 'chipId') {
    const chip = findRecord(catalogue, 'gpu-chip', record.chipId);
    return chip === null ? (
      <>
        A GPU chip the catalogue does not have: <code>{record.chipId}</code>.
      </>
    ) : (
      <>
        The card’s GPU chip: <a href={`#${partAnchorId('gpu-chip', chip.id)}`}>{partLabel(chip)}</a>{' '}
        (<code>{chip.id}</code>), a reference to the chip’s own record, shown below.
      </>
    );
  }
  if (record.category === 'case' && field === 'size') {
    return (
      <>
        {record.size}: derived from the supported boards ({record.supportedBoards.join(', ')}).
      </>
    );
  }
  return <>{JSON.stringify(valueAt(record, field))}: not sourced on its own.</>;
}

function RecordNotes({ record }: { readonly record: SpecRecord }) {
  const headingId = useId();
  const notes = record.notes ?? [];
  return (
    <section aria-labelledby={headingId} className="mt-8 max-w-prose">
      <h3 id={headingId}>Notes</h3>
      {notes.length === 0 ? (
        <p className="mt-1 text-ink-2">This part has no notes.</p>
      ) : (
        <div className="mt-2">
          <NoteList notes={notes} />
        </div>
      )}
    </section>
  );
}

function AllSources({ catalogue, record, label }: RecordProps & { readonly label: string }) {
  return (
    <LabTable
      caption={`All sources of ${label} (${String(record.sources.length)})`}
      className="w-full min-w-2xl"
    >
      <thead>
        <tr>
          <th scope="col" className={`${TH} min-w-56`}>
            Source
          </th>
          <th scope="col" className={TH}>
            Type
          </th>
          <th scope="col" className={TH}>
            Retrieved
          </th>
          <th scope="col" className={TH}>
            Fields it backs
          </th>
          <th scope="col" className={TH}>
            Where in the document
          </th>
        </tr>
      </thead>
      <tbody>
        {record.sources.map((source, index) => (
          <tr key={`${String(index)} ${source.url}`}>
            <th scope="row" className={TH_ROW}>
              {publisherName(catalogue, source.publisher)}:{' '}
              <a href={source.url}>{source.title ?? docTypeLabel(source.docType)}</a>
              {source.archiveUrl === undefined ? null : (
                <span className="mt-1 block">
                  <a href={source.archiveUrl}>archived copy</a>
                </span>
              )}
            </th>
            <td className={TD}>{docTypeLabel(source.docType)}</td>
            <td className={`${TD} whitespace-nowrap`}>{source.retrievedAt}</td>
            <td className={TD}>
              {source.fields === undefined ? (
                'The whole record'
              ) : (
                <ul role="list">
                  {source.fields.map((field) => (
                    <li key={field}>
                      <DotPath path={field} />
                    </li>
                  ))}
                </ul>
              )}
            </td>
            <td className={TD}>{source.locator ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </LabTable>
  );
}

function MarketPricesView({
  catalogue,
  prices,
  label,
}: {
  readonly catalogue: Catalogue;
  readonly prices: MarketPrices;
  readonly label: string;
}) {
  const headingId = useId();
  const market = MARKET_NAMES[prices.market];
  return (
    <section aria-labelledby={headingId} className="mt-10">
      <h3 id={headingId}>
        Prices in {market} ({prices.currency})
      </h3>
      <p className="mt-1 max-w-prose type-caption text-ink-2">Price basis: {prices.priceBasis}</p>
      {prices.observations.length === 0 ? null : (
        <Observations
          catalogue={catalogue}
          observations={prices.observations}
          caption={`Prices of ${label} in ${market} (${String(prices.observations.length)})`}
        />
      )}
      {prices.gaps.length === 0 ? null : <Gaps catalogue={catalogue} gaps={prices.gaps} />}
      {prices.observations.length === 0 && prices.gaps.length === 0 ? (
        <p className="mt-2 text-ink-2">
          No price and no failed attempt is recorded for this part in {market}.
        </p>
      ) : null}
    </section>
  );
}

function Observations({
  catalogue,
  observations,
  caption,
}: {
  readonly catalogue: Catalogue;
  readonly observations: readonly PriceObservation[];
  readonly caption: string;
}) {
  return (
    <LabTable caption={caption} className="w-full min-w-2xl">
      <thead>
        <tr>
          <th scope="col" className={TH}>
            Price
          </th>
          <th scope="col" className={TH}>
            Retailer and seller
          </th>
          <th scope="col" className={TH}>
            Stock
          </th>
          <th scope="col" className={TH}>
            Date
          </th>
          <th scope="col" className={TH}>
            Notes
          </th>
          <th scope="col" className={TH}>
            Saved page
          </th>
        </tr>
      </thead>
      <tbody>
        {observations.map((observation) => (
          <tr key={`${observation.retailer} ${observation.url} ${observation.retrievedAt}`}>
            <th scope="row" className={`${TH_ROW} whitespace-nowrap`}>
              {formatAmount(observation.amount, observation.currency)}
              <span className="mt-1 block">
                <a href={observation.url}>Product page</a>
              </span>
            </th>
            <td className={TD}>
              {publisherName(catalogue, observation.retailer)}, sold by {observation.seller}
              <span className="mt-1 block text-ink-2">
                {observation.isMarketplace
                  ? 'A marketplace seller, not the retailer'
                  : 'Sold by the retailer itself'}
              </span>
            </td>
            <td className={TD}>{observation.inStock ? 'In stock' : 'Out of stock'}</td>
            <td className={TD}>Price as of {observation.retrievedAt}</td>
            <td className={`${TD} min-w-56`}>
              {observation.notes === undefined ? '' : <NoteList notes={observation.notes} />}
            </td>
            <td className={`${TD} max-w-xs`}>
              <code className="wrap-anywhere">{observation.capture}</code>
              <span className="mt-1 block text-ink-2">
                SHA-256 <code className="wrap-anywhere">{observation.captureSha256}</code>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </LabTable>
  );
}

function Gaps({
  catalogue,
  gaps,
}: {
  readonly catalogue: Catalogue;
  readonly gaps: readonly PriceGap[];
}) {
  return (
    <ul role="list" className="mt-4 max-w-prose space-y-3">
      {gaps.map((gap, index) => (
        <li key={`${String(index)} ${gap.reasonCode} ${gap.checkedAt}`}>
          <p>
            No price found as of {gap.checkedAt}: {gap.reason}
          </p>
          <p className="text-ink-2">
            Reason code <code>{gap.reasonCode}</code>. Retailers tried:{' '}
            {gap.retailersTried.map((id) => publisherName(catalogue, id)).join(', ')}.
          </p>
          {gap.notes === undefined ? null : (
            <div className="mt-1 text-ink-2">
              <NoteList notes={gap.notes} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
