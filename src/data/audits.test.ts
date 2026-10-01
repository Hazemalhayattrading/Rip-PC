import { describe, expect, it } from 'vitest';
import { AuditFile, type AuditBatchName } from './schema/audit';
import type { Market } from './schema/common';
import { DATA_PATHS, type SpecCategory } from './schema/files';
import { utcToday, validateFiles } from './validate';

/**
 * The data lead's seeded audits (`data/audits.json`): each batch draws ceil(20%), and every sampled item and
 * finding points at real data. A price item can change kind after a fix (a gap that is now priced); a finding
 * must then cover it.
 */

const modules = import.meta.glob<unknown>('../../data/**/*.json', { eager: true, import: 'default' });
const files = Object.fromEntries(
  Object.entries(modules).map(([path, json]) => [path.replace(/^(?:\.\.\/)+/, ''), json]),
);
const { dataset } = validateFiles(files, { today: utcToday() });
const parsed = AuditFile.safeParse(files[DATA_PATHS.audits]);
const audits = (parsed.data?.audits ?? []).map((a) => [a.id, a] as const);

/** Whether a sampled item still names a record of its batch's kind in today's data. */
function resolves(batch: AuditBatchName, item: string): boolean {
  const scope = batch.slice(batch.indexOf(':') + 1);
  const market = scope.toUpperCase() as Market;
  if (batch.startsWith('spec:')) {
    return (dataset.specs[scope as SpecCategory] ?? []).some((r) => r.id === item);
  }
  if (batch.startsWith('price-observations:')) {
    return (dataset.prices[market]?.observations ?? []).some((o) => `${o.partId}|${o.retailer}` === item);
  }
  if (batch.startsWith('price-gaps:')) {
    return (dataset.prices[market]?.gaps ?? []).some((g) => g.partId === item);
  }
  if (batch === 'benchmark:game') return (dataset.gameBenchmarks ?? []).some((r) => r.id === item);
  if (batch === 'benchmark:creator') return (dataset.creatorBenchmarks ?? []).some((r) => r.id === item);
  return (dataset.games?.games ?? []).some((g) => g.id === item);
}

describe('audits (data/audits.json)', () => {
  it('matches its schema', () => {
    expect(parsed.error?.issues ?? []).toEqual([]);
  });

  it.each(audits)('%s draws ceil(population / 5) items from each batch, no repeats', (_, audit) => {
    const names = audit.batches.map((b) => b.batch);
    expect(new Set(names).size).toBe(names.length);
    for (const b of audit.batches) {
      expect(b.size, b.batch).toBe(Math.ceil(b.population / 5));
      expect(b.ids.length, b.batch).toBe(b.size);
      expect(new Set(b.ids).size, b.batch).toBe(b.size);
    }
  });

  it.each(audits)('%s: every finding names sampled items', (_, audit) => {
    for (const b of audit.batches) {
      for (const f of b.findings) for (const item of f.items) expect(b.ids, b.batch).toContain(item);
    }
  });

  it.each(audits)('%s: every sampled item is in the data, or a finding covers it', (_, audit) => {
    for (const b of audit.batches) {
      const covered = new Set(b.findings.flatMap((f) => f.items));
      const lost = b.ids.filter((item) => !resolves(b.batch, item) && !covered.has(item));
      expect(lost, b.batch).toEqual([]);
    }
  });
});
