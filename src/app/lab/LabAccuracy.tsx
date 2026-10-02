import { useId, useMemo, type ReactNode } from 'react';
import { Link } from 'wouter';
import type { CreatorBenchmark, GameBenchmark } from '../../data/schema';
import type { Catalogue } from '../../engine/types';
import type { RigBuild } from '../../state/build-codec';
import { buildStore, encodeSelections } from '../../state/build-store';
import type { PartCategory } from '../../state/categories';
import { useBuild } from '../build-hooks';
import {
  buildAccuracyModel,
  columnTotal,
  emptyColumns,
  emptyRows,
  rowTotal,
  type AccuracyModel,
  type CoverageGrid,
} from './accuracy-model';
import { labPartsHref } from './lab-links';
import {
  formatSpecValue,
  partLabel,
  rayTracingLabel,
  resolutionLabel,
  upscalingLabel,
} from './lab-text';
import { NoteList } from './NoteList';
import { findRecord } from './parts-model';
import { SourceRefs } from './SourceRefs';
import { LabTable, TD, TD_NUMBER, TH, TH_ROW } from './TableRegion';

const NBSP = ' ';

/** Names for the grids' rows and columns: games, GPU chips and CPUs, as the catalogue writes them. */
interface Names {
  readonly game: (id: string) => string;
  readonly chip: (id: string) => string;
  readonly cpu: (id: string) => string;
}

function namesOf(catalogue: Catalogue): Names {
  const games = new Map(catalogue.games.map((game) => [game.id, game.title]));
  const chips = new Map(catalogue.parts['gpu-chip'].map((chip) => [chip.id, partLabel(chip)]));
  const cpus = new Map(catalogue.parts.cpu.map((cpu) => [cpu.id, partLabel(cpu)]));
  return {
    game: (id) => games.get(id) ?? id,
    chip: (id) => chips.get(id) ?? id,
    cpu: (id) => cpus.get(id) ?? id,
  };
}

/**
 * `/lab/accuracy`: every benchmark anchor with its source, the coverage grids, and what has no
 * anchor yet. WP-E3 adds the model's estimate and its error to each anchor.
 */
export function LabAccuracy({ catalogue }: { readonly catalogue: Catalogue }) {
  const model = useMemo(() => buildAccuracyModel(catalogue), [catalogue]);
  const names = useMemo(() => namesOf(catalogue), [catalogue]);
  const build = useBuild((state) => state.selections);
  const coverageId = useId();
  const gameId = useId();
  const creatorId = useId();
  const gamesId = useId();
  return (
    <>
      <p className="mt-10 max-w-prose">
        All {model.gameAnchors + model.creatorAnchors} benchmark anchors: {model.gameAnchors} game
        rows and {model.creatorAnchors} creator rows. Each is a published result, with its test
        settings, its test system and its source. Frame generation is off in every game row.
      </p>

      <section aria-labelledby={coverageId} className="mt-10">
        <h2 id={coverageId}>Coverage</h2>
        <p className="mt-2 max-w-prose text-ink-2">
          Each cell counts anchors. A GPU-bound row anchors its GPU chip, and a CPU-bound row its
          CPU. A row whose test part is outside the catalogue is counted in its own column, never
          dropped.
        </p>
        <CoverageTable
          grid={model.gpuBound}
          caption={`GPU-bound game anchors by game and GPU chip (${String(model.gpuBound.total)})`}
          corner="Game"
          rowName={names.game}
          columnName={names.chip}
          outsideLabel="Chip not in the catalogue"
          unlistedLabel="GPU-bound anchors for a game the catalogue does not list"
        />
        <EmptyLines
          lines={[
            ['Games without a GPU-bound anchor', emptyRows(model.gpuBound).map(names.game)],
            ['GPU chips without a GPU-bound anchor', emptyColumns(model.gpuBound).map(names.chip)],
          ]}
        />
        <CoverageTable
          grid={model.cpuBound}
          caption={`CPU-bound game anchors by game and CPU (${String(model.cpuBound.total)})`}
          corner="Game"
          rowName={names.game}
          columnName={names.cpu}
          outsideLabel="CPU not in the catalogue"
          unlistedLabel="CPU-bound anchors for a game the catalogue does not list"
        />
        <EmptyLines
          lines={[
            ['Games without a CPU-bound anchor', emptyRows(model.cpuBound).map(names.game)],
            ['CPUs without a CPU-bound anchor', emptyColumns(model.cpuBound).map(names.cpu)],
          ]}
        />
        <CoverageTable
          grid={model.cinebench}
          caption={`Cinebench 2024 rows by CPU and test (${String(model.cinebench.total)})`}
          corner="CPU"
          rowName={names.cpu}
          columnName={(test) => test}
          outsideLabel={null}
          unlistedLabel="Cinebench rows for a CPU the catalogue does not list"
        />
        <EmptyLines
          lines={[['CPUs without a Cinebench row', emptyRows(model.cinebench).map(names.cpu)]]}
        />
        <CoverageTable
          grid={model.blender}
          caption={`Blender rows by GPU chip and test (${String(model.blender.total)})`}
          corner="GPU chip"
          rowName={names.chip}
          columnName={(test) => test}
          outsideLabel={null}
          unlistedLabel="Blender rows for a chip the catalogue does not list"
        />
        <EmptyLines
          lines={[['GPU chips without a Blender row', emptyRows(model.blender).map(names.chip)]]}
        />
        <p className="mt-4 max-w-prose type-small text-ink-2">
          Creator rows in neither creator grid (such as Blender on a CPU): {model.otherCreatorRows}.
        </p>
        <NoAnchors model={model} names={names} />
      </section>

      <section aria-labelledby={gameId} className="mt-12">
        <h2 id={gameId}>Game anchors ({catalogue.gameBenchmarks.length})</h2>
        <GameAnchors catalogue={catalogue} names={names} build={build} labelledBy={gameId} />
      </section>

      <section aria-labelledby={creatorId} className="mt-12">
        <h2 id={creatorId}>Creator anchors ({catalogue.creatorBenchmarks.length})</h2>
        <CreatorAnchors catalogue={catalogue} names={names} build={build} labelledBy={creatorId} />
      </section>

      <section aria-labelledby={gamesId} className="mt-12">
        <h2 id={gamesId}>Games in the catalogue ({catalogue.games.length})</h2>
        <GamesTable catalogue={catalogue} labelledBy={gamesId} />
      </section>
    </>
  );
}

interface CoverageTableProps {
  readonly grid: CoverageGrid;
  readonly caption: string;
  /** The header over the row names. */
  readonly corner: string;
  readonly rowName: (id: string) => string;
  readonly columnName: (id: string) => string;
  /** The header of the column that counts anchors outside the catalogue, or `null` for none. */
  readonly outsideLabel: string | null;
  readonly unlistedLabel: string;
}

function CoverageTable({
  grid,
  caption,
  corner,
  rowName,
  columnName,
  outsideLabel,
  unlistedLabel,
}: CoverageTableProps) {
  const outsideTotal = grid.outside.reduce((sum, count) => sum + count, 0);
  return (
    <div className="mt-8">
      <LabTable caption={caption}>
        <thead>
          <tr>
            <th scope="col" className={TH}>
              {corner}
            </th>
            {grid.columns.map((column) => (
              <th key={column} scope="col" className={`${TH} min-w-16 text-right`}>
                {columnName(column)}
              </th>
            ))}
            {outsideLabel === null ? null : (
              <th scope="col" className={`${TH} min-w-16 text-right`}>
                {outsideLabel}
              </th>
            )}
            <th scope="col" className={`${TH} text-right`}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row, r) => (
            <tr key={row}>
              <th scope="row" className={`${TH_ROW} min-w-40`}>
                {rowName(row)}
              </th>
              {grid.columns.map((column, c) => (
                <Count key={column} value={grid.counts[r]?.[c] ?? 0} />
              ))}
              {outsideLabel === null ? null : <Count value={grid.outside[r] ?? 0} />}
              <Count value={rowTotal(grid, r)} total />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className={TH}>
              Total
            </th>
            {grid.columns.map((column, c) => (
              <Count key={column} value={columnTotal(grid, c)} total />
            ))}
            {outsideLabel === null ? null : <Count value={outsideTotal} total />}
            <Count value={grid.total - grid.unlistedRows} total />
          </tr>
        </tfoot>
      </LabTable>
      <p className="mt-2 type-small text-ink-2">
        {unlistedLabel}: {grid.unlistedRows}.
      </p>
    </div>
  );
}

/** A count, with 0 written out: a zero is a gap in coverage, never a blank. */
function Count({ value, total = false }: { readonly value: number; readonly total?: boolean }) {
  const tone = value === 0 ? 'text-ink-3' : '';
  return <td className={`${TD_NUMBER} ${tone} ${total ? 'font-semibold' : ''}`}>{value}</td>;
}

function EmptyLines({
  lines,
}: {
  readonly lines: readonly (readonly [string, readonly string[]])[];
}) {
  return (
    <ul role="list" className="mt-2 max-w-prose space-y-1 type-small">
      {lines.map(([label, items]) => (
        <li key={label}>
          {label} ({items.length}): {items.length === 0 ? 'none' : items.join(', ')}.
        </li>
      ))}
    </ul>
  );
}

function NoAnchors({ model, names }: { readonly model: AccuracyModel; readonly names: Names }) {
  const headingId = useId();
  const groups = [
    ['Games', model.noAnchors.games.map(names.game)],
    ['GPU chips', model.noAnchors.chips.map(names.chip)],
    ['CPUs', model.noAnchors.cpus.map(names.cpu)],
  ] as const;
  return (
    <section aria-labelledby={headingId} className="mt-10 max-w-prose">
      <h3 id={headingId}>No anchor at all yet</h3>
      <p className="mt-1 text-ink-2">
        A game counts with any game row; a GPU chip with a GPU-bound game row or a creator row run
        on it; a CPU with a CPU-bound game row or a creator row run on it.
      </p>
      <dl className="mt-3 space-y-2">
        {groups.map(([label, items]) => (
          <div key={label}>
            <dt className="type-label">
              {label} ({items.length})
            </dt>
            <dd>{items.length === 0 ? 'None: each has at least one anchor.' : items.join(', ')}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** A link to the parts page with this part picked in the build. */
function PartLink({
  build,
  category,
  id,
  children,
}: {
  readonly build: RigBuild;
  readonly category: PartCategory;
  readonly id: string;
  readonly children: ReactNode;
}) {
  return (
    <Link
      href={labPartsHref(encodeSelections({ ...build, [category]: id }))}
      onClick={() => {
        // The store leads and the URL follows (src/state/url-sync.ts), so pick first.
        buildStore.getState().select(category, id);
      }}
    >
      {children}
    </Link>
  );
}

/** A link to the parts page with this GPU chip shown on its own. */
function ChipLink({
  build,
  id,
  children,
}: {
  readonly build: RigBuild;
  readonly id: string;
  readonly children: ReactNode;
}) {
  return <Link href={labPartsHref(encodeSelections(build), id)}>{children}</Link>;
}

/** A labelled line inside a table cell. */
function Line({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <span className="block">
      <span className="text-ink-2">{label}:</span> {children}
    </span>
  );
}

function fps(value: number): string {
  return `${formatSpecValue(value)}${NBSP}fps`;
}

interface AnchorTableProps {
  readonly catalogue: Catalogue;
  readonly names: Names;
  readonly build: RigBuild;
}

function GameAnchors({
  catalogue,
  names,
  build,
  labelledBy,
}: AnchorTableProps & { readonly labelledBy: string }) {
  return (
    <LabTable
      caption={`Game anchors (${String(catalogue.gameBenchmarks.length)})`}
      labelledBy={labelledBy}
      className="w-full min-w-5xl"
    >
      <thead>
        <tr>
          <th scope="col" className={`${TH} min-w-48`}>
            Anchor
          </th>
          <th scope="col" className={`${TH} min-w-36`}>
            Game and scene
          </th>
          <th scope="col" className={`${TH} min-w-48`}>
            Settings
          </th>
          <th scope="col" className={`${TH} min-w-56`}>
            Test system
          </th>
          <th scope="col" className={`${TH} min-w-36`}>
            Result
          </th>
          <th scope="col" className={`${TH} min-w-64`}>
            Source
          </th>
          <th scope="col" className={`${TH} min-w-64`}>
            Notes
          </th>
        </tr>
      </thead>
      <tbody>
        {catalogue.gameBenchmarks.map((row) => (
          <GameAnchorRow key={row.id} catalogue={catalogue} names={names} build={build} row={row} />
        ))}
      </tbody>
    </LabTable>
  );
}

function GameAnchorRow({
  catalogue,
  names,
  build,
  row,
}: AnchorTableProps & { readonly row: GameBenchmark }) {
  const { cpu, gpu } = row.testSystem;
  return (
    <tr>
      <th scope="row" className={`${TH_ROW} min-w-48`}>
        <code>{row.id}</code>
        <span className="mt-1 block text-ink-2">
          {row.limiter === 'gpu' ? 'GPU-bound' : 'CPU-bound'}
        </span>
      </th>
      <td className={TD}>
        {names.game(row.gameId)}
        <Line label="Scene">{row.scene ?? 'not stated'}</Line>
        <Line label="Game version">{row.gameVersion ?? 'not stated'}</Line>
      </td>
      <td className={TD}>
        <Line label="Resolution">{resolutionLabel(row.resolution)}</Line>
        <Line label="Preset">{row.preset}</Line>
        <Line label="Ray tracing">{rayTracingLabel(row.rayTracing)}</Line>
        <Line label="Upscaling">{upscalingLabel(row.upscaling)}</Line>
        <Line label="Frame generation">Off</Line>
      </td>
      <td className={TD}>
        <Line label="CPU">
          {cpu.catalogueId === null ? (
            `${cpu.name} (not in the catalogue)`
          ) : (
            <PartLink build={build} category="cpu" id={cpu.catalogueId}>
              {cpu.name}
            </PartLink>
          )}
        </Line>
        <Line label="Graphics card">
          {gpu.cardId === null ? (
            gpu.card
          ) : (
            <PartLink build={build} category="gpu-card" id={gpu.cardId}>
              {gpu.card}
            </PartLink>
          )}
        </Line>
        <Line label="GPU chip">
          {gpu.chipId === null ? (
            `${gpu.chipName} (not in the catalogue)`
          ) : (
            <ChipLink build={build} id={gpu.chipId}>
              {gpu.chipName}
            </ChipLink>
          )}
        </Line>
        <Line label="RAM">{row.testSystem.ram}</Line>
        <Line label="Motherboard">{row.testSystem.motherboard ?? 'not stated'}</Line>
        <Line label="OS">{row.testSystem.os ?? 'not stated'}</Line>
        <Line label="GPU driver">{row.testSystem.gpuDriver ?? 'not stated'}</Line>
      </td>
      <td className={`${TD} whitespace-nowrap`}>
        <Line label="Average">{fps(row.avgFps)}</Line>
        <Line label="1% low">
          {row.onePercentLowFps === null ? 'not published' : fps(row.onePercentLowFps)}
        </Line>
      </td>
      <td className={`${TD} min-w-56`}>
        <Line label="Published">{row.publishedAt}</Line>
        <div className="mt-2">
          <SourceRefs catalogue={catalogue} sources={row.sources} />
        </div>
      </td>
      <td className={`${TD} min-w-56`}>
        {row.notes === undefined ? null : <NoteList notes={row.notes} />}
        {row.conflictsWith === undefined ? null : (
          <span className="mt-1 block">
            Differs by more than 10% from: {row.conflictsWith.join(', ')}
          </span>
        )}
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
  build,
  labelledBy,
}: AnchorTableProps & { readonly labelledBy: string }) {
  return (
    <LabTable
      caption={`Creator anchors (${String(catalogue.creatorBenchmarks.length)})`}
      labelledBy={labelledBy}
      className="w-full min-w-5xl"
    >
      <thead>
        <tr>
          <th scope="col" className={`${TH} min-w-48`}>
            Anchor
          </th>
          <th scope="col" className={`${TH} min-w-44`}>
            App and test
          </th>
          <th scope="col" className={`${TH} min-w-36`}>
            Tested part
          </th>
          <th scope="col" className={`${TH} min-w-40`}>
            Result
          </th>
          <th scope="col" className={`${TH} min-w-56`}>
            Test system
          </th>
          <th scope="col" className={`${TH} min-w-64`}>
            Source
          </th>
          <th scope="col" className={`${TH} min-w-64`}>
            Notes
          </th>
        </tr>
      </thead>
      <tbody>
        {catalogue.creatorBenchmarks.map((row) => (
          <CreatorAnchorRow
            key={row.id}
            catalogue={catalogue}
            names={names}
            build={build}
            row={row}
          />
        ))}
      </tbody>
    </LabTable>
  );
}

function CreatorAnchorRow({
  catalogue,
  names,
  build,
  row,
}: AnchorTableProps & { readonly row: CreatorBenchmark }) {
  const { subject } = row;
  return (
    <tr>
      <th scope="row" className={`${TH_ROW} min-w-48`}>
        <code>{row.id}</code>
      </th>
      <td className={TD}>
        {CREATOR_APPS[row.app]} {row.appVersion}
        <Line label="Test">{row.test}</Line>
        <Line label="Runs on">{row.device === 'cpu' ? 'CPU' : 'GPU'}</Line>
        <Line label="Backend">{row.backend ?? 'not applicable'}</Line>
      </td>
      <td className={TD}>
        {subject.type === 'cpu' ? (
          findRecord(catalogue, 'cpu', subject.cpuId) === null ? (
            `${subject.cpuId} (not in the catalogue)`
          ) : (
            <PartLink build={build} category="cpu" id={subject.cpuId}>
              {names.cpu(subject.cpuId)}
            </PartLink>
          )
        ) : findRecord(catalogue, 'gpu-chip', subject.chipId) === null ? (
          `${subject.chipId} (not in the catalogue)`
        ) : (
          <ChipLink build={build} id={subject.chipId}>
            {names.chip(subject.chipId)}
          </ChipLink>
        )}
      </td>
      <td className={TD}>
        <span className="block whitespace-nowrap">
          {formatSpecValue(row.score)}
          {NBSP}
          {CREATOR_UNITS[row.unit]}
        </span>
        <span className="mt-1 block text-ink-2">
          {row.aggregate === null
            ? 'One published result'
            : `The ${row.aggregate.statistic} of ${formatSpecValue(row.aggregate.sampleSize)} submitted results`}
        </span>
      </td>
      <td className={TD}>
        {row.testSystem === null ? (
          'A database aggregate across many systems: no single test system.'
        ) : (
          <>
            <Line label="CPU">{row.testSystem.cpu}</Line>
            <Line label="GPU">{row.testSystem.gpu ?? 'not stated'}</Line>
            <Line label="RAM">{row.testSystem.ram ?? 'not stated'}</Line>
            <Line label="OS">{row.testSystem.os ?? 'not stated'}</Line>
          </>
        )}
      </td>
      <td className={`${TD} min-w-56`}>
        <Line label="Published">{row.publishedAt}</Line>
        <div className="mt-2">
          <SourceRefs catalogue={catalogue} sources={row.sources} />
        </div>
      </td>
      <td className={`${TD} min-w-56`}>
        {row.notes === undefined ? null : <NoteList notes={row.notes} />}
      </td>
    </tr>
  );
}

function GamesTable({
  catalogue,
  labelledBy,
}: {
  readonly catalogue: Catalogue;
  readonly labelledBy: string;
}) {
  return (
    <LabTable
      caption={`Games in the catalogue (${String(catalogue.games.length)})`}
      labelledBy={labelledBy}
      className="w-full min-w-5xl"
    >
      <thead>
        <tr>
          <th scope="col" className={TH}>
            Game
          </th>
          <th scope="col" className={TH}>
            On the list
          </th>
          <th scope="col" className={TH}>
            Release
          </th>
          <th scope="col" className={TH}>
            Why it is listed
          </th>
          <th scope="col" className={TH}>
            Player counts
          </th>
          <th scope="col" className={TH}>
            Sources
          </th>
          <th scope="col" className={TH}>
            Notes
          </th>
        </tr>
      </thead>
      <tbody>
        {catalogue.games.map((game) => (
          <tr key={game.id}>
            <th scope="row" className={`${TH_ROW} min-w-40`}>
              {game.title}
              <code className="mt-1 block text-ink-2">{game.id}</code>
            </th>
            <td className={TD}>
              <Line label="Status">{game.listStatus}</Line>
              <Line label="Replaces">{game.replaces ?? 'nothing'}</Line>
              <Line label="Franchise slot">{game.franchiseSlot ?? 'none'}</Line>
            </td>
            <td className={TD}>
              <Line label="Released">{game.releaseDate ?? 'not stated'}</Line>
              <Line label="Steam app">
                {game.steamAppId === null ? 'not on Steam' : String(game.steamAppId)}
              </Line>
            </td>
            <td className={`${TD} min-w-56`}>{game.inclusionReason}</td>
            <td className={`${TD} min-w-56`}>
              <ul role="list" className="space-y-1">
                {game.playerCounts.map((count, index) => (
                  <li key={`${String(index)} ${count.metric}`}>
                    {formatSpecValue(count.value)} <code>{count.metric}</code>, {count.scope}, as of{' '}
                    {count.asOf}
                    {count.period === null ? '' : ` (${count.period})`}
                  </li>
                ))}
              </ul>
            </td>
            <td className={`${TD} min-w-56`}>
              <SourceRefs catalogue={catalogue} sources={game.sources} />
            </td>
            <td className={`${TD} min-w-56`}>
              {game.notes === undefined ? null : <NoteList notes={game.notes} />}
            </td>
          </tr>
        ))}
      </tbody>
    </LabTable>
  );
}
