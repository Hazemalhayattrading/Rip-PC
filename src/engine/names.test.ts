import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, readDataFiles } from '../../scripts/catalogue/catalogue';
import { utcToday } from '../data/validate';
import { displayName, displayNames } from './names';

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
});
