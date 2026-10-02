/**
 * Counting the benchmark anchors for the lab's accuracy page (plan §1 and WP-E0): coverage
 * grids of games × GPU chips, games × CPUs, Cinebench rows per CPU and Blender rows per GPU
 * chip, and the games, chips and CPUs that have no anchor at all. Pure: it reads the catalogue
 * it is given.
 *
 * No anchor is ever dropped. One whose test part is outside the catalogue (a `null` id, or an id
 * the catalogue doesn't list) is counted in its row's `outside` count; one whose row itself is
 * not listed (a game that isn't in the games list) in `unlistedRows`. So every grid's cells,
 * `outside` and `unlistedRows` add up to `total`.
 */
import type { CreatorBenchmark, GameBenchmark } from '../../data/schema';
import type { Catalogue } from '../../engine/types';

/** Anchor counts by row and column. */
export interface CoverageGrid {
  /** Row ids, in catalogue order: games, or parts for the creator grids. */
  readonly rows: readonly string[];
  /** Column ids, in catalogue order: parts, or the creator tests (sorted). */
  readonly columns: readonly string[];
  /** `counts[r][c]`: anchors for `rows[r]` and `columns[c]`. */
  readonly counts: readonly (readonly number[])[];
  /** Per row: anchors whose column part is outside the catalogue. */
  readonly outside: readonly number[];
  /** Anchors whose row is not in the catalogue. */
  readonly unlistedRows: number;
  /** Every anchor the grid counts. */
  readonly total: number;
}

export interface AccuracyModel {
  readonly gameAnchors: number;
  readonly creatorAnchors: number;
  /** GPU-bound game anchors, by game and the test system's GPU chip. */
  readonly gpuBound: CoverageGrid;
  /** CPU-bound game anchors, by game and the test system's CPU. */
  readonly cpuBound: CoverageGrid;
  /** Cinebench 2024 rows run on a CPU, by CPU and test. */
  readonly cinebench: CoverageGrid;
  /** Blender rows run on a GPU, by GPU chip and test. */
  readonly blender: CoverageGrid;
  /** Creator rows in neither creator grid, such as Blender on a CPU. */
  readonly otherCreatorRows: number;
  /**
   * What has no anchor at all, in catalogue order. A game counts with any game row; a GPU chip
   * with a GPU-bound game row or a creator row run on it; a CPU with a CPU-bound game row or a
   * creator row run on it. The bench CPU of a GPU-bound row is not anchored by it: that row
   * measures the GPU.
   */
  readonly noAnchors: {
    readonly games: readonly string[];
    readonly chips: readonly string[];
    readonly cpus: readonly string[];
  };
}

interface GridSpec<T> {
  readonly rows: readonly string[];
  readonly columns: readonly string[];
  readonly anchors: readonly T[];
  readonly rowOf: (anchor: T) => string;
  /** `null` when the anchor's part is not in the catalogue. */
  readonly columnOf: (anchor: T) => string | null;
}

function countGrid<T>({ rows, columns, anchors, rowOf, columnOf }: GridSpec<T>): CoverageGrid {
  const rowIndex = new Map(rows.map((id, i) => [id, i]));
  const columnIndex = new Map(columns.map((id, i) => [id, i]));
  const counts = rows.map(() => columns.map(() => 0));
  const outside = rows.map(() => 0);
  let unlistedRows = 0;
  for (const anchor of anchors) {
    const r = rowIndex.get(rowOf(anchor));
    const row = r === undefined ? undefined : counts[r];
    if (r === undefined || row === undefined) {
      unlistedRows += 1;
      continue;
    }
    const column = columnOf(anchor);
    const c = column === null ? undefined : columnIndex.get(column);
    if (c === undefined) outside[r] = (outside[r] ?? 0) + 1;
    else row[c] = (row[c] ?? 0) + 1;
  }
  return { rows, columns, counts, outside, unlistedRows, total: anchors.length };
}

/** The count in one cell, or 0 when the row or column isn't in the grid. */
export function cellCount(grid: CoverageGrid, row: string, column: string): number {
  return grid.counts[grid.rows.indexOf(row)]?.[grid.columns.indexOf(column)] ?? 0;
}

/** A row's anchors, its `outside` count included. */
export function rowTotal(grid: CoverageGrid, rowIndex: number): number {
  const cells = grid.counts[rowIndex] ?? [];
  return cells.reduce((sum, count) => sum + count, grid.outside[rowIndex] ?? 0);
}

/** A column's anchors. */
export function columnTotal(grid: CoverageGrid, columnIndex: number): number {
  return grid.counts.reduce((sum, row) => sum + (row[columnIndex] ?? 0), 0);
}

/** The rows with no anchor in this grid, outside ones included. */
export function emptyRows(grid: CoverageGrid): string[] {
  return grid.rows.filter((_, i) => rowTotal(grid, i) === 0);
}

/** The columns with no anchor in this grid. */
export function emptyColumns(grid: CoverageGrid): string[] {
  return grid.columns.filter((_, i) => columnTotal(grid, i) === 0);
}

function sortedTests(rows: readonly CreatorBenchmark[]): string[] {
  return [...new Set(rows.map((row) => row.test))].sort();
}

function subjectCpu(row: CreatorBenchmark): string | null {
  return row.subject.type === 'cpu' ? row.subject.cpuId : null;
}

function subjectChip(row: CreatorBenchmark): string | null {
  return row.subject.type === 'gpu' ? row.subject.chipId : null;
}

export function buildAccuracyModel(catalogue: Catalogue): AccuracyModel {
  const games = catalogue.games.map((game) => game.id);
  const chips = catalogue.parts['gpu-chip'].map((chip) => chip.id);
  const cpus = catalogue.parts.cpu.map((cpu) => cpu.id);
  const gpuRows = catalogue.gameBenchmarks.filter((row) => row.limiter === 'gpu');
  const cpuRows = catalogue.gameBenchmarks.filter((row) => row.limiter === 'cpu');
  const cinebenchRows = catalogue.creatorBenchmarks.filter(
    (row) => row.app === 'cinebench-2024' && row.subject.type === 'cpu',
  );
  const blenderRows = catalogue.creatorBenchmarks.filter(
    (row) => row.app === 'blender' && row.subject.type === 'gpu',
  );

  const byGame = (row: GameBenchmark): string => row.gameId;
  const gpuBound = countGrid({
    rows: games,
    columns: chips,
    anchors: gpuRows,
    rowOf: byGame,
    columnOf: (row) => row.testSystem.gpu.chipId,
  });
  const cpuBound = countGrid({
    rows: games,
    columns: cpus,
    anchors: cpuRows,
    rowOf: byGame,
    columnOf: (row) => row.testSystem.cpu.catalogueId,
  });
  const cinebench = countGrid({
    rows: cpus,
    columns: sortedTests(cinebenchRows),
    anchors: cinebenchRows,
    rowOf: (row) => subjectCpu(row) ?? '',
    columnOf: (row) => row.test,
  });
  const blender = countGrid({
    rows: chips,
    columns: sortedTests(blenderRows),
    anchors: blenderRows,
    rowOf: (row) => subjectChip(row) ?? '',
    columnOf: (row) => row.test,
  });

  const anchoredGames = new Set(catalogue.gameBenchmarks.map((row) => row.gameId));
  const anchoredChips = new Set<string | null>([
    ...gpuRows.map((row) => row.testSystem.gpu.chipId),
    ...catalogue.creatorBenchmarks.map(subjectChip),
  ]);
  const anchoredCpus = new Set<string | null>([
    ...cpuRows.map((row) => row.testSystem.cpu.catalogueId),
    ...catalogue.creatorBenchmarks.map(subjectCpu),
  ]);

  return {
    gameAnchors: catalogue.gameBenchmarks.length,
    creatorAnchors: catalogue.creatorBenchmarks.length,
    gpuBound,
    cpuBound,
    cinebench,
    blender,
    otherCreatorRows:
      catalogue.creatorBenchmarks.length - cinebenchRows.length - blenderRows.length,
    noAnchors: {
      games: games.filter((id) => !anchoredGames.has(id)),
      chips: chips.filter((id) => !anchoredChips.has(id)),
      cpus: cpus.filter((id) => !anchoredCpus.has(id)),
    },
  };
}
