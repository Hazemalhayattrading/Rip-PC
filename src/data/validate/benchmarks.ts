import type { CreatorBenchmark } from '../schema/benchmark-creator';
import type { GameBenchmark } from '../schema/benchmark-game';
import { DATA_PATHS } from '../schema/files';
import type { IssueSink } from './issues';
import type { Dataset } from './parse';
import { checkSourcedRecord, type RecordPolicy, type Registry } from './sources';

/** Two rows disagree when they differ by more than this fraction of the lower value. */
export const CONFLICT_THRESHOLD = 0.1;

const GAME_EXEMPT = [
  'id',
  'gameId',
  'limiter',
  'conflictsWith',
  'sources',
  'notes',
  'testSystem.cpu.catalogueId',
  'testSystem.gpu.chipId',
  'testSystem.gpu.cardId',
] as const;

const CREATOR_EXEMPT = ['id', 'subject', 'sources', 'notes'] as const;

function gamePolicy(row: GameBenchmark): RecordPolicy {
  return {
    type: 'benchmark',
    exempt: GAME_EXEMPT,
    nullMeansNone: row.upscaling.method === 'native' ? ['upscaling.mode', 'upscaling.version'] : [],
    publishedAt: row.publishedAt,
  };
}

function creatorPolicy(row: CreatorBenchmark): RecordPolicy {
  const none: string[] = [];
  if (row.aggregate !== null) none.push('testSystem');
  if (row.testSystem !== null) none.push('aggregate');
  if (row.app === 'cinebench-2024') none.push('backend');
  if (row.device === 'cpu') none.push('testSystem.gpu');
  return { type: 'benchmark', exempt: CREATOR_EXEMPT, nullMeansNone: none, publishedAt: row.publishedAt };
}

function differs(a: number, b: number): boolean {
  return Math.abs(a - b) / Math.min(a, b) > CONFLICT_THRESHOLD;
}

function publisherOf(row: { sources: readonly { publisher: string }[] }): string {
  return row.sources[0]?.publisher ?? '';
}

/** Rows from different publishers that measure the same thing and differ by >10% must flag each other. */
function checkConflicts<T extends { id: string; conflictsWith?: readonly string[] | undefined; sources: readonly { publisher: string }[] }>(
  sink: IssueSink,
  file: string,
  rows: readonly T[],
  key: (row: T) => string,
  value: (row: T) => number,
): void {
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const row of rows) {
    for (const other of row.conflictsWith ?? []) {
      const target = byId.get(other);
      if (target === undefined) {
        sink.error('benchmark-conflict', file, `conflictsWith "${other}" is not a row in this file`, row.id, 'conflictsWith');
      } else if (!(target.conflictsWith ?? []).includes(row.id)) {
        sink.error('benchmark-conflict', file, `"${other}" does not flag "${row.id}" back`, row.id, 'conflictsWith');
      }
    }
  }
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (a === undefined || b === undefined) continue;
        if (publisherOf(a) === publisherOf(b) || !differs(value(a), value(b))) continue;
        if (!(a.conflictsWith ?? []).includes(b.id) || !(b.conflictsWith ?? []).includes(a.id)) {
          sink.error(
            'benchmark-conflict',
            file,
            `"${a.id}" (${String(value(a))}) and "${b.id}" (${String(value(b))}) differ by more than 10%; keep both and flag each other in conflictsWith`,
            a.id,
            'conflictsWith',
          );
        }
      }
    }
  }
}

function checkPublishedAt(
  sink: IssueSink,
  file: string,
  row: { id: string; publishedAt: string; sources: readonly { retrievedAt: string }[] },
  today: string,
): void {
  if (row.publishedAt > today) sink.error('date-future', file, `publishedAt ${row.publishedAt} is after today (${today})`, row.id, 'publishedAt');
  row.sources.forEach((s, i) => {
    if (s.retrievedAt < row.publishedAt) {
      sink.error('benchmark-published-at', file, `retrievedAt ${s.retrievedAt} is before publishedAt ${row.publishedAt}`, row.id, `sources.${String(i)}.retrievedAt`);
    }
  });
}

export function checkGameBenchmarks(sink: IssueSink, dataset: Dataset, registry: Registry, today: string): void {
  const rows = dataset.gameBenchmarks;
  if (rows === null) return;
  const file = DATA_PATHS.benchmarks.game;
  const games = dataset.games === null ? null : new Set(dataset.games.games.map((g) => g.id));
  const cpus = dataset.specs.cpu === null ? null : new Set(dataset.specs.cpu.map((c) => c.id));
  const chips = dataset.specs['gpu-chip'] === null ? null : new Set(dataset.specs['gpu-chip'].map((c) => c.id));
  const cards = dataset.specs['gpu-card'] === null ? null : new Map(dataset.specs['gpu-card'].map((c) => [c.id, c]));

  for (const row of rows) {
    checkSourcedRecord(sink, file, row, gamePolicy(row), registry, today);
    checkPublishedAt(sink, file, row, today);
    const ts = row.testSystem;
    if (games !== null && !games.has(row.gameId)) sink.error('ref', file, `gameId "${row.gameId}" is not in ${DATA_PATHS.games}`, row.id, 'gameId');
    if (cpus !== null && ts.cpu.catalogueId !== null && !cpus.has(ts.cpu.catalogueId)) {
      sink.error('ref', file, `CPU "${ts.cpu.catalogueId}" is not in the catalogue`, row.id, 'testSystem.cpu.catalogueId');
    }
    if (chips !== null && ts.gpu.chipId !== null && !chips.has(ts.gpu.chipId)) {
      sink.error('ref', file, `chip "${ts.gpu.chipId}" is not in the catalogue`, row.id, 'testSystem.gpu.chipId');
    }
    if (cards !== null && ts.gpu.cardId !== null) {
      const card = cards.get(ts.gpu.cardId);
      if (card === undefined) sink.error('ref', file, `card "${ts.gpu.cardId}" is not in the catalogue`, row.id, 'testSystem.gpu.cardId');
      else if (card.chipId !== ts.gpu.chipId) {
        sink.error('ref', file, `card "${card.id}" is a ${card.chipId}, not ${ts.gpu.chipId ?? 'null'}`, row.id, 'testSystem.gpu');
      }
    }
    const up = row.upscaling;
    if (up.method === 'native' && (up.mode !== null || up.version !== null)) {
      sink.error('benchmark-conditions', file, 'native rendering has no upscaler mode or version', row.id, 'upscaling');
    }
    if (up.method !== 'native' && up.mode === null) {
      sink.error('benchmark-conditions', file, `upscaling with ${up.method} needs its mode`, row.id, 'upscaling.mode');
    }
    if (row.limiter === 'gpu' && ts.gpu.chipId === null) {
      sink.error('benchmark-conditions', file, 'a GPU-bound anchor must name a catalogue chip', row.id, 'testSystem.gpu.chipId');
    }
    if (row.limiter === 'cpu' && ts.cpu.catalogueId === null) {
      sink.error('benchmark-conditions', file, 'a CPU-bound anchor must name a catalogue CPU', row.id, 'testSystem.cpu.catalogueId');
    }
    if (row.onePercentLowFps !== null && row.onePercentLowFps > row.avgFps) {
      sink.error('sanity', file, '1% low is above the average', row.id, 'onePercentLowFps');
    }
  }

  checkConflicts(
    sink,
    file,
    rows,
    (r) =>
      [
        r.limiter,
        r.limiter === 'gpu' ? r.testSystem.gpu.chipId : `${r.testSystem.cpu.catalogueId ?? ''}+${r.testSystem.gpu.chipName}`,
        r.gameId,
        r.resolution,
        r.preset.trim().toLowerCase(),
        r.rayTracing,
        r.upscaling.method,
        r.upscaling.mode ?? '',
      ].join('|'),
    (r) => r.avgFps,
  );
}

export function checkCreatorBenchmarks(sink: IssueSink, dataset: Dataset, registry: Registry, today: string): void {
  const rows = dataset.creatorBenchmarks;
  if (rows === null) return;
  const file = DATA_PATHS.benchmarks.creator;
  const cpus = dataset.specs.cpu === null ? null : new Set(dataset.specs.cpu.map((c) => c.id));
  const chips = dataset.specs['gpu-chip'] === null ? null : new Set(dataset.specs['gpu-chip'].map((c) => c.id));

  for (const row of rows) {
    checkSourcedRecord(sink, file, row, creatorPolicy(row), registry, today);
    checkPublishedAt(sink, file, row, today);
    const s = row.subject;
    if (s.type === 'cpu' && cpus !== null && !cpus.has(s.cpuId)) sink.error('ref', file, `CPU "${s.cpuId}" is not in the catalogue`, row.id, 'subject');
    if (s.type === 'gpu' && chips !== null && !chips.has(s.chipId)) sink.error('ref', file, `chip "${s.chipId}" is not in the catalogue`, row.id, 'subject');
    if (s.type !== row.device) sink.error('benchmark-conditions', file, `device ${row.device} does not match subject ${s.type}`, row.id, 'subject');
    if ((row.aggregate === null) === (row.testSystem === null)) {
      sink.error('benchmark-conditions', file, 'set exactly one of aggregate (database median) or testSystem (review bench)', row.id);
    }
    if ((row.app === 'cinebench-2024') !== (row.backend === null)) {
      sink.error('benchmark-conditions', file, 'backend is set for Blender and null for Cinebench', row.id, 'backend');
    }
    const unit = row.app === 'blender' ? 'samples-per-minute' : 'points';
    if (row.unit !== unit) sink.error('benchmark-conditions', file, `${row.app} scores are in ${unit}`, row.id, 'unit');
  }

  checkConflicts(
    sink,
    file,
    rows,
    (r) =>
      [r.app, r.appVersion, r.test, r.backend ?? '', r.subject.type === 'cpu' ? r.subject.cpuId : r.subject.chipId].join('|'),
    (r) => r.score,
  );
}
