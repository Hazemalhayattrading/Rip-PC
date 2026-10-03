import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../../scripts/catalogue/catalogue';
import { SPEC_CATEGORIES, type SpecRecord } from '../../data/schema';
import { nullMeansNone } from '../../data/semantics';
import { utcToday } from '../../data/validate';
import { UNSOURCED_FIELDS, specLeaves } from '../../engine/evidence';
import { createBuildStore } from '../../state/build-store';
import {
  dropUnknownPicks,
  findRecord,
  looseNotes,
  pickedIds,
  priceRows,
  publisherName,
  shownParts,
  specRows,
  unknownPicks,
  unsourcedFields,
} from './parts-model';

const ROOT = resolve(import.meta.dirname, '../../..');
const { catalogue } = buildCatalogue(readDataFiles(ROOT), utcToday());

const CARD = 'sapphire-pulse-radeon-rx-9070-xt-16gb';
const CARD_CHIP = 'amd-radeon-rx-9070-xt';
const NORTH = 'fractal-north-charcoal-black-tg-light';

/** Every catalogue part, GPU chips included, with its category. */
const everyPart = SPEC_CATEGORIES.flatMap((category) =>
  catalogue.parts[category].map((record: SpecRecord) => ({ category, record })),
);

function record<C extends (typeof SPEC_CATEGORIES)[number]>(category: C, id: string) {
  const found = findRecord(catalogue, category, id);
  if (found === null) throw new Error(`The catalogue has no ${category} ${id} any more.`);
  return found;
}

describe('findRecord', () => {
  it('finds a part by category and id, and nothing in another category', () => {
    expect(findRecord(catalogue, 'gpu-card', CARD)?.name).toBe(
      'SAPPHIRE PULSE AMD Radeon RX 9070 XT 16GB',
    );
    expect(findRecord(catalogue, 'cpu', CARD)).toBeNull();
  });
});

describe('pickedIds', () => {
  it('reads one part, each distinct drive in the build’s order, or the fan model', () => {
    const build = {
      cpu: 'cpu-a',
      storage: ['drive-b', 'drive-a', 'drive-b'],
      'case-fan': { partId: 'fan-a', packs: 2 },
    };
    expect(pickedIds(build, 'cpu')).toEqual(['cpu-a']);
    expect(pickedIds(build, 'storage')).toEqual(['drive-b', 'drive-a']);
    expect(pickedIds(build, 'case-fan')).toEqual(['fan-a']);
    expect(pickedIds(build, 'case')).toEqual([]);
  });
});

describe('shownParts', () => {
  it('shows the picked part of the shown category', () => {
    expect(
      shownParts(catalogue, { 'gpu-card': CARD, cpu: 'amd-ryzen-7-9800x3d' }, 'gpu-card', null),
    ).toEqual([{ category: 'gpu-card', record: record('gpu-card', CARD) }]);
  });

  it('shows every distinct drive, in the build’s order', () => {
    const drives = ['wd-black-sn8100-2tb', 'samsung-990-pro-2tb', 'wd-black-sn8100-2tb'];
    expect(
      shownParts(catalogue, { storage: drives }, 'storage', null).map((part) => part.record.id),
    ).toEqual(['wd-black-sn8100-2tb', 'samsung-990-pro-2tb']);
  });

  it('shows the chip the link names, and nothing for a category without a pick', () => {
    expect(shownParts(catalogue, {}, 'gpu-chip', CARD_CHIP)).toEqual([
      { category: 'gpu-chip', record: record('gpu-chip', CARD_CHIP) },
    ]);
    expect(shownParts(catalogue, {}, 'case', null)).toEqual([]);
    expect(shownParts(catalogue, { case: 'no-such-case' }, 'case', null)).toEqual([]);
  });
});

describe('unknownPicks', () => {
  it('finds every pick, drive and chip the catalogue doesn’t have', () => {
    expect(
      unknownPicks(
        catalogue,
        {
          cpu: 'no-such-cpu',
          case: NORTH,
          storage: ['wd-black-sn8100-2tb', 'no-such-drive'],
          'case-fan': { partId: 'no-such-fan', packs: 2 },
        },
        'no-such-chip',
      ),
    ).toEqual([
      { category: 'cpu', id: 'no-such-cpu' },
      { category: 'storage', id: 'no-such-drive' },
      { category: 'case-fan', id: 'no-such-fan' },
      { category: 'gpu-chip', id: 'no-such-chip' },
    ]);
  });

  it('finds nothing in a link the catalogue covers', () => {
    expect(unknownPicks(catalogue, { 'gpu-card': CARD, case: NORTH }, CARD_CHIP)).toEqual([]);
  });
});

describe('dropUnknownPicks', () => {
  it('leaves out of the build every part the catalogue doesn’t have, and keeps the rest', () => {
    const store = createBuildStore();
    store
      .getState()
      .loadEncoded(
        'v1.c_no-such-cpu.s_wd-black-sn8100-2tb.s_no-such-drive.s_samsung-990-pro-2tb.x_' +
          NORTH +
          '.f_no-such-fan.f_no-such-fan',
      );
    dropUnknownPicks(store, catalogue);
    expect(store.getState().selections).toEqual({
      storage: ['wd-black-sn8100-2tb', 'samsung-990-pro-2tb'],
      case: NORTH,
    });
  });

  it('leaves a build the catalogue covers as it is, without a change to listen to', () => {
    const store = createBuildStore();
    store.getState().loadEncoded('v1.g_' + CARD);
    const before = store.getState().selections;
    dropUnknownPicks(store, catalogue);
    expect(store.getState().selections).toBe(before);
  });
});

describe('specRows', () => {
  it('indents nested specs under their parent, in record order', () => {
    const rows = specRows('cpu', record('cpu', 'amd-ryzen-7-9800x3d'));
    const memory = rows.findIndex((row) => row.path === 'memory');
    expect(rows[memory]).toMatchObject({ kind: 'group', depth: 0, label: 'Memory' });
    expect(rows[memory + 1]).toMatchObject({
      kind: 'spec',
      path: 'memory.types',
      depth: 1,
      label: 'Types',
    });
    const speeds = rows.findIndex((row) => row.path === 'memory.speeds.0');
    expect(rows[speeds]).toMatchObject({ kind: 'group', depth: 2, label: '1' });
    expect(rows[speeds + 1]).toMatchObject({
      kind: 'spec',
      depth: 3,
      path: 'memory.speeds.0.type',
    });
  });

  it('carries a conditional limit’s condition and the maker’s own words where the data has them', () => {
    const rows = specRows('case', record('case', NORTH));
    const limit = rows.find((row) => row.path === 'gpuClearance.1.maxLengthMm');
    expect(limit?.kind === 'spec' && limit.evidence.condition).toBe('with a 360 mm front radiator');
    expect(limit?.kind === 'spec' && limit.evidence.value).toBe(300);
  });

  it('shows each note once: on its own field’s row, and as the reason of a withheld value', () => {
    const kit = catalogue.parts.ram.find((part) =>
      (part.notes ?? []).some((note) => note.field === 'timings'),
    );
    if (kit !== undefined) {
      const rows = specRows('ram', kit);
      const timings = rows.find((row) => row.path === 'timings');
      expect(timings?.note).not.toBeNull();
      const cl = rows.find((row) => row.path === 'timings.cl');
      expect(cl?.note).toBeNull();
    }
    const an400 = specRows('cooler', record('cooler', 'deepcool-an400'));
    const clearance = an400.find((row) => row.path === 'ramClearanceMm');
    expect(clearance?.kind === 'spec' && clearance.evidence.availability).toBe('not-published');
    expect(clearance?.note).toMatch(/\S/);
  });
});

describe('every catalogue field is reachable on the parts page (plan WP-E0)', () => {
  it.each(
    everyPart.map(
      ({ category, record: part }) => [`${category} ${part.id}`, category, part] as const,
    ),
  )(
    '%s: a row for every spec, a source for every published value, a reason for every withheld one',
    (_, category, part) => {
      const rows = specRows(category, part);
      const specs = rows.filter((row) => row.kind === 'spec');
      // Every spec leaf, in the engine's own order, none dropped and none made up.
      expect(specs.map((row) => row.path)).toEqual(
        specLeaves(category, part, nullMeansNone(part)).map((leaf) => leaf.field),
      );
      for (const row of specs) {
        if (row.evidence.availability === 'published') {
          expect(row.evidence.sources.length, `${row.path} has a source`).toBeGreaterThan(0);
        }
        if (row.evidence.availability === 'not-published') {
          expect(row.note ?? '', `${row.path} says why it is not published`).toMatch(/\S/);
        }
      }
      // The fields with no source of their own are shown apart.
      expect(unsourcedFields(category, part).map((field) => field.path)).toEqual(
        (UNSOURCED_FIELDS[category] ?? []).filter((path) => path in part),
      );
      // Every note is shown: on a row, or in the list after the table.
      const shown = new Set([
        ...rows.flatMap((row) => (row.note === null ? [] : [row.note])),
        ...looseNotes(category, part).map((note) => note.text),
      ]);
      for (const note of part.notes ?? []) {
        expect(
          [...shown].some((text) => text.includes(note.text)),
          note.text,
        ).toBe(true);
      }
    },
  );
});

describe('priceRows', () => {
  const raw = (market: string) =>
    JSON.parse(readFileSync(resolve(ROOT, `data/prices/${market}.json`), 'utf8')) as {
      observations: { partId: string; amount: number }[];
      gaps: { partId: string; reason: string }[];
    };
  const sa = raw('sa');
  const us = raw('us');

  it('gives every observation and every gap of a part, Saudi Arabia first, never converted', () => {
    for (const { category, record: part } of everyPart) {
      if (category === 'gpu-chip') continue;
      const rows = priceRows(catalogue, part.id);
      const expected = (['SA', 'US'] as const).flatMap((market) => {
        const file = market === 'SA' ? sa : us;
        const lines = [
          ...file.observations
            .filter((o) => o.partId === part.id)
            .map((o) => `${market} price ${String(o.amount)}`),
          ...file.gaps.filter((g) => g.partId === part.id).map((g) => `${market} gap ${g.reason}`),
        ];
        return lines.length > 0 ? lines : [`${market} none`];
      });
      const actual = rows.map((row) =>
        row.kind === 'price'
          ? `${row.market} price ${String(row.observation.amount)}`
          : row.kind === 'gap'
            ? `${row.market} gap ${row.gap.reason}`
            : `${row.market} none`,
      );
      expect(actual, part.id).toEqual(expected);
    }
  });

  it('says a market has no record at all, rather than leaving it out', () => {
    expect(priceRows(catalogue, 'no-such-part')).toEqual([
      { kind: 'none', market: 'SA' },
      { kind: 'none', market: 'US' },
    ]);
  });
});

describe('publisherName', () => {
  it('looks a publisher up by id, and falls back to the id itself', () => {
    expect(publisherName(catalogue, 'amazon-sa')).toBe('Amazon.sa');
    expect(publisherName(catalogue, 'no-such-publisher')).toBe('no-such-publisher');
  });
});
