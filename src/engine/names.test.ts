import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../scripts/catalogue/catalogue';
import { utcToday } from '../data/validate';
import { CATALOGUE_CATEGORIES } from './catalogue';
import { displayName, displayNameProblems, displayNames } from './names';

const { catalogue } = buildCatalogue(
  readDataFiles(resolve(import.meta.dirname, '../..')),
  utcToday(),
);

describe('displayName', () => {
  it('adds the brand before a name that lacks it', () => {
    expect(displayName({ brand: 'ASUS', name: 'TUF GAMING Z890-PLUS WIFI' })).toBe(
      'ASUS TUF GAMING Z890-PLUS WIFI',
    );
  });

  it('keeps a name that already starts with the brand, ignoring case', () => {
    expect(displayName({ brand: 'AMD', name: 'AMD Ryzen 7 9800X3D' })).toBe('AMD Ryzen 7 9800X3D');
    expect(displayName({ brand: 'G.Skill', name: 'G.SKILL Flare X5' })).toBe('G.SKILL Flare X5');
    expect(displayName({ brand: 'NZXT', name: 'NZXT' })).toBe('NZXT');
  });

  it('adds the brand when the name only starts with the same letters', () => {
    expect(displayName({ brand: 'AMD', name: 'AMDX Cooler' })).toBe('AMD AMDX Cooler');
  });
});

describe('displayNameProblems: where the brand meets the name', () => {
  it('finds a word the brand ends with that the name starts with again', () => {
    expect(displayNameProblems({ brand: 'Kingston FURY', name: 'FURY Beast RGB' })).toEqual([
      '"Kingston FURY FURY Beast RGB" repeats "FURY" where the brand meets the name.',
    ]);
    expect(displayNameProblems({ brand: 'Fractal Design', name: 'design North' })).toEqual([
      '"Fractal Design design North" repeats "design" where the brand meets the name.',
    ]);
  });

  it('names the longest repeat, ignoring case', () => {
    expect(displayNameProblems({ brand: 'be quiet! Pure', name: 'QUIET! PURE Rock 2' })).toEqual([
      '"be quiet! Pure QUIET! PURE Rock 2" repeats "QUIET! PURE" where the brand meets the name.',
    ]);
  });

  it('finds the brand written again inside the name', () => {
    expect(displayNameProblems({ brand: 'Kingston', name: 'FURY Beast by Kingston' })).toEqual([
      '"Kingston FURY Beast by Kingston" names the brand Kingston 2 times.',
    ]);
    expect(displayNameProblems({ brand: 'AMD', name: 'AMD Ryzen 7 AMD Edition' })).toEqual([
      '"AMD Ryzen 7 AMD Edition" names the brand AMD 2 times.',
    ]);
  });

  it('passes a sound name: the brand once, and no word repeated where it meets the name', () => {
    expect(displayNameProblems({ brand: 'Kingston FURY', name: 'Beast RGB DDR5-6000' })).toEqual(
      [],
    );
    expect(displayNameProblems({ brand: 'Kingston FURY', name: 'Kingston FURY Beast' })).toEqual(
      [],
    );
    expect(displayNameProblems({ brand: 'AMD', name: 'AMD Ryzen 7 9800X3D' })).toEqual([]);
    expect(
      displayNameProblems({ brand: 'SAPPHIRE', name: 'PULSE AMD Radeon RX 9070 XT 16GB' }),
    ).toEqual([]);
    expect(displayNameProblems({ brand: 'NZXT', name: 'NZXT' })).toEqual([]);
  });

  it('finds nothing to compare in a brand without words', () => {
    expect(displayNameProblems({ brand: ' ', name: 'Beast RGB' })).toEqual([]);
  });
});

describe('displayNames, on the real catalogue (copy guide §4)', () => {
  const names = new Map(displayNames(catalogue).map((entry) => [entry.id, entry.displayName]));

  it.each([
    ['amd-ryzen-7-9800x3d', 'AMD Ryzen 7 9800X3D'],
    ['asus-tuf-gaming-z890-plus-wifi', 'ASUS TUF GAMING Z890-PLUS WIFI'],
    ['sapphire-pulse-radeon-rx-9070-xt-16gb', 'SAPPHIRE PULSE AMD Radeon RX 9070 XT 16GB'],
    ['nvidia-geforce-rtx-5090-founders-edition', 'NVIDIA GeForce RTX 5090 Founders Edition'],
    ['fractal-north-charcoal-black-tg-light', 'Fractal Design North Charcoal Black TG Light'],
    ['deepcool-ak620', 'DeepCool AK620'],
  ])('names %s "%s"', (id, expected) => {
    expect(names.get(id)).toBe(expected);
  });

  it('names every catalogue part once, and never repeats its brand at the start', () => {
    const all = displayNames(catalogue);
    const total = Object.values(catalogue.parts).reduce((sum, parts) => sum + parts.length, 0);
    expect(all).toHaveLength(total);
    for (const { id, displayName: name } of all) {
      const words = name.toLowerCase().split(' ');
      expect(words[0], id).not.toBe(words[1]);
    }
  });

  // The structural check of the Director's ruling (2026-10-03, after the Kingston doubled-brand
  // defect). No list of every name is pinned: design-lead reviews the dump's names file instead.
  it('has no doubled brand anywhere a brand meets its name', () => {
    const problems = CATALOGUE_CATEGORIES.flatMap((category) =>
      catalogue.parts[category].flatMap((part) =>
        displayNameProblems(part).map((problem) => `${part.id}: ${problem}`),
      ),
    );
    expect(problems).toEqual([]);
  });
});
