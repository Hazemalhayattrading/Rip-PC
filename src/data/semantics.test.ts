import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SpecCategory, SpecRecordByCategory } from './schema/files';
import { nullIsNone, nullMeansNone } from './semantics';
import { utcToday, validateFiles } from './validate';

const modules = import.meta.glob<unknown>('../../data/**/*.json', { eager: true, import: 'default' });
const files = Object.fromEntries(
  Object.entries(modules).map(([path, json]) => [path.replace(/^(?:\.\.\/)+/, ''), json]),
);
const { dataset } = validateFiles(files, { today: utcToday() });

function part<C extends SpecCategory>(category: C, id: string): SpecRecordByCategory[C] {
  const found = (dataset.specs[category] ?? []).find((r) => r.id === id);
  if (found === undefined) throw new Error(`${id} is not in data/parts/${category}.json`);
  return found;
}

describe('semantics (Zod-free, for the engine)', () => {
  it('imports no Zod: only types from the schemas, and the path helpers', () => {
    for (const file of ['src/data/semantics.ts', 'src/data/validate/paths.ts']) {
      const imports = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line.startsWith('import '));
      for (const line of imports) {
        expect(line.startsWith('import type ') || line.includes("from './validate/paths'"), `${file}: ${line}`).toBe(true);
      }
    }
  });

  it('a CPU without integrated graphics is a real answer, not a missing one', () => {
    expect(nullIsNone(part('cpu', 'amd-ryzen-5-5600'), 'igpu')).toBe(true);
    expect(nullIsNone(part('cpu', 'amd-ryzen-7-9800x3d'), 'power.pptW')).toBe(false);
  });

  it('a BIOS row needs no version unless it is listed "since" one', () => {
    const board = part('motherboard', 'asus-tuf-gaming-b550-plus-wifi-ii');
    const rows = board.biosSupport.cpus;
    const since = rows.findIndex((r) => r.listing === 'since');
    const notListed = rows.findIndex((r) => r.listing === 'not-listed');
    expect(nullIsNone(board, `biosSupport.cpus.${String(since)}.minBiosVersion`)).toBe(false);
    expect(nullIsNone(board, `biosSupport.cpus.${String(notListed)}.minBiosVersion`)).toBe(true);
    expect(nullIsNone(board, 'biosSupport.families.0.minBiosVersion')).toBe(true);
  });

  it('an unpublished RAM clearance is not the same as no single-fan figure', () => {
    const an400 = part('cooler', 'deepcool-an400');
    expect(nullIsNone(an400, 'ramClearanceMm')).toBe(false);
    expect(nullIsNone(an400, 'singleFanRamClearanceMm')).toBe(true);
  });

  it('an ATX unit needs no SFX bracket; an SFX unit that says nothing is unpublished', () => {
    const atx = part('psu', 'deepcool-pn850m');
    expect(nullIsNone(atx, 'atxBracketIncluded')).toBe(true);
    const sfx = { ...part('psu', 'nzxt-c850-sfx-gold'), atxBracketIncluded: null };
    expect(nullIsNone(sfx, 'atxBracketIncluded')).toBe(false);
  });

  it('an unconditional clearance row is the default limit', () => {
    const north = part('case', 'fractal-north-charcoal-black-tg-light');
    expect(nullIsNone(north, 'gpuClearance.0.condition')).toBe(true);
    expect(nullIsNone(north, 'gpuMaxThicknessMm')).toBe(false);
    expect(nullMeansNone(north)).toContain('gpuMaxHeightMm');
  });

  it('a card without a 16-pin plug has no 16-pin adapter; a 16-pin card without one is unpublished', () => {
    expect(nullIsNone(part('gpu-card', 'sapphire-pulse-radeon-rx-9070-xt-16gb'), 'powerAdapter')).toBe(true);
    const fe = { ...part('gpu-card', 'nvidia-geforce-rtx-5080-founders-edition'), powerAdapter: null };
    expect(nullIsNone(fe, 'powerAdapter')).toBe(false);
  });
});
