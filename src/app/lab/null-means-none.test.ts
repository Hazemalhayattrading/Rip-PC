import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../../scripts/catalogue/catalogue';
import { utcToday } from '../../data/validate';
import { specLeaves } from '../../engine/evidence';
import { nullMeansNone } from './null-means-none';

const { catalogue } = buildCatalogue(
  readDataFiles(resolve(import.meta.dirname, '../../..')),
  utcToday(),
);

function leaf(category: 'cpu' | 'cooler', id: string, field: string) {
  const record = catalogue.parts[category].find((part) => part.id === id);
  if (record === undefined) throw new Error(`${id} is not in the catalogue.`);
  const found = specLeaves(category, record, nullMeansNone(record)).find((l) => l.field === field);
  if (found === undefined) throw new Error(`${id} has no spec at ${field}.`);
  return found;
}

describe("the lab's null-means-none paths (data-lead's semantics.ts)", () => {
  it('reads a CPU without integrated graphics as "none", although the field has a note', () => {
    expect(leaf('cpu', 'intel-core-i5-12400f', 'igpu')).toMatchObject({
      value: null,
      availability: 'none',
    });
  });

  it('reads a value the maker does not publish as "not published", with its reason', () => {
    const clearance = leaf('cooler', 'deepcool-an400', 'ramClearanceMm');
    expect(clearance).toMatchObject({ value: null, availability: 'not-published' });
    expect(clearance.note).toMatch(/DeepCool gives no number/);
  });

  it('marks every null of the catalogue as "none" or "not published", never "published"', () => {
    const counts = { none: 0, notPublished: 0 };
    for (const category of Object.keys(catalogue.parts) as (keyof typeof catalogue.parts)[]) {
      for (const record of catalogue.parts[category]) {
        for (const spec of specLeaves(category, record, nullMeansNone(record))) {
          if (spec.value !== null) continue;
          expect(spec.availability, `${record.id} ${spec.field}`).not.toBe('published');
          if (spec.availability === 'none') counts.none += 1;
          else counts.notPublished += 1;
        }
      }
    }
    // data-lead's count on today's data (2026-10-03): 100 nulls mean "none", 72 are not published.
    expect(counts.none).toBeGreaterThan(0);
    expect(counts.notPublished).toBeGreaterThan(0);
  });
});
