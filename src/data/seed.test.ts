import { describe, expect, it } from 'vitest';
import { SPEC_CATEGORIES, type SpecCategory, type SpecRecordByCategory } from './schema/files';
import { utcToday, validateFiles } from './validate';

/**
 * WP-D0 seed checks: the catalogue meets its minimum size, and it holds the real parts behind each
 * compatibility case the engine must handle. `dataset.test.ts` checks the rules; this checks coverage.
 */

const modules = import.meta.glob<unknown>('../../data/**/*.json', { eager: true, import: 'default' });
const files = Object.fromEntries(
  Object.entries(modules).map(([path, json]) => [path.replace(/^(?:\.\.\/)+/, ''), json]),
);
const { dataset } = validateFiles(files, { today: utcToday() });

function loaded<T>(value: T | null, what: string): T {
  if (value === null) throw new Error(`${what} did not load; see dataset.test.ts`);
  return value;
}

function items<C extends SpecCategory>(category: C): SpecRecordByCategory[C][] {
  const list: SpecRecordByCategory[C][] | null = dataset.specs[category];
  return loaded(list, `data/parts/${category}.json`);
}

const SEED_MINIMUMS: Record<SpecCategory, number> = {
  cpu: 8,
  motherboard: 6,
  ram: 5,
  'gpu-chip': 8,
  'gpu-card': 8,
  storage: 5,
  psu: 5,
  cooler: 5,
  case: 5,
  'case-fan': 3,
};

describe('seed catalogue size', () => {
  it.each(SPEC_CATEGORIES)('%s meets its seed minimum', (category) => {
    expect(items(category).length).toBeGreaterThanOrEqual(SEED_MINIMUMS[category]);
  });
});

describe('seed compatibility cases', () => {
  it('a B650 board needs a BIOS update for Ryzen 9000', () => {
    const boards = items('motherboard').filter(
      (b) =>
        b.chipset === 'B650' &&
        b.biosSupport.families.some((f) => f.family === 'ryzen-9000' && f.minBiosVersion !== null),
    );
    expect(boards.map((b) => b.id)).not.toEqual([]);
  });

  it('a board disables SATA ports when an M.2 slot is used', () => {
    const boards = items('motherboard').filter((b) => {
      const m2 = new Set(b.m2Slots.map((s) => s.id));
      const sata = new Set(b.sataPorts.map((p) => p.id));
      return b.laneSharing.some(
        (rule) =>
          m2.has(rule.trigger.slot) &&
          rule.effects.some((e) => e.type === 'disables' && e.slots.some((s) => sata.has(s))),
      );
    });
    expect(boards.map((b) => b.id)).not.toEqual([]);
  });

  it('a board drops its main x16 slot to x8 when an M.2 slot is used', () => {
    const boards = items('motherboard').filter((b) => {
      const m2 = new Set(b.m2Slots.map((s) => s.id));
      const x16 = new Set(b.pcieSlots.filter((p) => p.electricalLanes === 16).map((p) => p.id));
      return b.laneSharing.some(
        (rule) =>
          m2.has(rule.trigger.slot) &&
          rule.effects.some((e) => e.type === 'reduces' && x16.has(e.slot) && e.lanes === 8),
      );
    });
    expect(boards.map((b) => b.id)).not.toEqual([]);
  });

  it('a case loses GPU length with a front radiator', () => {
    const cases = items('case').filter((c) => {
      const base = c.gpuClearance.find((g) => g.condition === null);
      return (
        base !== undefined &&
        c.gpuClearance.some(
          (g) => g.condition !== null && /front radiator/i.test(g.condition) && g.maxLengthMm < base.maxLengthMm,
        )
      );
    });
    expect(cases.map((c) => c.id)).not.toEqual([]);
  });

  it('a tall air cooler blocks tall RAM but not low-profile RAM', () => {
    const kits = items('ram').flatMap((r) => (r.heightMm === null ? [] : [{ id: r.id, height: r.heightMm }]));
    const coolers = items('cooler').flatMap((c) =>
      c.type === 'air' && c.ramClearanceMm !== null ? [{ id: c.id, clearance: c.ramClearanceMm }] : [],
    );
    const mixed = coolers.filter(
      (c) => kits.some((k) => k.height > c.clearance) && kits.some((k) => k.height <= c.clearance),
    );
    expect(mixed.map((c) => c.id)).not.toEqual([]);
  });

  it('a Mini-ITX-only case takes SFX power supplies only, and one in the catalogue fits', () => {
    const psus = items('psu');
    const cases = items('case').filter(
      (c) =>
        c.supportedBoards.every((f) => f === 'Mini-ITX') &&
        !c.psu.formFactors.includes('ATX') &&
        psus.some(
          (p) =>
            c.psu.formFactors.includes(p.formFactor) &&
            (c.psu.maxLengthMm === null || p.lengthMm <= c.psu.maxLengthMm),
        ),
    );
    expect(cases.map((c) => c.id)).not.toEqual([]);
  });

  it('a GPU uses the 16-pin plug and a PSU has a native 12V-2x6 cable', () => {
    const cards = items('gpu-card').filter((g) => g.powerConnectors.some((p) => p.type === '16-pin'));
    const psus = items('psu').filter(
      (p) => p.connectors.pcie16pin > 0 && p.connectors.pcie16pinStandard === '12V-2x6',
    );
    expect(cards.map((g) => g.id)).not.toEqual([]);
    expect(psus.map((p) => p.id)).not.toEqual([]);
  });

  it('a GPU card is built on a PCIe x8 chip', () => {
    const x8 = new Set(items('gpu-chip').filter((c) => c.pcie.lanes === 8).map((c) => c.id));
    const cards = items('gpu-card').filter((g) => x8.has(g.chipId));
    expect(cards.map((g) => g.id)).not.toEqual([]);
  });
});

describe('seed benchmark anchors', () => {
  const game = loaded(dataset.gameBenchmarks, 'data/benchmarks/game.json');
  const creator = loaded(dataset.creatorBenchmarks, 'data/benchmarks/creator.json');

  it('has at least 30 game rows from at least 2 publishers', () => {
    expect(game.length).toBeGreaterThanOrEqual(30);
    const publishers = new Set(game.flatMap((r) => r.sources.map((s) => s.publisher)));
    expect(publishers.size).toBeGreaterThanOrEqual(2);
  });

  it('covers GPU-bound 1440p and 4K rows and CPU-bound 1080p rows', () => {
    const has = (limiter: 'gpu' | 'cpu', resolution: string) =>
      game.some((r) => r.limiter === limiter && r.resolution === resolution);
    expect(has('gpu', '2560x1440')).toBe(true);
    expect(has('gpu', '3840x2160')).toBe(true);
    expect(has('cpu', '1920x1080')).toBe(true);
  });

  it('has at least 6 creator rows', () => {
    expect(creator.length).toBeGreaterThanOrEqual(6);
  });
});

describe('seed games list', () => {
  const games = loaded(dataset.games, 'data/games.json');

  it('lists 15 games, with one Call of Duty and one EA SPORTS FC title', () => {
    expect(games.games).toHaveLength(15);
    const slots = games.games.map((g) => g.franchiseSlot);
    expect(slots.filter((s) => s === 'call-of-duty')).toHaveLength(1);
    expect(slots.filter((s) => s === 'ea-sports-fc')).toHaveLength(1);
  });
});
