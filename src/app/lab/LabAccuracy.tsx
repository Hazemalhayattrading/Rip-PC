import { useId, useMemo, type ReactNode } from 'react';
import { formatNumber } from '../../components/lab/format';
import { SourceLink, type SourceDate } from '../../components/lab/SourceLink';
import { documentName } from '../../components/lab/source-text';
import type { CreatorBenchmark, GameBenchmark, Note, SourceRef } from '../../data/schema';
import { displayName } from '../../engine/names';
import type { Catalogue } from '../../engine/types';
import {
  anchorTables,
  buildAccuracyModel,
  gapCells,
  gapId,
  type CoverageGrid,
  type GapCell,
} from './accuracy-model';
import { CatalogueFailed, CatalogueGate, CatalogueLoading } from './CatalogueGate';
import { anchorsBreakdown, summariseCatalogue } from './catalogue-summary';
import { PartLink } from './PartLink';
import { publisherName } from './parts-model';
import { rayTracingWords, resolutionName, upscalingWords } from './anchor-text';
import { FIRST, TD, TD_NUMBER, TH, THEAD, TH_NUMBER, TH_ROW, TableRegion } from './TableRegion';

const PANEL = 'rounded-panel border border-line bg-surface p-5';

/**
 * `/lab/accuracy` (lab-spec §8): every benchmark anchor with its source, then the coverage grids,
 * where a "0" links to its line in the "Gaps" list under the grid. WP-E3 adds the model's number
 * and its error to each anchor; WP-D2 adds a sourced reason to each gap.
 */
export function LabAccuracy() {
  return (
    <CatalogueGate>
      {(state) =>
        state.status === 'ready' ? (
          <AccuracyResults catalogue={state.catalogue} />
        ) : state.status === 'loading' ? (
          <CatalogueLoading />
        ) : (
          <CatalogueFailed />
        )
      }
    </CatalogueGate>
  );
}

/** Names of the things the page lists, as the catalogue writes them. */
interface Names {
  readonly game: (id: string) => string;
  readonly chip: (id: string) => string;
  readonly cpu: (id: string) => string;
}

function namesOf(catalogue: Catalogue): Names {
  const games = new Map(catalogue.games.map((game) => [game.id, game.title]));
  const chips = new Map(catalogue.parts['gpu-chip'].map((chip) => [chip.id, displayName(chip)]));
  const cpus = new Map(catalogue.parts.cpu.map((cpu) => [cpu.id, displayName(cpu)]));
  return {
    game: (id) => games.get(id) ?? id,
    chip: (id) => chips.get(id) ?? id,
    cpu: (id) => cpus.get(id) ?? id,
  };
}

function AccuracyResults({ catalogue }: { readonly catalogue: Catalogue }) {
  const model = useMemo(() => buildAccuracyModel(catalogue), [catalogue]);
  const tables = useMemo(() => anchorTables(catalogue), [catalogue]);
  const names = useMemo(() => namesOf(catalogue), [catalogue]);
  const anchorsId = useId();
  const coverageId = useId();
  const total = catalogue.gameBenchmarks.length + catalogue.creatorBenchmarks.length;
  return (
    <>
      <section aria-labelledby={anchorsId}>
        <h2 id={anchorsId}>Anchors</h2>
        <p className="mt-1 max-w-measure type-body text-ink-2">
          {formatNumber(total)} published results: {anchorsBreakdown(summariseCatalogue(catalogue))}
          . Frame generation is off in every game anchor.
        </p>
        <GameAnchors catalogue={catalogue} names={names} rows={tables.game} />
        <CreatorAnchors
          catalogue={catalogue}
          names={names}
          rows={tables.cinebench}
          title="Cinebench 2024 anchors"
          unit="points"
        />
        <CreatorAnchors
          catalogue={catalogue}
          names={names}
          rows={tables.blender}
          title="Blender anchors"
          unit="samples per minute"
        />
        {tables.otherCreator.length === 0 ? null : (
          <CreatorAnchors
            catalogue={catalogue}
            names={names}
            rows={tables.otherCreator}
            title="Other creator anchors"
            unit={null}
          />
        )}
      </section>

      <section aria-labelledby={coverageId} className="mt-12">
        <h2 id={coverageId}>Coverage</h2>
        <p className="mt-1 max-w-measure type-body text-ink-2">
          Each cell counts anchors: a GPU-bound game anchor counts for its GPU chip, a CPU-bound one
          for its CPU. A 0 links to its line in the grid’s Gaps list.
        </p>
        <Coverage
          grid={model.gpuBound}
          gridKey="gpu"
          title="Games by GPU chip"
          corner="Game"
          rowName={names.game}
          columnName={names.chip}
          gap={(cell) => (
            <>
              The catalogue has no anchor for <span translate="no">{names.game(cell.row)}</span> on
              the <span translate="no">{names.chip(cell.column)}</span>.
            </>
          )}
        />
        <Coverage
          grid={model.cpuBound}
          gridKey="cpu"
          title="Games by CPU"
          corner="Game"
          rowName={names.game}
          columnName={names.cpu}
          gap={(cell) => (
            <>
              The catalogue has no anchor for <span translate="no">{names.game(cell.row)}</span> on
              the <span translate="no">{names.cpu(cell.column)}</span>.
            </>
          )}
        />
        <Coverage
          grid={model.cinebench}
          gridKey="cinebench"
          title="Cinebench 2024 by CPU"
          corner="CPU"
          rowName={names.cpu}
          columnName={(test) => test}
          gap={(cell) => (
            <>
              The catalogue has no anchor for the <span translate="no">{names.cpu(cell.row)}</span>{' '}
              in <span translate="no">Cinebench 2024</span>: {cell.column}.
            </>
          )}
        />
        <Coverage
          grid={model.blender}
          gridKey="blender"
          title="Blender by GPU chip"
          corner="GPU chip"
          rowName={names.chip}
          columnName={(test) => test}
          gap={(cell) => (
            <>
              The catalogue has no anchor for the <span translate="no">{names.chip(cell.row)}</span>{' '}
              in <span translate="no">Blender</span>: {cell.column}.
            </>
          )}
        />
        {model.otherCreatorRows === 0 ? null : (
          <p className="mt-4 max-w-measure type-small text-ink-2">
            Creator anchors in neither creator grid: {formatNumber(model.otherCreatorRows)}.
          </p>
        )}
        <NoAnchors model={model} names={names} />
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// The anchor tables

/** "published 6 May 2026, read 30 Sep 2026" for a review; "read …" for anything else. */
function anchorDates(source: SourceRef, publishedAt: string): SourceDate[] {
  return source.docType === 'review'
    ? [
        { verb: 'published', date: publishedAt },
        { verb: 'read', date: source.retrievedAt },
      ]
    : [{ verb: 'read', date: source.retrievedAt }];
}

/** An anchor's sources, each on its own line, then its notes word for word. */
function AnchorSources({
  catalogue,
  sources,
  publishedAt,
  notes,
  extra,
}: {
  readonly catalogue: Catalogue;
  readonly sources: readonly SourceRef[];
  readonly publishedAt: string;
  readonly notes: readonly Note[] | undefined;
  readonly extra?: ReactNode;
}) {
  return (
    <>
      {sources.map((source) => (
        <span key={source.url} className="block">
          <SourceLink
            url={source.url}
            publisher={publisherName(catalogue, source.publisher)}
            document={documentName(source)}
            dates={anchorDates(source, publishedAt)}
            archiveUrl={source.archiveUrl}
          />
        </span>
      ))}
      {(notes ?? []).map((note) => (
        <span key={`${note.field ?? ''} ${note.text}`} className="block type-caption text-ink-3">
          {note.text}
        </span>
      ))}
      {extra}
    </>
  );
}

/** A labelled line inside a cell: "CPU: AMD Ryzen 7 9800X3D (stock)". */
function Line({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <span className="block">
      <span className="text-ink-2">{label}:</span> {children}
    </span>
  );
}

/** A value as the review states it, or the words for one it doesn't state. */
function Stated({ value }: { readonly value: string | null }) {
  return value === null ? (
    <span className="text-ink-2">Not published</span>
  ) : (
    <span translate="no">{value}</span>
  );
}

interface AnchorTableProps {
  readonly catalogue: Catalogue;
  readonly names: Names;
}

function GameAnchors({
  catalogue,
  names,
  rows,
}: AnchorTableProps & { readonly rows: readonly GameBenchmark[] }) {
  const title = `Game anchors (${formatNumber(rows.length)})`;
  return (
    <>
      <h3 className="mt-8">{title}</h3>
      <div className={`mt-3 ${PANEL}`}>
        <TableRegion label="Game anchors" className="w-full min-w-6xl">
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={`${TH} ${FIRST}`}>
                Game
              </th>
              <th scope="col" className={TH}>
                Setting
              </th>
              <th scope="col" className={TH}>
                Hardware
              </th>
              <th scope="col" className={TH}>
                Test system
              </th>
              <th scope="col" className={TH_NUMBER}>
                Measured (fps)
              </th>
              <th scope="col" className={TH_NUMBER}>
                1% low (fps)
              </th>
              <th scope="col" className={TH}>
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <GameAnchorRow key={row.id} catalogue={catalogue} names={names} row={row} />
            ))}
          </tbody>
        </TableRegion>
      </div>
    </>
  );
}

function GameAnchorRow({
  catalogue,
  names,
  row,
}: AnchorTableProps & { readonly row: GameBenchmark }) {
  const { cpu, gpu } = row.testSystem;
  const cpuName =
    cpu.catalogueId === null ? (
      <span translate="no">{cpu.name}</span>
    ) : (
      <PartLink target={{ category: 'cpu', id: cpu.catalogueId }}>{cpu.name}</PartLink>
    );
  const cardName =
    gpu.cardId === null ? (
      <span translate="no">{gpu.card}</span>
    ) : (
      <PartLink target={{ category: 'gpu-card', id: gpu.cardId }}>{gpu.card}</PartLink>
    );
  const chipName =
    gpu.chipId === null ? (
      <span translate="no">{gpu.chipName}</span>
    ) : (
      <PartLink target={{ category: 'gpu-chip', id: gpu.chipId }}>{gpu.chipName}</PartLink>
    );
  return (
    <tr>
      <th scope="row" className={`${TH_ROW} min-w-40`}>
        <span translate="no">{names.game(row.gameId)}</span>
        <span className="block type-caption text-ink-3" translate="no">
          {row.id}
        </span>
      </th>
      <td className={`${TD} min-w-48`}>
        {resolutionName(row.resolution)}, <span translate="no">{row.preset}</span> preset,{' '}
        {rayTracingWords(row.rayTracing)}, {upscalingWords(row.upscaling)}
        <Line label="Scene">
          <Stated value={row.scene} />
        </Line>
        <Line label="Game version">
          <Stated value={row.gameVersion} />
        </Line>
      </td>
      <td className={`${TD} min-w-48`}>
        {row.limiter === 'gpu' ? (
          <>
            <span className="block">{cardName}</span>
            <Line label="GPU chip">{chipName}</Line>
            <span className="block type-caption text-ink-3">GPU-bound</span>
          </>
        ) : (
          <>
            <span className="block">{cpuName}</span>
            <span className="block type-caption text-ink-3">CPU-bound</span>
          </>
        )}
      </td>
      <td className={`${TD} min-w-64`}>
        {row.limiter === 'gpu' ? (
          <Line label="CPU">{cpuName}</Line>
        ) : (
          <>
            <Line label="Graphics card">{cardName}</Line>
            <Line label="GPU chip">{chipName}</Line>
          </>
        )}
        <Line label="Memory">
          <Stated value={row.testSystem.ram} />
        </Line>
        <Line label="Motherboard">
          <Stated value={row.testSystem.motherboard} />
        </Line>
        <Line label="OS">
          <Stated value={row.testSystem.os} />
        </Line>
        <Line label="Graphics driver">
          <Stated value={row.testSystem.gpuDriver} />
        </Line>
      </td>
      <td className={TD_NUMBER}>{formatNumber(row.avgFps)}</td>
      <td className={TD_NUMBER}>
        {row.onePercentLowFps === null ? (
          <span className="text-ink-2">Not published</span>
        ) : (
          formatNumber(row.onePercentLowFps)
        )}
      </td>
      <td className={`${TD} min-w-72`}>
        <AnchorSources
          catalogue={catalogue}
          sources={row.sources}
          publishedAt={row.publishedAt}
          notes={row.notes}
          extra={
            row.conflictsWith === undefined ? null : (
              <span className="block type-caption text-ink-3">
                Differs by more than 10% from{' '}
                <span translate="no">{row.conflictsWith.join(', ')}</span>.
              </span>
            )
          }
        />
      </td>
    </tr>
  );
}

const CREATOR_APPS: Readonly<Record<CreatorBenchmark['app'], string>> = {
  blender: 'Blender',
  'cinebench-2024': 'Cinebench 2024',
};

const CREATOR_UNITS: Readonly<Record<CreatorBenchmark['unit'], string>> = {
  'samples-per-minute': 'samples per minute',
  points: 'points',
};

function CreatorAnchors({
  catalogue,
  names,
  rows,
  title,
  unit,
}: AnchorTableProps & {
  readonly rows: readonly CreatorBenchmark[];
  readonly title: string;
  /** The unit every row shares, for the column header; `null` when they differ. */
  readonly unit: string | null;
}) {
  return (
    <>
      <h3 className="mt-8">
        {title} ({formatNumber(rows.length)})
      </h3>
      <div className={`mt-3 ${PANEL}`}>
        <TableRegion label={title} className="w-full min-w-5xl">
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={`${TH} ${FIRST}`}>
                Test
              </th>
              <th scope="col" className={TH}>
                Hardware
              </th>
              <th scope="col" className={TH}>
                Test system
              </th>
              <th scope="col" className={TH_NUMBER}>
                {unit === null ? 'Measured' : `Measured (${unit})`}
              </th>
              <th scope="col" className={TH}>
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <CreatorAnchorRow
                key={row.id}
                catalogue={catalogue}
                names={names}
                row={row}
                withUnit={unit === null}
              />
            ))}
          </tbody>
        </TableRegion>
      </div>
    </>
  );
}

function CreatorAnchorRow({
  catalogue,
  names,
  row,
  withUnit,
}: AnchorTableProps & { readonly row: CreatorBenchmark; readonly withUnit: boolean }) {
  const { subject } = row;
  return (
    <tr>
      <th scope="row" className={`${TH_ROW} min-w-48`}>
        <span translate="no">{CREATOR_APPS[row.app]}</span> {row.test}
        <span className="block type-caption text-ink-3">
          Version <span translate="no">{row.appVersion}</span>, on the{' '}
          {row.device === 'cpu' ? 'CPU' : 'GPU'}
          {row.backend === null ? null : (
            <>
              , <span translate="no">{row.backend}</span>
            </>
          )}
        </span>
        <span className="block type-caption text-ink-3" translate="no">
          {row.id}
        </span>
      </th>
      <td className={`${TD} min-w-48`}>
        {subject.type === 'cpu' ? (
          <PartLink target={{ category: 'cpu', id: subject.cpuId }}>
            {names.cpu(subject.cpuId)}
          </PartLink>
        ) : (
          <PartLink target={{ category: 'gpu-chip', id: subject.chipId }}>
            {names.chip(subject.chipId)}
          </PartLink>
        )}
      </td>
      <td className={`${TD} min-w-56`}>
        {row.testSystem === null ? (
          row.aggregate === null ? (
            <span className="text-ink-2">Not published</span>
          ) : (
            <>
              The {row.aggregate.statistic} of {formatNumber(row.aggregate.sampleSize)} submitted
              results.
            </>
          )
        ) : (
          <>
            <Line label="CPU">
              <Stated value={row.testSystem.cpu} />
            </Line>
            <Line label="Graphics card">
              <Stated value={row.testSystem.gpu} />
            </Line>
            <Line label="Memory">
              <Stated value={row.testSystem.ram} />
            </Line>
            <Line label="OS">
              <Stated value={row.testSystem.os} />
            </Line>
          </>
        )}
      </td>
      <td className={TD_NUMBER}>
        {formatNumber(row.score)}
        {withUnit ? <span translate="no">{`\u00A0${CREATOR_UNITS[row.unit]}`}</span> : null}
      </td>
      <td className={`${TD} min-w-72`}>
        <AnchorSources
          catalogue={catalogue}
          sources={row.sources}
          publishedAt={row.publishedAt}
          notes={row.notes}
        />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------------------------
// The coverage grids

interface CoverageProps {
  readonly grid: CoverageGrid;
  readonly gridKey: 'gpu' | 'cpu' | 'cinebench' | 'blender';
  readonly title: string;
  /** The header over the row names. */
  readonly corner: string;
  readonly rowName: (id: string) => string;
  readonly columnName: (id: string) => string;
  /** The line for an empty cell: in E0, that the catalogue has no anchor there. */
  readonly gap: (cell: GapCell) => ReactNode;
}

function Coverage({ grid, gridKey, title, corner, rowName, columnName, gap }: CoverageProps) {
  const headingId = useId();
  const gapsId = useId();
  const gaps = gapCells(grid);
  const anyOutside = grid.outside.some((count) => count > 0);
  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h3 id={headingId}>{title}</h3>
      <div className={`mt-3 w-fit max-w-full ${PANEL}`}>
        <TableRegion label={title}>
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={`${TH} ${FIRST}`}>
                {corner}
              </th>
              {grid.columns.map((column) => (
                <th key={column} scope="col" className={`${TH_NUMBER} min-w-24`} translate="no">
                  {columnName(column)}
                </th>
              ))}
              {anyOutside ? (
                <th scope="col" className={`${TH_NUMBER} min-w-24`}>
                  Not in the catalogue
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, r) => (
              <tr key={row}>
                <th scope="row" className={`${TH_ROW} min-w-40`} translate="no">
                  {rowName(row)}
                </th>
                {grid.columns.map((column, c) => {
                  const count = grid.counts[r]?.[c] ?? 0;
                  return (
                    <td key={column} className={TD_NUMBER}>
                      {count === 0 ? (
                        <a
                          href={`#${gapId(gridKey, { row, column })}`}
                          className="inline-flex min-h-6 min-w-6 items-center justify-end text-ink-3"
                        >
                          0
                        </a>
                      ) : (
                        // The same 24 px box as a 0's link, so every count sits on one line.
                        <span className="inline-flex min-h-6 items-center">
                          {formatNumber(count)}
                        </span>
                      )}
                    </td>
                  );
                })}
                {anyOutside ? (
                  <td className={TD_NUMBER}>{formatNumber(grid.outside[r] ?? 0)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </TableRegion>
      </div>
      {grid.unlistedRows === 0 ? null : (
        <p className="mt-2 max-w-measure type-small text-ink-2">
          Anchors for a row the catalogue doesn’t list: {formatNumber(grid.unlistedRows)}.
        </p>
      )}
      <h4 id={gapsId} className="mt-4">
        Gaps
      </h4>
      {gaps.length === 0 ? (
        <p className="mt-1 type-small text-ink-2">Every cell has an anchor.</p>
      ) : (
        <ul
          role="list"
          aria-labelledby={gapsId}
          className="mt-1 gap-x-8 type-small text-ink-2 md:columns-2 xl:columns-3"
        >
          {gaps.map((cell) => (
            <li
              key={`${cell.row} ${cell.column}`}
              id={gapId(gridKey, cell)}
              className="mb-1 max-w-measure scroll-mt-4 break-inside-avoid"
            >
              {gap(cell)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NoAnchors({
  model,
  names,
}: {
  readonly model: ReturnType<typeof buildAccuracyModel>;
  readonly names: Names;
}) {
  const headingId = useId();
  const groups = [
    ['Games', model.noAnchors.games.map(names.game)],
    ['GPU chips', model.noAnchors.chips.map(names.chip)],
    ['CPUs', model.noAnchors.cpus.map(names.cpu)],
  ] as const;
  return (
    <section aria-labelledby={headingId} className="mt-10">
      <h3 id={headingId}>No anchor at all</h3>
      <p className="mt-1 max-w-measure type-small text-ink-2">
        A game counts with any game anchor; a GPU chip or a CPU with an anchor that tests it.
      </p>
      <dl className="mt-3 space-y-3 type-small">
        {groups.map(([label, items]) => (
          <div key={label}>
            <dt className="text-ink-2">
              {label} ({formatNumber(items.length)})
            </dt>
            <dd className="max-w-measure text-ink">
              {items.length === 0 ? 'None.' : <span translate="no">{items.join(', ')}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
