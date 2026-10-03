import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SpecCategory, SpecRecordByCategory } from './schema/files';
import { nullIsNone, nullMeansNone } from './semantics';
import { utcToday, validateFiles } from './validate';

/**
 * `src/data/semantics.ts`, the Zod-free meaning of a null for the engine and the lab. The validator
 * calls the same `nullMeansNone`, so the two can't drift; these tests pin its field list per category,
 * so any change to it is deliberate and shows up here.
 */

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

describe('semantics: Zod-free, for the engine and the lab', () => {
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

  it('is the list the validator uses', () => {
    const validator = readFileSync('src/data/validate/specs.ts', 'utf8');
    expect(validator).toContain("import { nullMeansNone } from '../semantics';");
    expect(validator).not.toMatch(/function nullMeansNone/);
  });
});

describe('nullMeansNone: the field list, pinned per category', () => {
  it('cpu', () => {
    expect(nullMeansNone(part('cpu', 'intel-core-i5-12400f'))).toEqual(['hybrid', 'igpu', 'boxCooler', 'memory.speeds.*.config']);
  });
  it('motherboard: a BIOS version only for "since" rows, and the FlashBack name only without FlashBack', () => {
    const base = ['wifi', 'bluetooth', 'lan', 'biosSupport.families.*.minBiosVersion'];
    expect(nullMeansNone(part('motherboard', 'asus-prime-b760m-a-wifi-d4'))).toEqual([...base, 'biosFlashback.name']);
    const b650 = part('motherboard', 'asus-tuf-gaming-b650-plus-wifi');
    const notSince = b650.biosSupport.cpus.flatMap((row, i) => (row.listing === 'since' ? [] : [`biosSupport.cpus.${String(i)}.minBiosVersion`]));
    expect(notSince.length).toBeGreaterThan(0);
    expect(nullMeansNone(b650)).toEqual([...base, ...notSince]);
  });
  it('ram', () => {
    expect(nullMeansNone(part('ram', 'gskill-flare-x5-ddr5-6000-cl30-2x16gb'))).toEqual(['profiles.xmp']);
  });
  it('gpu-card: the plug standard only on 8-pin and 6-pin plugs, the adapter only without a 16-pin plug, the PSU kind only without a PSU figure', () => {
    expect(nullMeansNone(part('gpu-card', 'sapphire-pulse-radeon-rx-9070-xt-16gb'))).toEqual(['ocModeBoostClockMhz', 'powerConnectors.0.standard', 'powerAdapter']);
    const fe = part('gpu-card', 'nvidia-geforce-rtx-5080-founders-edition');
    expect(nullMeansNone(fe)).toEqual(['ocModeBoostClockMhz']);
    expect(nullMeansNone({ ...fe, recommendedPsuW: null, recommendedPsuKind: null })).toEqual(['ocModeBoostClockMhz', 'recommendedPsuKind']);
  });
  it('psu: the 16-pin standard only without a 16-pin cable, the SFX-to-ATX bracket only on an ATX unit', () => {
    expect(nullMeansNone(part('psu', 'deepcool-pn850m'))).toEqual(['atxBracketIncluded']);
    expect(nullMeansNone(part('psu', 'deepcool-pk650d'))).toEqual(['connectors.pcie16pinStandard', 'atxBracketIncluded']);
    expect(nullMeansNone(part('psu', 'nzxt-c850-sfx-gold'))).toEqual([]);
  });
  it('cooler: NSPR, except on a Noctua cooler; the single-fan RAM clearance only on an air cooler', () => {
    expect(nullMeansNone(part('cooler', 'deepcool-ak620'))).toEqual(['nsprRating', 'singleFanRamClearanceMm']);
    expect(nullMeansNone(part('cooler', 'noctua-nh-l9i-17xx-chromax-black'))).toEqual(['singleFanRamClearanceMm']);
    expect(nullMeansNone(part('cooler', 'arctic-liquid-freezer-iii-pro-360'))).toEqual(['nsprRating']);
  });
  it('case', () => {
    expect(nullMeansNone(part('case', 'fractal-north-charcoal-black-tg-light'))).toEqual([
      'gpuClearance.*.condition',
      'coolerClearance.*.condition',
      'psu.clearance.*.condition',
      'includedFans.*.model',
      'gpuMaxHeightMm',
    ]);
  });
  it('gpu-chip, storage and case-fan: none', () => {
    expect(nullMeansNone(part('gpu-chip', 'intel-arc-b580'))).toEqual([]);
    expect(nullMeansNone(part('storage', 'wd-black-sn8100-2tb'))).toEqual([]);
    expect(nullMeansNone(part('case-fan', 'arctic-p12-pwm-pst-black'))).toEqual([]);
  });
});

describe('nullIsNone: "none" or "not published", on real records', () => {
  it('a CPU without integrated graphics is a real answer, not a missing one', () => {
    expect(nullIsNone(part('cpu', 'intel-core-i5-12400f'), 'igpu')).toBe(true);
    expect(nullIsNone(part('cpu', 'amd-ryzen-7-9800x3d'), 'power.pptW')).toBe(false);
  });
  it('a BIOS row needs no version unless it is listed "since" one', () => {
    const board = part('motherboard', 'asus-tuf-gaming-b650-plus-wifi');
    const since = board.biosSupport.cpus.findIndex((r) => r.listing === 'since');
    const all = board.biosSupport.cpus.findIndex((r) => r.listing === 'all');
    const b550 = part('motherboard', 'asus-tuf-gaming-b550-plus-wifi-ii');
    const notListed = b550.biosSupport.cpus.findIndex((r) => r.listing === 'not-listed');
    expect([since, all, notListed]).not.toContain(-1);
    expect(nullIsNone(board, `biosSupport.cpus.${String(since)}.minBiosVersion`)).toBe(false);
    expect(nullIsNone(board, `biosSupport.cpus.${String(all)}.minBiosVersion`)).toBe(true);
    expect(nullIsNone(b550, `biosSupport.cpus.${String(notListed)}.minBiosVersion`)).toBe(true);
    expect(nullIsNone(board, 'biosSupport.families.0.minBiosVersion')).toBe(true);
  });
  it('an unconditional clearance row is the default limit; an unpublished thickness is not', () => {
    const north = part('case', 'fractal-north-charcoal-black-tg-light');
    expect(nullIsNone(north, 'gpuClearance.0.condition')).toBe(true);
    expect(nullIsNone(north, 'gpuMaxThicknessMm')).toBe(false);
  });
  it('an unpublished RAM clearance is not the same as no single-fan figure', () => {
    const an400 = part('cooler', 'deepcool-an400');
    expect(nullIsNone(an400, 'ramClearanceMm')).toBe(false);
    expect(nullIsNone(an400, 'singleFanRamClearanceMm')).toBe(true);
  });
  it('an ATX unit needs no SFX bracket; an SFX unit that says nothing is unpublished', () => {
    expect(nullIsNone(part('psu', 'deepcool-pn850m'), 'atxBracketIncluded')).toBe(true);
    const sfx = { ...part('psu', 'nzxt-c850-sfx-gold'), atxBracketIncluded: null };
    expect(nullIsNone(sfx, 'atxBracketIncluded')).toBe(false);
  });
  it('a card without a 16-pin plug has no 16-pin adapter; a 16-pin card without one is unpublished', () => {
    expect(nullIsNone(part('gpu-card', 'sapphire-pulse-radeon-rx-9070-xt-16gb'), 'powerAdapter')).toBe(true);
    const fe = { ...part('gpu-card', 'nvidia-geforce-rtx-5080-founders-edition'), powerAdapter: null };
    expect(nullIsNone(fe, 'powerAdapter')).toBe(false);
  });
});
