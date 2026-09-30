import type * as z from 'zod';
import { CreatorBenchmarkFile, type CreatorBenchmark } from '../schema/benchmark-creator';
import { GameBenchmarkFile, type GameBenchmark } from '../schema/benchmark-game';
import { MARKETS, type Market } from '../schema/common';
import {
  DATA_PATHS,
  SPEC_CATEGORIES,
  SPEC_FILE_SCHEMAS,
  type SpecCategory,
  type SpecRecordByCategory,
} from '../schema/files';
import { GamesFile } from '../schema/game';
import { PriceFile } from '../schema/price';
import { PublisherFile, type Publisher } from '../schema/publisher';
import type { IssueSink, RuleId } from './issues';

/** Parsed data. A section is `null` when its file is missing or fails its schema. */
export interface Dataset {
  publishers: Publisher[] | null;
  specs: { [C in SpecCategory]: SpecRecordByCategory[C][] | null };
  prices: Record<Market, PriceFile | null>;
  games: GamesFile | null;
  gameBenchmarks: GameBenchmark[] | null;
  creatorBenchmarks: CreatorBenchmark[] | null;
}

type FileKind = 'publishers' | 'spec' | 'price' | 'games' | 'benchmark';
type ZodIssue = z.core.$ZodIssue;

/** Maps a schema issue onto the rule it breaks, so Owner's-rule failures report under their own ID. */
function classify(kind: FileKind, issue: ZodIssue): RuleId {
  const path = issue.path.map(String);
  const last = path[path.length - 1];
  if (kind === 'price') {
    if (issue.code === 'unrecognized_keys' && issue.keys.includes('archiveUrl')) return 'price-archive';
    if (path[0] === 'gaps' && last === 'reason') return 'price-gap-reason';
  }
  if (kind === 'benchmark' && last === 'publishedAt') return 'benchmark-published-at';
  if (issue.code === 'invalid_format' && last !== undefined && (last === 'id' || /Ids?$/.test(last))) {
    return 'id-kebab';
  }
  return 'schema';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Finds the `id` (or `partId`) of the record a schema issue sits in, for readable reports. */
function recordIdAt(raw: unknown, path: readonly PropertyKey[]): string | undefined {
  let node: unknown = raw;
  let found: string | undefined;
  for (const key of path) {
    if (Array.isArray(node) && typeof key === 'number') node = node[key];
    else if (isRecord(node) && typeof key === 'string') node = node[key];
    else break;
    if (isRecord(node)) {
      const id = node.id ?? node.partId;
      if (typeof id === 'string') found = id;
    }
  }
  return found;
}

function parseFile<S extends z.ZodType>(
  sink: IssueSink,
  file: string,
  raw: unknown,
  schema: S,
  kind: FileKind,
): z.output<S> | null {
  if (raw === undefined) {
    sink.error('file-missing', file, 'file not found');
    return null;
  }
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    const path = issue.path.map(String).join('.');
    const keys = issue.code === 'unrecognized_keys' ? ` (${issue.keys.join(', ')})` : '';
    sink.error(classify(kind, issue), file, `${issue.message}${keys}`, recordIdAt(raw, issue.path), path);
  }
  return null;
}

/** Parses every data file. `files` maps repo-relative paths (as in DATA_PATHS) to parsed JSON. */
export function parseDataset(files: Readonly<Record<string, unknown>>, sink: IssueSink): Dataset {
  const publishers = parseFile(sink, DATA_PATHS.publishers, files[DATA_PATHS.publishers], PublisherFile, 'publishers');

  const specs: Partial<Record<SpecCategory, unknown>> = {};
  for (const category of SPEC_CATEGORIES) {
    const path = DATA_PATHS.specs[category];
    const parsed = parseFile(sink, path, files[path], SPEC_FILE_SCHEMAS[category], 'spec');
    specs[category] = parsed === null ? null : parsed.items;
  }

  const prices: Partial<Record<Market, PriceFile | null>> = {};
  for (const market of MARKETS) {
    const path = DATA_PATHS.prices[market];
    prices[market] = parseFile(sink, path, files[path], PriceFile, 'price');
  }

  const games = parseFile(sink, DATA_PATHS.games, files[DATA_PATHS.games], GamesFile, 'games');
  const gameBench = parseFile(
    sink,
    DATA_PATHS.benchmarks.game,
    files[DATA_PATHS.benchmarks.game],
    GameBenchmarkFile,
    'benchmark',
  );
  const creatorBench = parseFile(
    sink,
    DATA_PATHS.benchmarks.creator,
    files[DATA_PATHS.benchmarks.creator],
    CreatorBenchmarkFile,
    'benchmark',
  );

  return {
    publishers: publishers === null ? null : publishers.publishers,
    specs: specs as Dataset['specs'],
    prices: prices as Dataset['prices'],
    games,
    gameBenchmarks: gameBench === null ? null : gameBench.items,
    creatorBenchmarks: creatorBench === null ? null : creatorBench.items,
  };
}
