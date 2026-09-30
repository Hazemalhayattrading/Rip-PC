import * as z from 'zod';
import type { Market } from './common';
import { CaseFan } from './case-fan';
import { Case } from './case';
import { Cooler } from './cooler';
import { Cpu } from './cpu';
import { GpuCard } from './gpu-card';
import { GpuChip } from './gpu-chip';
import { Motherboard } from './motherboard';
import { Psu } from './psu';
import { Ram } from './ram';
import { Storage } from './storage';

/**
 * Spec categories, one JSON file each under `data/parts/` (architecture call 4.1: split by
 * category so each file lazy-loads on its own).
 */
export const SPEC_CATEGORIES = [
  'cpu',
  'motherboard',
  'ram',
  'gpu-chip',
  'gpu-card',
  'storage',
  'psu',
  'cooler',
  'case',
  'case-fan',
] as const;
export type SpecCategory = (typeof SPEC_CATEGORIES)[number];

/** Categories a buyer can purchase, so each needs a price attempt per market. GPU chips are not sold. */
export const PRICED_CATEGORIES = SPEC_CATEGORIES.filter(
  (c): c is Exclude<SpecCategory, 'gpu-chip'> => c !== 'gpu-chip',
);

const specFile = <C extends SpecCategory, T extends z.ZodType>(category: C, item: T) =>
  z.strictObject({
    schemaVersion: z.literal(1),
    category: z.literal(category),
    items: z.array(item),
  });

export const SPEC_FILE_SCHEMAS = {
  cpu: specFile('cpu', Cpu),
  motherboard: specFile('motherboard', Motherboard),
  ram: specFile('ram', Ram),
  'gpu-chip': specFile('gpu-chip', GpuChip),
  'gpu-card': specFile('gpu-card', GpuCard),
  storage: specFile('storage', Storage),
  psu: specFile('psu', Psu),
  cooler: specFile('cooler', Cooler),
  case: specFile('case', Case),
  'case-fan': specFile('case-fan', CaseFan),
} as const;

export interface SpecRecordByCategory {
  cpu: Cpu;
  motherboard: Motherboard;
  ram: Ram;
  'gpu-chip': GpuChip;
  'gpu-card': GpuCard;
  storage: Storage;
  psu: Psu;
  cooler: Cooler;
  case: Case;
  'case-fan': CaseFan;
}
export type SpecRecord = SpecRecordByCategory[SpecCategory];

/** Where every data file lives, relative to the repo root. The single source of truth for layout. */
export const DATA_PATHS = {
  publishers: 'data/publishers.json',
  games: 'data/games.json',
  specs: {
    cpu: 'data/parts/cpu.json',
    motherboard: 'data/parts/motherboard.json',
    ram: 'data/parts/ram.json',
    'gpu-chip': 'data/parts/gpu-chip.json',
    'gpu-card': 'data/parts/gpu-card.json',
    storage: 'data/parts/storage.json',
    psu: 'data/parts/psu.json',
    cooler: 'data/parts/cooler.json',
    case: 'data/parts/case.json',
    'case-fan': 'data/parts/case-fan.json',
  },
  prices: { SA: 'data/prices/sa.json', US: 'data/prices/us.json' },
  benchmarks: { game: 'data/benchmarks/game.json', creator: 'data/benchmarks/creator.json' },
} as const satisfies {
  publishers: string;
  games: string;
  specs: Record<SpecCategory, string>;
  prices: Record<Market, string>;
  benchmarks: { game: string; creator: string };
};
