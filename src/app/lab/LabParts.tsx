import { useCallback, useEffect, useId, useState } from 'react';
import { useSearchParams } from 'wouter';
import { DateTime } from '../../components/lab/DateTime';
import { fieldLabel } from '../../components/lab/field-labels';
import { formatMoney } from '../../components/lab/format';
import { SourceLink } from '../../components/lab/SourceLink';
import { SpecSources, SpecValue } from '../../components/lab/SpecValue';
import { valueTone, valueWraps } from '../../components/lab/value-style';
import type { Market } from '../../data/schema';
import { displayName } from '../../engine/names';
import type { Catalogue } from '../../engine/types';
import type { RigBuild } from '../../state/build-codec';
import { buildStore } from '../../state/build-store';
import { useBuild } from '../build-hooks';
import {
  CatalogueFailed,
  CatalogueGate,
  CatalogueLoading,
  type CatalogueState,
} from './CatalogueGate';
import { CATEGORY_PARAM, CHIP_PARAM, shownCategory, type PickerCategory } from './lab-links';
import { PartLink } from './PartLink';
import {
  dropUnknownPicks,
  looseNotes,
  priceRows,
  publisherName,
  shownParts,
  specRows,
  unknownPicks,
  unsourcedFields,
  type PriceRow,
  type ShownPart,
  type UnsourcedField,
} from './parts-model';
import { CategoryField, CategorySelect, PickerPanel } from './PartPicker';
import { FIRST, TD, TH, THEAD, TH_ROW, TableRegion } from './TableRegion';

const PANEL = 'rounded-panel border border-line bg-surface p-5';

/**
 * `/lab/parts` (lab-spec §8): the shared picker in one-part mode, a category select and that
 * category's field, then every spec of the part as a table (Spec, Value, Source), its fields with
 * no source of their own, the notes no row shows, and its prices (Market, Price, Retailer, As of).
 */
export function LabParts() {
  return <CatalogueGate>{(state) => <PartsPage state={state} />}</CatalogueGate>;
}

function PartsPage({ state }: { readonly state: CatalogueState }) {
  const build = useBuild((store) => store.selections);
  const [params, setParams] = useSearchParams();
  const category = shownCategory(params, build);
  const chip = params.get(CHIP_PARAM);
  const catalogue = state.status === 'ready' ? state.catalogue : null;

  /** Rewrites a lab parameter in place: an in-page change, no new history entry. */
  const setParam = useCallback(
    (name: string, value: string | null): void => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value === null) next.delete(name);
          else next.set(name, value);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const dropChip = useCallback(() => {
    setParam(CHIP_PARAM, null);
  }, [setParam]);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <PickerPanel>
        <CategorySelect
          value={category}
          disabled={catalogue === null}
          onChange={(next) => {
            setParam(CATEGORY_PARAM, next);
          }}
        />
        <CategoryField
          category={category}
          catalogue={catalogue}
          build={build}
          chip={chip}
          onChip={(id) => {
            setParam(CHIP_PARAM, id);
          }}
        />
      </PickerPanel>
      <div className="min-w-0">
        {state.status === 'ready' ? (
          <PartsResults
            catalogue={state.catalogue}
            build={build}
            category={category}
            chip={chip}
            dropChip={dropChip}
          />
        ) : state.status === 'loading' ? (
          <CatalogueLoading />
        ) : (
          <CatalogueFailed />
        )}
      </div>
    </div>
  );
}

interface PartsResultsProps {
  readonly catalogue: Catalogue;
  readonly build: RigBuild;
  readonly category: PickerCategory;
  readonly chip: string | null;
  readonly dropChip: () => void;
}

/**
 * The shown category's part or parts. A part the link names but the catalogue doesn't have is
 * left out of the build, and the notice says so (lab-spec §7). The notice takes the loading
 * line's place, so nothing moves.
 */
function PartsResults({ catalogue, build, category, chip, dropChip }: PartsResultsProps) {
  const [leftOut] = useState(() => unknownPicks(catalogue, build, chip).length);
  const chipUnknown = unknownPicks(catalogue, {}, chip).length > 0;
  useEffect(() => {
    dropUnknownPicks(buildStore, catalogue);
    if (chipUnknown) dropChip();
  }, [catalogue, build, chipUnknown, dropChip]);

  const parts = shownParts(catalogue, build, category, chip);
  return (
    <>
      {leftOut === 0 ? null : (
        <p role="status" className="mb-8 max-w-measure type-body text-ink">
          {leftOut === 1
            ? 'The link names a part that isn’t in the catalogue, so it was left out.'
            : 'The link names parts that aren’t in the catalogue, so they were left out.'}
        </p>
      )}
      {parts.length === 0 ? (
        <p className="max-w-measure type-body text-ink-2">
          {category === 'gpu-chip'
            ? 'Pick a GPU chip to see its specs, with their sources.'
            : 'Pick a part to see its specs, with their sources, and its prices.'}
        </p>
      ) : (
        // Block flow, not a grid: a grid item would widen to its table's minimum width.
        <div className="space-y-12">
          {parts.map((part) => (
            <PartSection
              key={`${part.category} ${part.record.id}`}
              catalogue={catalogue}
              part={part}
              packs={category === 'case-fan' ? (build['case-fan']?.packs ?? null) : null}
            />
          ))}
        </div>
      )}
    </>
  );
}

/** Indents for nested specs, one step per level (lab-spec §8). */
const INDENT = ['pl-3', 'pl-7', 'pl-11', 'pl-15', 'pl-19', 'pl-23', 'pl-27'] as const;

function indent(depth: number): string {
  return INDENT[Math.min(depth, INDENT.length - 1)] ?? 'pl-3';
}

function PartSection({
  catalogue,
  part,
  packs,
}: {
  readonly catalogue: Catalogue;
  readonly part: ShownPart;
  readonly packs: number | null;
}) {
  const headingId = useId();
  const { category, record } = part;
  const name = displayName(record);
  const nameOf = (id: string) => publisherName(catalogue, id);
  const unsourced = unsourcedFields(category, record);
  const notes = looseNotes(category, record);
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} translate="no">
        {name}
      </h2>
      <p className="mt-1 max-w-measure type-small text-ink-2">
        Catalogue id{' '}
        <span translate="no" className="text-ink">
          {record.id}
        </span>
        , made by{' '}
        <span translate="no" className="text-ink">
          {nameOf(record.manufacturer)}
        </span>
        .
        {packs === null
          ? null
          : ` The build has ${String(packs)} ${packs === 1 ? 'pack' : 'packs'}.`}
      </p>

      <h3 className="mt-6">Specs</h3>
      <div className={`mt-3 ${PANEL}`}>
        <TableRegion label={`Specs of ${name}`} className="w-full min-w-2xl">
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={`${TH} ${FIRST} min-w-44`}>
                Spec
              </th>
              <th scope="col" className={TH}>
                Value
              </th>
              <th scope="col" className={`${TH} min-w-80`}>
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {specRows(category, record).map((row) =>
              row.kind === 'group' ? (
                <tr key={row.path}>
                  <th scope="row" className={`${TH_ROW} ${indent(row.depth)} text-ink-2`}>
                    {row.label}
                  </th>
                  <td className={TD} />
                  <td className={TD}>
                    {row.note === null ? null : (
                      <span className="block type-caption text-ink-3">{row.note}</span>
                    )}
                  </td>
                </tr>
              ) : (
                <tr key={row.path}>
                  <th scope="row" className={`${TH_ROW} ${indent(row.depth)}`}>
                    <span className="sr-only">{fieldLabel(category, row.path)}</span>
                    <span aria-hidden="true">{row.label}</span>
                  </th>
                  <td
                    className={`${TD} ${valueTone(row.evidence)} ${valueWraps(row.evidence) ? 'min-w-48' : 'whitespace-nowrap'}`}
                  >
                    <SpecValue evidence={row.evidence} asPublished={row.asPublished} />
                  </td>
                  <td className={TD}>
                    <SpecSources evidence={row.evidence} note={row.note} publisherName={nameOf} />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </TableRegion>
      </div>

      {unsourced.length === 0 ? null : (
        <>
          <h3 className="mt-6">Without a source of their own</h3>
          <dl className="mt-2 grid gap-2 type-small">
            {unsourced.map((field) => (
              <div key={field.path}>
                <dt className="text-ink-2">{field.label}</dt>
                <dd className="max-w-measure text-ink">
                  <UnsourcedValue catalogue={catalogue} part={part} field={field} />
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {notes.length === 0 ? null : (
        <>
          <h3 className="mt-6">Notes</h3>
          <ul role="list" className="mt-2 grid max-w-measure gap-1 type-small text-ink-2">
            {notes.map((note) => (
              <li key={`${note.label ?? ''} ${note.text}`}>
                {note.label === null ? null : `${note.label}: `}
                {note.text}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="mt-6">Prices</h3>
      {category === 'gpu-chip' ? (
        <p className="mt-2 max-w-measure type-body text-ink-2">
          GPU chips aren’t sold on their own, so a chip has no prices: its cards do.
        </p>
      ) : (
        <div className={`mt-3 ${PANEL}`}>
          <TableRegion label={`Prices of ${name}`} className="w-full min-w-xl">
            <thead className={THEAD}>
              <tr>
                <th scope="col" className={`${TH} ${FIRST}`}>
                  Market
                </th>
                <th scope="col" className={TH}>
                  Price
                </th>
                <th scope="col" className={TH}>
                  Retailer
                </th>
                <th scope="col" className={TH}>
                  As of
                </th>
              </tr>
            </thead>
            <tbody>
              {priceRows(catalogue, record.id).map((row, index) => (
                <PriceRowView
                  key={`${row.market} ${String(index)}`}
                  row={row}
                  publisherNameOf={nameOf}
                />
              ))}
            </tbody>
          </TableRegion>
        </div>
      )}
    </section>
  );
}

/** A card's chip links to the chip; a case's size class says where it comes from (WP-E0). */
function UnsourcedValue({
  catalogue,
  part,
  field,
}: {
  readonly catalogue: Catalogue;
  readonly part: ShownPart;
  readonly field: UnsourcedField;
}) {
  const { record } = part;
  const { path } = field;
  if (record.category === 'gpu-card' && path === 'chipId') {
    const chip = catalogue.parts['gpu-chip'].find((candidate) => candidate.id === record.chipId);
    return (
      <>
        <PartLink target={{ category: 'gpu-chip', id: record.chipId }}>
          {chip === undefined ? record.chipId : displayName(chip)}
        </PartLink>
        : the card’s GPU chip, whose specs have their own sources.
      </>
    );
  }
  if (record.category === 'case' && path === 'size') {
    return (
      <>
        <span translate="no">{record.size}</span>, derived from the supported boards (
        <span translate="no">{record.supportedBoards.join(', ')}</span>).
      </>
    );
  }
  return <span translate="no">{JSON.stringify(field.value)}</span>;
}

const MARKET_NAMES: Readonly<Record<Market, string>> = { SA: 'Saudi Arabia', US: 'The US' };

function PriceRowView({
  row,
  publisherNameOf,
}: {
  readonly row: PriceRow;
  readonly publisherNameOf: (id: string) => string;
}) {
  const market = (
    <th scope="row" className={`${TH_ROW} whitespace-nowrap`}>
      {MARKET_NAMES[row.market]}
    </th>
  );
  if (row.kind === 'price') {
    const { observation } = row;
    return (
      <tr>
        {market}
        <td className={`${TD} whitespace-nowrap`}>
          <span translate="no">{formatMoney(observation.amount, observation.currency)}</span>
          <span className="block type-caption text-ink-3">
            {observation.inStock ? 'In stock' : 'Out of stock'}
          </span>
        </td>
        <td className={`${TD} min-w-64`}>
          <SourceLink
            url={observation.url}
            publisher={publisherNameOf(observation.retailer)}
            document="product page"
          />
          <span className="block type-caption text-ink-3">
            Sold by <span translate="no">{observation.seller}</span>
            {observation.isMarketplace ? ', a marketplace seller' : ''}.
          </span>
          {(observation.notes ?? []).map((note) => (
            <span key={note.text} className="block type-caption text-ink-3">
              {note.text}
            </span>
          ))}
          <span className="block type-caption text-ink-3">
            Saved page{' '}
            <span translate="no" className="break-all">
              {observation.capture}
            </span>
            , SHA-256{' '}
            <span translate="no" className="break-all">
              {observation.captureSha256}
            </span>
          </span>
        </td>
        <td className={`${TD} whitespace-nowrap`}>
          <DateTime value={observation.retrievedAt} />
        </td>
      </tr>
    );
  }
  const missing = `No ${row.market} price found`;
  if (row.kind === 'gap') {
    const { gap } = row;
    return (
      <tr>
        {market}
        <td className={`${TD} min-w-48 text-ink-2`}>
          {missing}
          <span className="block type-caption text-ink-3">{gap.reason}</span>
          <span className="block type-caption text-ink-3">
            Reason code <span translate="no">{gap.reasonCode}</span>
          </span>
          {(gap.notes ?? []).map((note) => (
            <span key={note.text} className="block type-caption text-ink-3">
              {note.text}
            </span>
          ))}
        </td>
        <td className={TD}>
          Tried <span translate="no">{gap.retailersTried.map(publisherNameOf).join(', ')}</span>
        </td>
        <td className={`${TD} whitespace-nowrap`}>
          <DateTime value={gap.checkedAt} />
        </td>
      </tr>
    );
  }
  return (
    <tr>
      {market}
      <td className={`${TD} text-ink-2`}>{missing}</td>
      <td className={`${TD} text-ink-2`}>No retailer was checked.</td>
      <td className={TD} />
    </tr>
  );
}
